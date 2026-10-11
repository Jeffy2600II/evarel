/* โควตา AI รายผู้ใช้ (ADR 0002): จองแบบ atomic ที่ Supabase ก่อนเรียก LLM, คืนเมื่อระบบล่ม, ตัดโทเคนจริงเมื่อสำเร็จ
   fail-open: ตัวนับล่ม/ตารางยังไม่มี = ปล่อยผ่านและ log (AI พังทั้งระบบแย่กว่าโควตาหลวมชั่วคราว) */

export const DEFAULTS = { calls: 40, tokens: 60000, global: 800 };

export type QuotaCfg = { calls: number; tokens: number; global: number };
export type Reserve =
  | { allowed: true; day: string; metered: boolean; calls: number; tokens: number; limits: QuotaCfg }
  | { allowed: false; reason: 'calls' | 'tokens' | 'global'; day: string; resetAt: string; calls: number; tokens: number; limits: QuotaCfg };

/* ค่าตั้งผิดรูป (ติดลบ ไม่ใช่ตัวเลข ศูนย์ ทศนิยม) -> ใช้ค่าเริ่มต้น ไม่ปล่อยให้ค่าเพี้ยนปิดโควตาเงียบๆ */
export function readCfg(env: any): QuotaCfg {
  const n = (v: any, d: number, allowZero = false) => {
    if (v === undefined || v === null || String(v).trim() === '') return d;
    const x = Number(v);
    return Number.isInteger(x) && (allowZero ? x >= 0 : x >= 1) && x <= 10_000_000 ? x : d;
  };
  return { calls: n(env.AI_DAILY_CALLS, DEFAULTS.calls), tokens: n(env.AI_DAILY_TOKENS, DEFAULTS.tokens), global: n(env.AI_GLOBAL_CALLS, DEFAULTS.global, true) };
}

/* วันที่ตาม Asia/Bangkok (UTC+7 ไม่มี DST) และเวลารีเซ็ต = เที่ยงคืน Bangkok ถัดไป เป็น ISO UTC */
export function bangkokDay(now = new Date()): { day: string; resetAt: string } {
  const b = new Date(+now + 7 * 3600000);
  const day = b.toISOString().slice(0, 10);
  const next = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() + 1) - 7 * 3600000;
  return { day, resetAt: new Date(next).toISOString() };
}

async function rpc(env: any, name: string, args: Record<string, any>): Promise<any> {
  const f: typeof fetch = env.CUSTOM_FETCH || globalThis.fetch;
  const base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500); // ตัวนับช้า = ไม่ขวางแชท
  try {
    const r = await f(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`rpc_${name}_${r.status}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  } finally { clearTimeout(timer); }
}

/* userId ต้องมาจาก JWT ที่ตรวจแล้วเท่านั้น (R3) ฟังก์ชันนี้ไม่รับค่าจาก body */
export async function reserve(env: any, userId: string, now = new Date()): Promise<Reserve> {
  const cfg = readCfg(env);
  const { day, resetAt } = bangkokDay(now);
  try {
    const rows = await rpc(env, 'ai_usage_take', { p_user: userId, p_day: day, p_calls_limit: cfg.calls, p_tokens_limit: cfg.tokens, p_global_calls: cfg.global });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row || typeof row.ok !== 'boolean') throw new Error('bad_rpc_shape');
    if (row.ok) return { allowed: true, day, metered: true, calls: row.calls, tokens: row.tokens, limits: cfg };
    const reason = row.reason === 'tokens' || row.reason === 'global' ? row.reason : 'calls';
    return { allowed: false, reason, day, resetAt, calls: row.calls, tokens: row.tokens, limits: cfg };
  } catch (e: any) {
    console.warn('quota_fail_open', String(e?.message || e)); // R2: ปล่อยผ่าน ไม่นับ
    return { allowed: true, day, metered: false, calls: 0, tokens: 0, limits: cfg };
  }
}

/* หลังเรียกเสร็จ: refund=true คืน 1 ครั้ง (LLM ล่ม) | ไม่งั้นตัดโทเคนจริง ล้มเงียบ ไม่กระทบคำตอบผู้ใช้ */
export async function settle(env: any, userId: string, day: string, tokens: number, refund: boolean): Promise<void> {
  try { await rpc(env, 'ai_usage_settle', { p_user: userId, p_day: day, p_add_tokens: Math.max(0, Math.floor(tokens || 0)), p_refund: refund }); }
  catch (e: any) { console.warn('quota_settle_failed', String(e?.message || e)); }
}

export function limitMessage(r: Extract<Reserve, { allowed: false }>): string {
  const hhmm = new Date(+new Date(r.resetAt) + 7 * 3600000).toISOString().slice(11, 16);
  if (r.reason === 'global') return `วันนี้ผู้ใช้ AI เยอะมากจนระบบเต็มชั่วคราว ลองใหม่หลังเที่ยงคืน (${hhmm} น.) หรือพรุ่งนี้นะ`;
  if (r.reason === 'tokens') return `วันนี้คุณคุยกับ AI ยาวจนใช้โควตาข้อความครบแล้ว โควตาจะรีเซ็ตตอนเที่ยงคืน (${hhmm} น.)`;
  return `วันนี้คุณใช้ AI ครบ ${r.limits.calls} ครั้งแล้ว โควตาจะรีเซ็ตตอนเที่ยงคืน (${hhmm} น.)`;
}

/* ===== อ่านโควตาของตัวเอง (evarel-quota-ui): อ่านอย่างเดียว ไม่หัก ไม่เรียก LLM =====
   อ่านตาราง ai_usage ด้วย JWT ของผู้ใช้ -> RLS ("own ai_usage read") กันข้ามผู้ใช้ให้
   หมายเหตุ: header apikey ยังเป็น SUPABASE_SERVICE_KEY (Worker ไม่มี anon key) แต่ PostgREST ตัดสินสิทธิ์จาก Authorization (JWT ผู้ใช้) ไม่ใช่ apikey
   พิสูจน์บนระบบจริงแล้ว 11 ต.ค. 2026: JWT ของ A อ่านแถวของ B ไม่ได้ (A เห็น 0, B เห็น 33) ถ้าเพิ่ม anon key ภายหลังให้เปลี่ยน apikey เป็นตัวนั้น
   ไม่รวมโควตาส่วนกลาง: RLS มองไม่เห็นแถวของคนอื่น และผู้ใช้ไม่ควรเห็นตัวเลขของระบบ
   fail-open: อ่านไม่ได้ = { unknown: true, blocked: false } ห้ามล็อกผู้ใช้เพราะเราเองอ่านพลาด */
export type QuotaView =
  | { unknown: true; blocked: false }
  | { unknown?: false; day: string; resetAt: string; blocked: boolean; reason?: 'calls' | 'tokens';
      calls: { used: number; limit: number; remaining: number }; tokens: { used: number; limit: number; remaining: number } };

export async function readOwn(env: any, userJwt: string, now = new Date()): Promise<QuotaView> {
  const cfg = readCfg(env);
  const { day, resetAt } = bangkokDay(now);
  const f: typeof fetch = env.CUSTOM_FETCH || globalThis.fetch;
  const base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await f(`${base}/rest/v1/ai_usage?select=calls,tokens&day=eq.${day}&limit=1`, {
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${userJwt}`, Accept: 'application/json' }, signal: ctl.signal,
    });
    if (!r.ok) { console.warn('quota_read_failed', r.status); return { unknown: true, blocked: false }; }
    const rows: any = await r.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const uc = Math.max(0, Number(row?.calls) || 0), ut = Math.max(0, Number(row?.tokens) || 0);
    const calls = { used: uc, limit: cfg.calls, remaining: Math.max(0, cfg.calls - uc) };
    const tokens = { used: ut, limit: cfg.tokens, remaining: Math.max(0, cfg.tokens - ut) };
    /* ลำดับเดียวกับ ai_usage_take: calls ก่อน tokens */
    const reason = uc >= cfg.calls ? 'calls' : ut >= cfg.tokens ? 'tokens' : undefined;
    return { day, resetAt, blocked: !!reason, ...(reason ? { reason } : {}), calls, tokens };
  } catch (e: any) {
    console.warn('quota_read_failed', String(e?.message || e));
    return { unknown: true, blocked: false };
  } finally { clearTimeout(timer); }
}

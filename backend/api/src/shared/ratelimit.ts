/* Path: src/shared/ratelimit.ts | Purpose: ด่าน rate limit ที่แม่น (Postgres atomic rl_hit) กันคนหัวหมอ (ADR 0003)
   หลักการออกแบบ:
   1) ไอพีมาจาก cf-connecting-ip เท่านั้น (Cloudflare ตั้งเองและลบสำเนาที่ client ส่ง) ห้ามเชื่อ X-Forwarded-For
   2) ไม่มีไอพี -> ใช้คีย์สำรองคงที่ 'noip' (ไม่ปล่อยผ่าน) 
   3) fail-open: นับไม่ได้/timeout 2.5 วินาที -> ปล่อยผ่าน (ไม่ให้ระบบนับพังแล้วคนจริงใช้ไม่ได้)
   4) คีย์ล็อกอิน = ไอพี+อีเมล (ไม่ใช่อีเมลล้วน) -> คนหัวหมอล็อกบัญชีเหยื่อไม่ได้ */
export type Rule = { bucket: string; limit: number; windowSec: number };
export const RULES = {
  loginIpEmail: { bucket: 'login_ip_email', limit: 8,  windowSec: 300 },   // เดารหัสบัญชีเดียวจากไอพีเดียว
  loginIp:      { bucket: 'login_ip',       limit: 60, windowSec: 300 },   // ไอพีเดียว (หลวม: เน็ตโรงเรียน/CGNAT)
  signupIp:     { bucket: 'signup_ip',      limit: 20, windowSec: 3600 },  // ห้องเรียนทั้งห้องสมัครได้
  checkEmailIp: { bucket: 'check_email_ip', limit: 600, windowSec: 3600 }, // ตรวจอีเมลระหว่างพิมพ์ (เรียกบ่อยแต่ค้นแถวเดียว)
  mailIp:       { bucket: 'mail_ip',        limit: 10, windowSec: 3600 },  // forgot/resend ต่อไอพี
  mailEmail:    { bucket: 'mail_email',     limit: 3,  windowSec: 3600 },  // ส่งเมลถึงอีเมลเดียว (กันถล่มกล่องเหยื่อ/กินโควตา SMTP)
  refreshIp:    { bucket: 'refresh_ip',     limit: 120, windowSec: 300 },
  quotaUser:    { bucket: 'ai_quota_user',  limit: 30,  windowSec: 60 },     // อ่านโควตา AI ต่อผู้ใช้ (UI ถามไม่เกิน ~3 ครั้ง/นาที เผื่อ 10 เท่า)
  /* ระยะ 0.2 (PLATFORM-UPGRADE-PLAN): ครอบเส้นทางที่แพง (DB subrequest / บริการภายนอก) ที่เดิมไม่มีด่านเลย
     คีย์ = user id จาก JWT ที่ตรวจแล้ว (ไม่ใช่ไอพี) เพราะผู้ใช้คนเดียวยิงถี่ได้แม้ไอพีเดียวกับคนอื่น (CGNAT) */
  itemsReadUser:  { bucket: 'items_read_user',  limit: 240, windowSec: 60 }, // GET items/logs (UI ดึงตอนบูต+live sync ~ไม่กี่ครั้ง/นาที)
  itemsWriteUser: { bucket: 'items_write_user', limit: 120, windowSec: 60 }, // PUT/DELETE item + POST log (ทุกการติ๊ก/บันทึก)
  aiChatUser:     { bucket: 'ai_chat_user',     limit: 30,  windowSec: 60 }, // ต่อเนื่องกับโควตาประจำวัน (AI_DAILY_CALLS) กันถี่ผิดปกติ
  aiMemoryUser:   { bucket: 'ai_memory_user',   limit: 20,  windowSec: 60 }, // เขียนไปบริการภายนอก (MemoryLake) ทุกครั้ง
  pushWriteUser:  { bucket: 'push_write_user',  limit: 20,  windowSec: 60 }, // subscribe/unsubscribe อุปกรณ์
} as const satisfies Record<string, Rule>;

export function clientIp(request: Request): string {
  const ip = (request.headers.get('cf-connecting-ip') || '').trim();
  return ip && ip.length <= 64 ? ip : 'noip';
}
const enc = async (s: string) => { // แฮชอีเมลก่อนเก็บ (ไม่เก็บอีเมลดิบในตารางนับ)
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim().toLowerCase()));
  return Array.from(new Uint8Array(d)).slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
};
export const emailKey = enc;

export type Verdict = { ok: true } | { ok: false; retryAfter: number };

export async function hit(env: any, rule: Rule, key: string): Promise<Verdict> {
  try {
    const f: typeof fetch = env.CUSTOM_FETCH || fetch;
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 2500);
    const res = await f(`${String(env.SUPABASE_URL).replace(/\/+$/, '')}/rest/v1/rpc/rl_hit`, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_bucket: rule.bucket, p_key: key, p_limit: rule.limit, p_window_sec: rule.windowSec }),
    });
    clearTimeout(tm);
    if (!res.ok) return { ok: true };                       // fail-open
    const rows: any = await res.json();
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (r && r.ok === false) return { ok: false, retryAfter: Math.max(1, Number(r.retry_after) || rule.windowSec) };
    return { ok: true };
  } catch { return { ok: true }; }                          // fail-open
}

/* ตรวจหลายกฎพร้อมกัน: ถ้ามีข้อใดเกิน -> ปฏิเสธ (คืน retryAfter มากสุด) */
export async function check(env: any, checks: [Rule, string][]): Promise<Verdict> {
  const vs = await Promise.all(checks.map(([r, k]) => hit(env, r, k)));
  const bad = vs.filter((v): v is { ok: false; retryAfter: number } => !v.ok);
  return bad.length ? { ok: false, retryAfter: Math.max(...bad.map(b => b.retryAfter)) } : { ok: true };
}

export function tooMany(retryAfter: number, env: any, jsonResponse: (d: any, s?: number, e?: any) => Response): Response {
  const r = jsonResponse({ code: 'too_many_requests', retry_after: retryAfter }, 429, env);
  r.headers.set('Retry-After', String(retryAfter));
  return r;
}

/* สถานะด่าน (ข้อ1 Pre-Mortem): ไม่ให้ fail-open ล้มเงียบ -- Master ดูได้ที่ GET /api/health
   active = rl_hit ใช้ได้ | inactive = ยังไม่รัน migration 003 (ไม่มีฟังก์ชัน) | unknown = ติดต่อฐานข้อมูลไม่ได้
   ระยะ 0.5: ตรวจจริงสูงสุด 1 ครั้ง/นาที/isolate (เดิมยิง rl_hit = INSERT+UPDATE ทุกคำขอ ทำให้ health เองเป็นช่อง write amplification โดยไม่มีขอบเขต) */
let healthProbe: { at: number; status: 'active' | 'inactive' | 'unknown' } = { at: 0, status: 'unknown' };
export function _resetHealthProbe() { healthProbe = { at: 0, status: 'unknown' }; }
export async function status(env: any): Promise<'active' | 'inactive' | 'unknown'> {
  if (Date.now() - healthProbe.at < 60_000) return healthProbe.status;
  const s = await probeOnce(env);
  healthProbe = { at: Date.now(), status: s };
  return s;
}
async function probeOnce(env: any): Promise<'active' | 'inactive' | 'unknown'> {
  try {
    const f: typeof fetch = env.CUSTOM_FETCH || fetch;
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 2500);
    const res = await f(`${String(env.SUPABASE_URL).replace(/\/+$/, '')}/rest/v1/rpc/rl_hit`, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_bucket: 'health', p_key: 'probe', p_limit: 1000000, p_window_sec: 60 }),
    });
    clearTimeout(tm);
    if (res.ok) return 'active';
    const j: any = await res.json().catch(() => ({}));
    return res.status === 404 || j?.code === 'PGRST202' ? 'inactive' : 'unknown';
  } catch { return 'unknown'; }
}

/* เก็บกวาดแถวเก่าแบบสุ่ม ~1/200 คำขอ (ไม่ต้องมี cron: ฟรีเทียร์มีแค่ 5 ตัว) -- ไม่รอผล ไม่ล้มคำขอจริง */
export function maybeCleanup(env: any, ctx?: any): void {
  const rnd = typeof env.__rand === 'function' ? env.__rand() : Math.random();
  if (rnd >= 1 / 200) return;   // rnd อยู่ในช่วง [0,1): ตกช่วงแรก 0.5% = เรียก cleanup
  try {
    const f: typeof fetch = env.CUSTOM_FETCH || fetch;
    const p = f(`${String(env.SUPABASE_URL).replace(/\/+$/, '')}/rest/v1/rpc/rl_cleanup`, {
      method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: '{}',
    }).catch(() => {});
    ctx?.waitUntil?.(p);
  } catch { /* ไม่กระทบคำขอ */ }
}

/* ส่งไอพีผู้ใช้จริงต่อให้ Supabase Auth (Sb-Forwarded-For) เพื่อให้ rate limit ของ Supabase นับต่อผู้ใช้ ไม่ใช่รวมเป็นไอพีของ Worker
   (เอกสาร Supabase: ต้องใช้ secret key + เปิดสวิตช์ IP Address Forwarding ที่แดชบอร์ด; ถ้าสวิตช์ปิด header จะถูกเพิกเฉย ไม่พัง)
   - ใส่เฉพาะคำขอไป /auth/v1/ และเฉพาะเมื่อมีไอพีจริง (ไม่ส่งค่า 'noip' ปลอม)
   - ใช้ค่าจาก cf-connecting-ip เท่านั้น: ค่าที่ client ส่ง Sb-Forwarded-For มาเองถูกทิ้งเสมอ */
export function withForwardedIp(env: any, ip: string): any {
  const base: typeof fetch = env.CUSTOM_FETCH || fetch;
  const wrapped: typeof fetch = (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    if (!url.includes('/auth/v1/')) return base(input, init);
    const h = new Headers(init?.headers || {});
    h.delete('sb-forwarded-for');
    if (ip && ip !== 'noip') h.set('Sb-Forwarded-For', ip);
    return base(input, { ...(init || {}), headers: h });
  };
  return { ...env, CUSTOM_FETCH: wrapped };
}

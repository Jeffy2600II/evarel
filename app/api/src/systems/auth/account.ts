/* Path: src/systems/auth/account.ts | Purpose: สมัคร / ลืมรหัส / ยืนยันรหัส 6 หลัก / ส่งรหัสใหม่ / ลบบัญชี (เฟส B)
   กฎจากแผน 07-auth-plan.md:
   - ห้ามลบบัญชี ห้ามผูกอัตโนมัติเพียงเพราะอีเมลตรง (ข้อ 3)
   - ตอบแบบไม่เปิดเผยว่าอีเมลมีอยู่ ที่ signup/forgot (กันเดาอีเมล)
   - REQUIRE_EMAIL_VERIFICATION=false (ค่าเริ่มต้น): สมัครแล้วเข้าได้ทันที | true: ต้องกรอกรหัส 6 หลักก่อนได้ session
   error code ที่คืน ตรงสัญญา Auth ของเดโม: invalid_credentials | email_taken | network | unknown + code_invalid | code_expired | too_many_requests | needs_link | unverified */
import { Env, jsonResponse } from '../items/routes';
import { verifyJWT, extractBearer } from '../../shared/auth';
import { issueCode, verifyCode, composeMail, type Purpose } from './codes';
import { sendMail as smtpSend } from '../../shared/smtp-mail.js';


const MAX_BODY = 2048;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const fail = (code: string, status: number, env: Env) => jsonResponse({ code }, status, env);
const f = (env: Env): typeof fetch => (env as any).CUSTOM_FETCH || fetch;
const base = (env: Env) => env.SUPABASE_URL.replace(/\/+$/, '');
const needVerify = (env: Env) => String((env as any).REQUIRE_EMAIL_VERIFICATION || 'false') === 'true';

async function body(request: Request): Promise<any | null> {
  const t = await request.text();
  if (t.length > MAX_BODY) return null;
  try { return JSON.parse(t); } catch { return null; }
}
const admin = (env: Env, extra: Record<string, string> = {}) =>
  ({ apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', ...extra });

/* แปลงผล token ของ Supabase -> รูปแบบเดียวกับ login เดิม */
const sessionOf = (t: any) => ({
  access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at,
  user: { id: t.user?.id, email: t.user?.email, name: t.user?.user_metadata?.name || '', provider: t.user?.app_metadata?.provider || 'email' },
});
const mapSupabaseError = (status: number, j: any): string => {
  const c = String(j?.error_code || j?.code || '');
  if (c === 'otp_expired') return 'code_expired';
  if (c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit' || status === 429) return 'too_many_requests';
  if (status === 400 || status === 401 || status === 403) return 'code_invalid';
  return 'unknown';
};

/* หาผู้ใช้จากอีเมลด้วย admin API (ไม่เปิดเผยให้ client) */
async function findUserByEmail(env: Env, email: string): Promise<any | null> {
  const r = await f(env)(`${base(env)}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=5`, { headers: admin(env) });
  if (!r.ok) return null;
  const j: any = await r.json();
  const list: any[] = Array.isArray(j) ? j : j.users || [];
  return list.find(u => (u.email || '').toLowerCase() === email) || null;
}

/* เพดานส่งอีเมลรวมต่อ 24 ชั่วโมง (ปกป้องบัญชีส่งเมลไม่ให้ถูกใช้จนเต็มหรือถูกระงับ) | ล้มแบบปิด: นับไม่ได้ = ไม่ส่ง
   ต่างจากตัวจำกัดคำขอทั่วไปที่ล้มแบบเปิด เพราะส่งเกินเพดานแล้วเสียหายกว่าส่งช้า ผู้ใช้ขอใหม่ได้ ค่าตั้งด้วย MAIL_DAILY_CAP */
const MAIL_CAP_DEFAULT = 400;
function mailCap(env: Env): number {
  const v = String((env as any).MAIL_DAILY_CAP ?? '').trim();
  if (!/^\d{1,6}$/.test(v)) return MAIL_CAP_DEFAULT;
  const n = Number(v);
  return n >= 1 && n <= 100000 ? n : MAIL_CAP_DEFAULT;
}
async function underMailCap(env: Env): Promise<boolean> {
  try {
    const key = env.SUPABASE_SERVICE_KEY;
    const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
    if (!key.startsWith('sb_')) headers.Authorization = 'Bearer ' + key;
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 2500);
    try {
      const r = await f(env)(`${base(env)}/rest/v1/rpc/rl_hit`, { method: 'POST', headers, signal: ctl.signal,
        body: JSON.stringify({ p_bucket: 'mail_daily', p_key: 'global', p_limit: mailCap(env), p_window_sec: 86400 }) });
      if (!r.ok) return false;
      const j: any = await r.json().catch(() => null);
      const row = Array.isArray(j) ? j[0] : j;
      return !!row && row.ok === true;
    } finally { clearTimeout(timer); }
  } catch { return false; }
}
/* ส่งรหัสของเราเอง: ออกรหัส -> เก็บแฮช -> ส่ง SMTP | ไม่ throw เด็ดขาด (ผลลัพธ์ต้องไม่ต่างกันตามว่าอีเมลมีบัญชีหรือไม่)
   ถ้า SMTP_* ไม่ครบหรือส่งไม่สำเร็จ แค่ไม่ส่ง (ผู้ใช้ขอใหม่ได้) ไม่เปิดเผยสาเหตุให้ client */
const hasSmtp = (env: Env) => !!((env as any).SMTP_USER && (env as any).SMTP_PASS);
async function sendOwnCode(env: Env, email: string, purpose: Purpose): Promise<void> {
  try {
    if (!hasSmtp(env)) return;
    if (!(await underMailCap(env))) return;
    const { code } = await issueCode(env, email, purpose);
    const m = composeMail(purpose, code);
    const send = (env as any).CUSTOM_SEND_MAIL
      ? (env as any).CUSTOM_SEND_MAIL
      : async (cfg: any, mail: any) => {
          /* โหลดโมดูลซ็อกเก็ตของ Cloudflare เมื่อส่งเมลจริงเท่านั้น (ไม่ผูกตอนคอมไพล์ จึง bundle/ทดสอบนอก Cloudflare ได้) */
          const spec = 'cloudflare:' + 'sockets';
          const { connect } = await import(/* @vite-ignore */ spec);
          return smtpSend(cfg, mail, { connect });
        };
    const from = String((env as any).SMTP_FROM || '').trim();
    await send({ user: (env as any).SMTP_USER, pass: String((env as any).SMTP_PASS).replace(/\s+/g, ''), from }, { to: email, ...m });
  } catch { /* กลืนเงียบ: ห้ามต่างกันตามผล เพื่อกันเดาอีเมล */ }
}
/* รันหลังตอบ (ctx.waitUntil) เพื่อให้เวลาตอบเท่ากันทุกกรณี ถ้าไม่มี ctx (เช่นเทสต์เดิม) รอให้เสร็จ */
function later(ctx: any, p: Promise<unknown>): Promise<unknown> | void {
  if (ctx && typeof ctx.waitUntil === 'function') { ctx.waitUntil(p); return; }
  return p;
}
/* แปลงผลตรวจรหัส -> error code เดิมของสัญญากับแอป */
function codeFail(r: string, env: Env): Response {
  if (r === 'expired') return fail('code_expired', 400, env);
  if (r === 'locked') return fail('too_many_requests', 429, env);
  if (r === 'unavailable') return fail('unknown', 502, env);
  return fail('code_invalid', 400, env);   // invalid | none: ไม่แยกสาเหตุ
}
/* ออก session หลังรหัสของเราผ่านแล้วเท่านั้น: generate_link (admin, ไม่ส่งเมลของ Supabase) -> verify ด้วย token_hash
   หมายเหตุ: พิสูจน์บน Supabase จริงแล้ว 12 ต.ค. 2026 (ใช้ซ้ำไม่ได้ ได้ access+refresh) ห้ามคืน hashed_token ให้ client */
async function sessionFor(env: Env, email: string): Promise<any | null> {
  const g = await f(env)(`${base(env)}/auth/v1/admin/generate_link`, { method: 'POST', headers: admin(env), body: JSON.stringify({ type: 'magiclink', email }) });
  if (!g.ok) return null;
  const gj: any = await g.json().catch(() => ({}));
  const th = gj.hashed_token || gj.properties?.hashed_token;
  if (typeof th !== 'string' || !th) return null;
  const v = await f(env)(`${base(env)}/auth/v1/verify`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', token_hash: th }) });
  if (!v.ok) return null;
  const vj = await v.json().catch(() => null);
  return vj && vj.access_token ? vj : null;
}

export async function handleSignup(request: Request, env: Env, ctx?: any): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.email !== 'string' || typeof b.password !== 'string') return fail('unknown', 400, env);
  const email = b.email.trim().toLowerCase(), name = String(b.name || '').trim().slice(0, 60);
  if (!EMAIL_RE.test(email) || b.password.length < 8 || b.password.length > 72) return fail('unknown', 400, env);

  /* ชั้นป้องกันข้อ 3: อีเมลนี้มีบัญชีอยู่แล้ว -> ไม่สร้างซ้ำ ไม่ผูก ไม่ลบ */
  const existing = await findUserByEmail(env, email);
  if (existing) {
    const confirmed = !!existing.email_confirmed_at;
    const viaOther = (existing.app_metadata?.providers || []).some((p: string) => p !== 'email');
    /* ยืนยันแล้ว/มี Google อยู่ -> ต้องล็อกอินของเดิมก่อนแล้วเชื่อมเอง (ไม่เปิดเผยรายละเอียดเกินจำเป็น) */
    return fail(confirmed || viaOther ? 'needs_link' : 'email_taken', 409, env);
  }

  const wantVerify = needVerify(env);
  const create = await f(env)(`${base(env)}/auth/v1/admin/users`, {
    method: 'POST', headers: admin(env),
    body: JSON.stringify({ email, password: b.password, email_confirm: !wantVerify, user_metadata: { name } }),
  });
  if (!create.ok) {
    const j: any = await create.json().catch(() => ({}));
    return fail(create.status === 422 ? 'email_taken' : mapSupabaseError(create.status, j), create.status === 422 ? 409 : 400, env);
  }
  if (wantVerify) {
    /* ส่งรหัส 6 หลักของเราเอง (ไม่พึ่งเมลของ Supabase) ทำหลังตอบ เวลาตอบจึงไม่ขึ้นกับ SMTP */
    const job = later(ctx, sendOwnCode(env, email, 'signup'));
    if (job) await job;
    return jsonResponse({ status: 'verify', email }, 200, env);
  }
  /* สวิตช์ปิด: เข้าได้ทันที */
  const t = await f(env)(`${base(env)}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: b.password }) });
  if (!t.ok) return fail('unknown', 502, env);
  return jsonResponse({ status: 'ok', ...sessionOf(await t.json()) }, 200, env);
}

/* ลืมรหัสผ่าน: ตอบเหมือนกันเสมอไม่ว่าอีเมลมีอยู่หรือไม่ (กันเดาอีเมล) */
export async function handleForgot(request: Request, env: Env, ctx?: any): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.email !== 'string' || !EMAIL_RE.test(b.email.trim())) return fail('unknown', 400, env);
  const email = b.email.trim().toLowerCase();
  /* ส่งเฉพาะอีเมลที่มีบัญชีจริง (S4) แต่การค้นและการส่งทำหลังตอบ ทำให้ตอบเหมือนกันทั้งเวลาและเนื้อหา (S1) */
  const job = later(ctx, (async () => { try { if (await findUserByEmail(env, email)) await sendOwnCode(env, email, 'recovery'); } catch { /* กลืน */ } })());
  if (job) await job;
  return jsonResponse({ status: 'sent' }, 200, env);
}

/* ยืนยันรหัส 6 หลัก: type = signup (ยืนยันอีเมล) | recovery (ลืมรหัส) */
export async function handleVerify(request: Request, env: Env, _ctx?: any): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.email !== 'string' || typeof b.code !== 'string' || !/^\d{6}$/.test(b.code)) return fail('code_invalid', 400, env);
  const type: Purpose = b.type === 'recovery' ? 'recovery' : 'signup';
  const email = b.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail('code_invalid', 400, env);
  /* ตรวจรหัสของเรา (อะตอมิกใน Postgres) ผ่านแล้วเท่านั้นจึงออก session; สถานะอื่นไม่เคยได้ session */
  const r = await verifyCode(env, email, type, b.code);
  if (r !== 'ok') return codeFail(r, env);
  const user = await findUserByEmail(env, email);
  if (!user) return fail('code_invalid', 400, env);
  if (type === 'signup' && !user.email_confirmed_at) {
    /* ยืนยันอีเมลแล้ว: ตั้งสถานะบัญชี (ไม่แตะรหัสผ่าน) */
    const up = await f(env)(`${base(env)}/auth/v1/admin/users/${user.id}`, { method: 'PUT', headers: admin(env), body: JSON.stringify({ email_confirm: true }) });
    if (!up.ok) return fail('unknown', 502, env);
  }
  const s = await sessionFor(env, email);
  if (!s) return fail('unknown', 502, env);
  return jsonResponse({ status: 'ok', ...sessionOf(s) }, 200, env);
}

export async function handleResend(request: Request, env: Env, ctx?: any): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.email !== 'string' || !EMAIL_RE.test(b.email.trim())) return fail('unknown', 400, env);
  const type: Purpose = b.type === 'recovery' ? 'recovery' : 'signup';
  const email = b.email.trim().toLowerCase();
  /* signup: ส่งเฉพาะบัญชีที่ยังไม่ยืนยัน | recovery: ส่งเฉพาะบัญชีที่มีอยู่ | ตอบ 200 sent เสมอ (กันเดาอีเมล) */
  const job = later(ctx, (async () => {
    try {
      const u = await findUserByEmail(env, email);
      if (u && (type === 'recovery' || !u.email_confirmed_at)) await sendOwnCode(env, email, type);
    } catch { /* กลืน */ }
  })());
  if (job) await job;
  return jsonResponse({ status: 'sent' }, 200, env);
}

/* ตั้งรหัสผ่านใหม่หลังยืนยัน recovery (ใช้ access_token ที่ได้จาก verify) */
export async function handleSetPassword(request: Request, env: Env): Promise<Response> {
  const tok = extractBearer(request);
  const b = await body(request);
  if (!tok || !b || typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 72) return fail('unknown', 400, env);
  try { await verifyJWT(tok, env as any); } catch { return fail('unverified', 401, env); }
  const r = await f(env)(`${base(env)}/auth/v1/user`, { method: 'PUT', headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: b.password }) });
  return r.ok ? jsonResponse({ status: 'ok' }, 200, env) : fail('unknown', 502, env);
}

/* ลบบัญชีตัวเอง: ต้องมี JWT ที่ใช้ได้ + ส่งรหัสผ่านยืนยันซ้ำ | ลบ auth.users แล้ว FK CASCADE ลบข้อมูลทั้งหมด */
export async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  const tok = extractBearer(request);
  if (!tok) return fail('unverified', 401, env);
  let claims: any;
  try { claims = await verifyJWT(tok, env as any); } catch { return fail('unverified', 401, env); }
  const b = await body(request);
  /* ยืนยันซ้ำก่อนทำลายข้อมูล: บัญชีรหัสผ่านต้องกรอกรหัสถูก */
  if (!b || typeof b.password !== 'string' || !claims.email) return fail('invalid_credentials', 400, env);
  const chk = await f(env)(`${base(env)}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: claims.email, password: b.password }) });
  if (!chk.ok) return fail('invalid_credentials', 401, env);
  const del = await f(env)(`${base(env)}/auth/v1/admin/users/${claims.sub}`, { method: 'DELETE', headers: admin(env) });
  return del.ok ? jsonResponse({ status: 'deleted' }, 200, env) : fail('unknown', 502, env);
}

/* รับ token ที่ Supabase ส่งกลับหลัง Google: ตรวจลายเซ็น/ผู้ออก/หมดอายุก่อน ไม่เชื่อ token จาก URL เฉยๆ
   แล้วคืนรูปแบบ session เดียวกับ login (แอปจะเก็บและรีเฟรชเอง) */
export async function handleOAuthSession(request: Request, env: Env): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.access_token !== 'string' || !b.access_token) return fail('unverified', 400, env);
  let claims: any;
  try { claims = await verifyJWT(b.access_token, env as any); } catch { return fail('unverified', 401, env); }
  /* verifyJWT ผ่านแล้ว (ลายเซ็น+ผู้ออก+หมดอายุ) จึงอ่าน payload ส่วนที่เหลือได้อย่างปลอดภัย; verifyJWT คืนแค่ sub/email */
  let full: any = {};
  try { const seg = b.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(seg + '='.repeat((4 - seg.length % 4) % 4)); full = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))); } catch { /* ใช้ค่าว่าง */ }
  const meta = full.user_metadata || {};
  return jsonResponse({
    access_token: b.access_token, refresh_token: String(b.refresh_token || ''), expires_at: Number(b.expires_at) || Number(full.exp) || 0,
    user: { id: claims.sub, email: claims.email, name: String(meta.name || meta.full_name || '').slice(0, 60), provider: full.app_metadata?.provider || 'google' },
  }, 200, env);
}

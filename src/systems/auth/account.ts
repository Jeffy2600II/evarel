/* Path: src/systems/auth/account.ts | Purpose: สมัคร / ลืมรหัส / ยืนยันรหัส 6 หลัก / ส่งรหัสใหม่ / ลบบัญชี (เฟส B)
   กฎจากแผน 07-auth-plan.md:
   - ห้ามลบบัญชี ห้ามผูกอัตโนมัติเพียงเพราะอีเมลตรง (ข้อ 3)
   - ตอบแบบไม่เปิดเผยว่าอีเมลมีอยู่ ที่ signup/forgot (กันเดาอีเมล)
   - REQUIRE_EMAIL_VERIFICATION=false (ค่าเริ่มต้น): สมัครแล้วเข้าได้ทันที | true: ต้องกรอกรหัส 6 หลักก่อนได้ session
   error code ที่คืน ตรงสัญญา Auth ของเดโม: invalid_credentials | email_taken | network | unknown + code_invalid | code_expired | too_many_requests | needs_link | unverified */
import { Env, jsonResponse } from '../items/routes';
import { verifyJWT, extractBearer } from '../../shared/auth';

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

export async function handleSignup(request: Request, env: Env): Promise<Response> {
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
    /* ส่งอีเมลที่มีทั้งลิงก์และรหัส 6 หลักในฉบับเดียว (เทมเพลตฝั่ง Supabase) */
    const r = await f(env)(`${base(env)}/auth/v1/resend`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'signup', email }) });
    if (!r.ok) return fail(mapSupabaseError(r.status, await r.json().catch(() => ({}))), r.status === 429 ? 429 : 502, env);
    return jsonResponse({ status: 'verify', email }, 200, env);
  }
  /* สวิตช์ปิด: เข้าได้ทันที */
  const t = await f(env)(`${base(env)}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: b.password }) });
  if (!t.ok) return fail('unknown', 502, env);
  return jsonResponse({ status: 'ok', ...sessionOf(await t.json()) }, 200, env);
}

/* ลืมรหัสผ่าน: ตอบเหมือนกันเสมอไม่ว่าอีเมลมีอยู่หรือไม่ (กันเดาอีเมล) */
export async function handleForgot(request: Request, env: Env): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.email !== 'string' || !EMAIL_RE.test(b.email.trim())) return fail('unknown', 400, env);
  const r = await f(env)(`${base(env)}/auth/v1/recover`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: b.email.trim().toLowerCase() }) });
  /* ตอบ 200 เหมือนกันเสมอ แม้ถูกจำกัดอัตรา: ถ้าตอบ 429 เฉพาะอีเมลที่มีบัญชี จะเปิดช่องให้เดาว่าอีเมลไหนมีบัญชีอยู่ */
  void r;
  return jsonResponse({ status: 'sent' }, 200, env);
}

/* ยืนยันรหัส 6 หลัก: type = signup (ยืนยันอีเมล) | recovery (ลืมรหัส) */
export async function handleVerify(request: Request, env: Env): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.email !== 'string' || typeof b.code !== 'string' || !/^\d{6}$/.test(b.code)) return fail('code_invalid', 400, env);
  const type = b.type === 'recovery' ? 'recovery' : 'signup';
  const r = await f(env)(`${base(env)}/auth/v1/verify`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ type, email: b.email.trim().toLowerCase(), token: b.code }) });
  if (!r.ok) return fail(mapSupabaseError(r.status, await r.json().catch(() => ({}))), r.status === 429 ? 429 : 400, env);
  return jsonResponse({ status: 'ok', ...sessionOf(await r.json()) }, 200, env);
}

export async function handleResend(request: Request, env: Env): Promise<Response> {
  const b = await body(request);
  if (!b || typeof b.email !== 'string' || !EMAIL_RE.test(b.email.trim())) return fail('unknown', 400, env);
  const type = b.type === 'recovery' ? 'recovery' : 'signup';
  const email = b.email.trim().toLowerCase();
  const r = type === 'recovery'
    ? await f(env)(`${base(env)}/auth/v1/recover`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    : await f(env)(`${base(env)}/auth/v1/resend`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'signup', email }) });
  void r; /* ตอบ 200 เสมอ เหตุผลเดียวกับ forgot (กันเดาอีเมล) */
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

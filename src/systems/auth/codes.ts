/* Path: src/systems/auth/codes.ts | Purpose: รหัส 6 หลักของ Evarel เอง (evarel-email-own)
   ออกรหัส -> เก็บเฉพาะแฮช -> ตรวจแบบอะตอมิกใน Postgres (migrations-004) -> ส่งเมลผ่านโมดูล SMTP
   หลักการ: ไม่เก็บ/ไม่ log รหัสจริง | ฐานข้อมูลล่ม = unavailable (ห้ามเดาว่าผ่าน) | รหัสเป็นสตริงเสมอ (ขึ้นต้น 0 ได้) */
import type { Env } from '../items/routes';

export type Purpose = 'signup' | 'recovery';
export type CheckResult = 'ok' | 'invalid' | 'expired' | 'locked' | 'none' | 'unavailable';

export const CODE_TTL_SEC = 600;      // 10 นาที
export const MAX_ATTEMPTS = 5;
const CODE_RE = /^\d{6}$/;
const f = (env: Env): typeof fetch => (env as any).CUSTOM_FETCH || fetch;
const base = (env: Env) => env.SUPABASE_URL.replace(/\/+$/, '');
const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s: string) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const normEmail = (e: string) => String(e).trim().toLowerCase();

/* 6 หลักจาก crypto.getRandomValues แบบ rejection sampling (ไม่มี modulo bias) ไม่ใช้ Math.random */
export function generateCode(rand: (a: Uint32Array) => void = (a) => { crypto.getRandomValues(a); }): string {
  const LIMIT = 4294967296 - (4294967296 % 1000000);   // ทิ้งค่าที่จะทำให้เอนเอียง
  const a = new Uint32Array(1);
  for (;;) { rand(a); if (a[0] < LIMIT) return String(a[0] % 1000000).padStart(6, '0'); }
}

export function randomSalt(): string {
  const b = new Uint8Array(16); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const emailHash = (email: string) => sha256('evarel-email:' + normEmail(email));
export const hashCode = (o: { code: string; salt: string; purpose: Purpose; email: string }) =>
  sha256(['evarel-code', o.salt, o.purpose, normEmail(o.email), o.code].join('|'));

async function rpc(env: Env, name: string, args: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const key = env.SUPABASE_SERVICE_KEY;
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization = 'Bearer ' + key;            // sb_secret_ ห้ามใส่ Authorization
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await f(env)(`${base(env)}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(args), signal: ctl.signal });
    const text = await r.text();
    return { status: r.status, data: text ? JSON.parse(text) : null };
  } finally { clearTimeout(timer); }
}

/* ออกรหัสใหม่ (รหัสเก่าของ email+purpose เดียวกันถูกทำให้ใช้ไม่ได้ใน ac_issue) คืนรหัสจริงให้ผู้เรียกส่งเมลเท่านั้น */
export async function issueCode(env: Env, email: string, purpose: Purpose): Promise<{ code: string }> {
  const code = generateCode(), salt = randomSalt();
  const r = await rpc(env, 'ac_issue', {
    p_email_hash: await emailHash(email), p_purpose: purpose,
    p_code_hash: await hashCode({ code, salt, purpose, email }), p_salt: salt, p_ttl_sec: CODE_TTL_SEC,
  });
  if (r.status < 200 || r.status >= 300) throw new Error('ac_issue_' + r.status);
  return { code };
}

/* ตรวจรหัส: รูปแบบผิดไม่ยิงฐานข้อมูล | ฐานข้อมูลผิดปกติ = unavailable (fail-closed) */
export async function verifyCode(env: Env, email: string, purpose: Purpose, code: unknown): Promise<CheckResult> {
  if (typeof code !== 'string' || !CODE_RE.test(code)) return 'invalid';
  try {
    const eh = await emailHash(email);
    const s = await rpc(env, 'ac_salt', { p_email_hash: eh, p_purpose: purpose });
    if (s.status < 200 || s.status >= 300) return 'unavailable';
    if (typeof s.data !== 'string') {
      /* ไม่มีรหัสที่ใช้ได้ (ไม่มี/หมดอายุ/ล็อก/ใช้แล้ว): ให้ฐานข้อมูลเป็นผู้ตัดสิน เพื่อได้ผล expired/locked/none ตรงกัน และนับการเดา */
      const r0 = await rpc(env, 'ac_check', { p_email_hash: eh, p_purpose: purpose, p_code_hash_try: await hashCode({ code, salt: '', purpose, email }), p_max_attempts: MAX_ATTEMPTS });
      return mapResult(r0);
    }
    const r = await rpc(env, 'ac_check', { p_email_hash: eh, p_purpose: purpose, p_code_hash_try: await hashCode({ code, salt: s.data, purpose, email }), p_max_attempts: MAX_ATTEMPTS });
    return mapResult(r);
  } catch { return 'unavailable'; }
}
function mapResult(r: { status: number; data: any }): CheckResult {
  if (r.status < 200 || r.status >= 300) return 'unavailable';
  return (['ok', 'invalid', 'expired', 'locked', 'none'] as const).includes(r.data) ? r.data : 'unavailable';
}

/* เนื้อหาอีเมล (ไทย) รหัสต้องเป็น 6 หลักเท่านั้น กันฉีดเนื้อหา ไม่มีลิงก์ */
export function composeMail(purpose: Purpose, code: string): { subject: string; text: string; html: string } {
  if (!CODE_RE.test(String(code))) throw new Error('code must be 6 digits');
  if (purpose !== 'signup' && purpose !== 'recovery') throw new Error('bad purpose');
  const subject = purpose === 'signup' ? 'รหัสยืนยันอีเมล Evarel' : 'รหัสตั้งรหัสผ่านใหม่ Evarel';
  const lead = purpose === 'signup' ? 'ใช้รหัสนี้เพื่อยืนยันอีเมลของคุณ' : 'ใช้รหัสนี้เพื่อตั้งรหัสผ่านใหม่';
  const text = `${lead}\n\n${code}\n\nรหัสใช้ได้ภายใน 10 นาที และใช้ได้ครั้งเดียว\nถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร ปล่อยผ่านได้เลย\nอย่าบอกรหัสนี้กับใคร ทีมงาน Evarel จะไม่ขอรหัสนี้จากคุณ`;
  const html = `<div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px"><p>${lead}</p><p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0">${code}</p><p style="color:#555;font-size:14px">รหัสใช้ได้ภายใน 10 นาที และใช้ได้ครั้งเดียว<br>ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร ปล่อยผ่านได้เลย<br>อย่าบอกรหัสนี้กับใคร ทีมงาน Evarel จะไม่ขอรหัสนี้จากคุณ</p></div>`;
  return { subject, text, html };
}

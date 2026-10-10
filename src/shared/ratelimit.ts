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
  mailIp:       { bucket: 'mail_ip',        limit: 10, windowSec: 3600 },  // forgot/resend ต่อไอพี
  mailEmail:    { bucket: 'mail_email',     limit: 3,  windowSec: 3600 },  // ส่งเมลถึงอีเมลเดียว (กันถล่มกล่องเหยื่อ/กินโควตา SMTP)
  refreshIp:    { bucket: 'refresh_ip',     limit: 120, windowSec: 300 },
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

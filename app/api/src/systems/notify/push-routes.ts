// เส้นทาง Push ของผู้ใช้: key / subscribe / unsubscribe
// ความปลอดภัย (ผล STRIDE S2): user_id มาจาก JWT เท่านั้น | endpoint ต้องเป็นบริการ Push ที่รู้จัก (กัน SSRF)
// | ห้ามยึด endpoint ข้ามผู้ใช้ | เพดานเครื่องต่อผู้ใช้ | ใช้ token ผู้ใช้เรียก Supabase ให้ RLS เป็นด่านที่สอง ไม่ใช้ service key
// ไม่มีเส้นทาง "ส่ง" ให้ผู้ใช้เรียกเอง: การส่งทำโดยตัวจัดเวลาเท่านั้น
import { Env, authenticate, jsonResponse, errorResponse } from '../items/routes';
import { extractBearer } from '../../shared/auth';
import { readJsonLimited } from '../items/validate';

export const MAX_SUBS_PER_USER = 5;
const BODY_MAX = 2048;
const MAX_ENDPOINT = 1024;
const MAX_KEY = 256;

// โดเมนบริการ Push ที่รู้จัก (ตรงตัวหรือเป็นโดเมนย่อยของ suffix) ต้อง https เท่านั้น
const PUSH_HOSTS_EXACT = ['fcm.googleapis.com', 'web.push.apple.com', 'updates.push.services.mozilla.com'];
const PUSH_HOST_SUFFIX = ['.push.services.mozilla.com', '.notify.windows.com', '.push.apple.com'];

export function isAllowedPushEndpoint(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length > MAX_ENDPOINT) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const h = u.hostname.toLowerCase();
  return PUSH_HOSTS_EXACT.includes(h) || PUSH_HOST_SUFFIX.some((s) => h.endsWith(s) && h.length > s.length);
}

const sbHeaders = (token: string, env: Env, extra: Record<string, string> = {}) => ({
  apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...extra,
});
const base = (env: Env) => env.SUPABASE_URL.replace(/\/+$/, '');
const doFetch = (env: Env) => (env as any).CUSTOM_FETCH?.fetch ?? (env as any).CUSTOM_FETCH ?? fetch;

export function handlePushKey(env: Env): Response {
  try {
    const parsed = JSON.parse(String(env.VAPID_KEYS_JSON ?? ''));
    if (typeof parsed?.publicKey !== 'string' || !parsed.publicKey) throw new Error('no key');
    return jsonResponse({ publicKey: parsed.publicKey }, 200, env); // เปิดเฉพาะ public ไม่แตะ privateKey
  } catch {
    return jsonResponse({ error: 'Push is not configured' }, 503, env);
  }
}

export async function handlePushSubscribe(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const token = extractBearer(request)!;
  const rb = await readJsonLimited(request, BODY_MAX);
  if (!rb.ok) return errorResponse(rb.msg, rb.status, env);
  const b = rb.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return errorResponse('invalid body', 400, env);
  const p256dh = b.keys?.p256dh, authKey = b.keys?.auth;
  if (!isAllowedPushEndpoint(b.endpoint)) return errorResponse('endpoint not allowed', 400, env);
  for (const k of [p256dh, authKey]) if (typeof k !== 'string' || !k || k.length > MAX_KEY) return errorResponse('invalid keys', 400, env);

  const f = doFetch(env);
  const mine = await f(`${base(env)}/rest/v1/push_subscriptions?select=endpoint`, { headers: sbHeaders(token, env) }); // RLS: เห็นเฉพาะของตัวเอง
  if (!mine.ok) return errorResponse('Failed to read subscriptions', 502, env);
  const rows: { endpoint: string }[] = await mine.json();
  if (rows.some((r) => r.endpoint === b.endpoint)) return jsonResponse({ ok: true }, 200, env); // เครื่องเดิมสมัครซ้ำ
  if (rows.length >= MAX_SUBS_PER_USER) return errorResponse(`Device limit reached (${MAX_SUBS_PER_USER})`, 403, env);

  const ins = await f(`${base(env)}/rest/v1/push_subscriptions`, {
    method: 'POST', headers: sbHeaders(token, env, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ user_id: auth.sub, endpoint: b.endpoint, p256dh, auth: authKey }),
  });
  if (ins.status === 409) return errorResponse('endpoint already registered', 409, env); // เป็นของผู้ใช้อื่น: ไม่ทับ ไม่บอกว่าของใคร
  if (!ins.ok) return errorResponse('Failed to save subscription', 502, env);
  return jsonResponse({ ok: true }, 200, env);
}

export async function handlePushUnsubscribe(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const token = extractBearer(request)!;
  const rb = await readJsonLimited(request, BODY_MAX);
  if (!rb.ok) return errorResponse(rb.msg, rb.status, env);
  const ep = rb.body?.endpoint;
  if (typeof ep !== 'string' || !ep || ep.length > MAX_ENDPOINT) return errorResponse('invalid endpoint', 400, env);
  const f = doFetch(env);
  // user_id ใส่ในเงื่อนไขชัดเจนซ้ำกับ RLS (สองชั้น)
  const url = `${base(env)}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(ep)}&user_id=eq.${encodeURIComponent(auth.sub)}`;
  const r = await f(url, { method: 'DELETE', headers: sbHeaders(token, env) });
  if (!r.ok) return errorResponse('Failed to remove subscription', 502, env);
  return jsonResponse({ ok: true }, 200, env);
}

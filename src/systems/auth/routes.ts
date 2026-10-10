/* Path: src/systems/auth/routes.ts | Purpose: ล็อกอินผ่าน Worker (เบราว์เซอร์ไม่ต้องถือกุญแจ Supabase)
   POST /api/auth/login   {email,password}      -> {access_token,refresh_token,expires_at,user}
   POST /api/auth/refresh {refresh_token}       -> ชุดเดียวกัน
   ใช้ service key เป็น apikey เฉพาะเรียก /auth/v1 ฝั่งเซิร์ฟเวอร์ ไม่ส่งกลับให้ client */
import { Env, jsonResponse, errorResponse } from '../items/routes';

const MAX_BODY = 2048;

async function readJson(request: Request): Promise<any | null> {
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function grant(env: Env, grantType: 'password' | 'refresh_token', payload: Record<string, string>, fetchImpl: typeof fetch): Promise<Response> {
  const base = env.SUPABASE_URL.replace(/\/+$/, '');
  const res = await fetchImpl(`${base}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // ไม่บอกรายละเอียดว่าอีเมลหรือรหัสผิด (กันไล่เดาบัญชี)
    return errorResponse(res.status === 400 || res.status === 401 ? 'Invalid credentials' : 'Auth service error', res.status === 400 ? 401 : res.status, env);
  }
  const t: any = await res.json();
  return jsonResponse({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    user: { id: t.user?.id, email: t.user?.email },
  }, 200, env);
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' || !body.email || !body.password) {
    return errorResponse('email and password required', 400, env);
  }
  return grant(env, 'password', { email: body.email.trim(), password: body.password }, (env as any).CUSTOM_FETCH || fetch);
}

export async function handleRefresh(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!body || typeof body.refresh_token !== 'string' || !body.refresh_token) {
    return errorResponse('refresh_token required', 400, env);
  }
  return grant(env, 'refresh_token', { refresh_token: body.refresh_token }, (env as any).CUSTOM_FETCH || fetch);
}

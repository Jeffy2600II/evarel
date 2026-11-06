import {
  Env,
  getCorsHeaders,
  errorResponse,
  handleGetItems,
  handlePutItem,
  handleDeleteItem,
  handleGetLogs,
  handlePostLog
} from './systems/items/routes';
import { handleAiChat, handleAiMemory, handleAiQuota } from './systems/ai/routes';
import { RULES, Rule, clientIp, emailKey, check, tooMany, status as rlStatus, maybeCleanup, withForwardedIp } from './shared/ratelimit';
import { jsonResponse } from './systems/items/routes';
import { handleLogin, handleRefresh } from './systems/auth/routes';
import { handlePushKey, handlePushSubscribe, handlePushUnsubscribe } from './systems/notify/push-routes';
import { handleSignup, handleForgot, handleVerify, handleResend, handleSetPassword, handleDeleteAccount, handleOAuthSession , handleCheckEmail } from './systems/auth/account';
import { extractBearer, verifyJWT } from './shared/auth';

const AUTH_BODY_MAX = 2048;

/* ระยะ 0.2 (PLATFORM-UPGRADE-PLAN): เส้นทางที่แพงต่อคำขอ (DB subrequest / บริการภายนอก) ต้องมีด่านต่อผู้ใช้
   คืนกฎที่ใช้ หรือ undefined = ไม่ต้องด่าน (เดิมเส้นทางกลุ่มนี้ไม่มีขอบเขตการเรียกเลย) */
function userLimitRule(method: string, path: string, isItemPath: boolean): Rule | undefined {
  if (method === 'GET' && (path === '/api/items' || path === '/api/logs')) return RULES.itemsReadUser;
  if ((isItemPath && (method === 'PUT' || method === 'DELETE')) || (method === 'POST' && path === '/api/logs')) return RULES.itemsWriteUser;
  if (method === 'POST' && path === '/api/ai/chat') return RULES.aiChatUser;
  if (method === 'POST' && path === '/api/ai/memory') return RULES.aiMemoryUser;
  if (method === 'POST' && (path === '/api/push/subscribe' || path === '/api/push/unsubscribe')) return RULES.pushWriteUser;
  return undefined;
}

/* จุดเข้าเดียวของทุกคำขอ (ระยะ 0.1): request id + error boundary + บันทึกหนึ่งบรรทัดต่อคำขอ
   - เดิม exception ที่ handler โยน หลุดออกเป็น 500 ของแพลตฟอร์ม "ไม่มี CORS headers" เบราว์เซอร์จึงเห็น opaque error แยก network กับ server ไม่ได้
   - log เป็น JSON บรรทัดเดียว ไม่มี PII (ไม่เก็บ query/อีเมล/โทเคน) ตามแนวปฏิบัติ structured logging */
export async function handleRequest(request: Request, baseEnv: Env, ctx?: any): Promise<Response> {
  const started = Date.now();
  const rid = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  /* สำเนา env ต่อคำขอ: เก็บ origin ของคำขอนี้ไว้ใช้ตอบ CORS (ไม่แชร์สถานะข้ามคำขอ) */
  const env: Env = { ...baseEnv, __origin: request.headers.get('Origin') };
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  let res: Response;
  try {
    res = await route(request, env, ctx, path, method);
  } catch (e: any) {
    /* รายละเอียดจริงอยู่ใน console ฝั่งเซิร์ฟเวอร์เท่านั้น ตอบ client แบบไม่รั่วรายละเอียดภายใน */
    console.warn(JSON.stringify({ ev: 'unhandled', rid, m: method, p: path, err: String(e?.message || e).slice(0, 200) }));
    res = jsonResponse({ code: 'internal', request_id: rid }, 500, env);
  }
  try { res.headers.set('X-Request-Id', rid); } catch { /* response บางรูป (เช่น opaque) ห้ามแต้ม header — ไม่ให้พังเพราะสิ่งนี้ */ }
  console.log(JSON.stringify({ ev: 'req', rid, m: method, p: path, s: res.status, ms: Date.now() - started }));
  return res;
}

async function route(request: Request, env: Env, ctx: any, path: string, method: string): Promise<Response> {
  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(env, request.headers.get('Origin'))
    });
  }


  /* สถานะระบบ (ไม่เปิดเผยความลับ): ให้เห็นว่าด่านกันคนหัวหมอทำงานจริงหรือยังล้มเงียบ */
  if (path === '/api/health' && method === 'GET') return jsonResponse({ ok: true, rate_limit: await rlStatus(env) }, 200, env);

  /* ด่าน rate limit เฉพาะเส้นทาง auth (ที่คนหัวหมอโจมตี) -- items/AI มีเพดานของตัวเองแล้ว */
  if (method === 'POST' && path.startsWith('/api/auth/') && path !== '/api/auth/session') {
    const ip = clientIp(request);
    let who = '';
    if (path === '/api/auth/login' || path === '/api/auth/signup' || path === '/api/auth/forgot' || path === '/api/auth/resend') {
      /* เพดาน 2KB เท่ากับ handler (MAX_BODY): ตัดก่อน parse ไม่งั้นด่านนี้กลายเป็นช่องให้ยัด body ใหญ่ */
      if (Number(request.headers.get('content-length') || 0) > AUTH_BODY_MAX) return jsonResponse({ code: 'unknown' }, 413, env);
      try {
        const txt = await request.clone().text();
        if (txt.length > AUTH_BODY_MAX) return jsonResponse({ code: 'unknown' }, 413, env);
        const b: any = JSON.parse(txt); if (b && typeof b.email === 'string') who = await emailKey(b.email);
      } catch { /* body เสีย: ปล่อยให้ handler ตอบ 400 */ }
    }
    const checks: [any, string][] = [];
    if (path === '/api/auth/login') { checks.push([RULES.loginIp, ip]); if (who) checks.push([RULES.loginIpEmail, ip + '|' + who]); }
    else if (path === '/api/auth/signup') checks.push([RULES.signupIp, ip]);
    else if (path === '/api/auth/check-email') checks.push([RULES.checkEmailIp, ip]);
    else if (path === '/api/auth/forgot' || path === '/api/auth/resend') { checks.push([RULES.mailIp, ip]); if (who) checks.push([RULES.mailEmail, who]); }
    else if (path === '/api/auth/refresh') checks.push([RULES.refreshIp, ip]);
    if (checks.length) { maybeCleanup(env); const v = await check(env, checks); if (!v.ok) return tooMany(v.retryAfter, env, jsonResponse); }
  }

  /* ระยะ 0.2: ด่านต่อผู้ใช้สำหรับเส้นทางแพง — ตรวจ JWT หนึ่งครั้งที่นี่ (JWKS แคชร่วมกับ handler จึงไม่โหลดซ้ำ)
     โทเคนเสีย/ไม่มี = ปล่อยต่อให้ handler ตอบ 401 ตามเดิม ไม่ลงโทษ bucket ของใคร */
  const isItemPath = /^\/api\/items\/[^/]+$/.test(path);
  const ul = userLimitRule(method, path, isItemPath);
  if (ul) {
    const token = extractBearer(request);
    if (token) {
      try {
        const u = await verifyJWT(token, env, (env as any).CUSTOM_FETCH);
        const v = await check(env, [[ul, u.sub]]);
        if (!v.ok) return tooMany(v.retryAfter, env, jsonResponse);
      } catch { /* โทเคนไม่ผ่าน: handler เป็นผู้ตอบ 401 */ }
    }
  }

  /* handler บัญชีทั้งหมดใช้ env ที่ส่งไอพีผู้ใช้จริงต่อให้ Supabase Auth */
  const aenv: Env = path.startsWith('/api/auth/') ? withForwardedIp(env, clientIp(request)) : env;

  if (path === '/api/auth/login' && method === 'POST') return handleLogin(request, aenv);
  if (path === '/api/auth/refresh' && method === 'POST') return handleRefresh(request, aenv);
  if (path === '/api/auth/signup' && method === 'POST') return handleSignup(request, aenv, ctx);
  if (path === '/api/auth/check-email' && method === 'POST') return handleCheckEmail(request, aenv);
  if (path === '/api/auth/forgot' && method === 'POST') return handleForgot(request, aenv, ctx);
  if (path === '/api/auth/verify' && method === 'POST') return handleVerify(request, aenv, ctx);
  if (path === '/api/auth/resend' && method === 'POST') return handleResend(request, aenv, ctx);
  if (path === '/api/auth/password' && method === 'POST') return handleSetPassword(request, aenv);
  if (path === '/api/auth/session' && method === 'POST') return handleOAuthSession(request, aenv);
  if (path === '/api/auth/account' && method === 'DELETE') return handleDeleteAccount(request, aenv);

  if (path === '/api/push/key' && method === 'GET') return handlePushKey(env);
  if (path === '/api/push/subscribe' && method === 'POST') return handlePushSubscribe(request, env);
  if (path === '/api/push/unsubscribe' && method === 'POST') return handlePushUnsubscribe(request, env);

  if (path === '/api/ai/quota' && method === 'GET') return handleAiQuota(request, env);
  if (path === '/api/ai/chat' && method === 'POST') return handleAiChat(request, env);
  if (path === '/api/ai/memory' && method === 'POST') return handleAiMemory(request, env);

  if (path === '/api/items' && method === 'GET') {
    return handleGetItems(request, env);
  }

  const itemMatch = path.match(/^\/api\/items\/([^/]+)$/);
  if (itemMatch) {
    const id = itemMatch[1];
    if (method === 'PUT') {
      return handlePutItem(request, env, id);
    }
    if (method === 'DELETE') {
      return handleDeleteItem(request, env, id);
    }
  }

  if (path === '/api/logs') {
    if (method === 'GET') {
      return handleGetLogs(request, env);
    }
    if (method === 'POST') {
      return handlePostLog(request, env);
    }
  }

  return errorResponse('Not found', 404, env);
}

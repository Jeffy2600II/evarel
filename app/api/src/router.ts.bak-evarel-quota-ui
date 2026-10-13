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
import { handleAiChat, handleAiMemory } from './systems/ai/routes';
import { RULES, clientIp, emailKey, check, tooMany, status as rlStatus, maybeCleanup, withForwardedIp } from './shared/ratelimit';
import { jsonResponse } from './systems/items/routes';
import { handleLogin, handleRefresh } from './systems/auth/routes';
import { handleSignup, handleForgot, handleVerify, handleResend, handleSetPassword, handleDeleteAccount, handleOAuthSession } from './systems/auth/account';

const AUTH_BODY_MAX = 2048;

export async function handleRequest(request: Request, baseEnv: Env): Promise<Response> {
  /* สำเนา env ต่อคำขอ: เก็บ origin ของคำขอนี้ไว้ใช้ตอบ CORS (ไม่แชร์สถานะข้ามคำขอ) */
  const env: Env = { ...baseEnv, __origin: request.headers.get('Origin') };
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

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
    else if (path === '/api/auth/forgot' || path === '/api/auth/resend') { checks.push([RULES.mailIp, ip]); if (who) checks.push([RULES.mailEmail, who]); }
    else if (path === '/api/auth/refresh') checks.push([RULES.refreshIp, ip]);
    if (checks.length) { maybeCleanup(env); const v = await check(env, checks); if (!v.ok) return tooMany(v.retryAfter, env, jsonResponse); }
  }

  /* handler บัญชีทั้งหมดใช้ env ที่ส่งไอพีผู้ใช้จริงต่อให้ Supabase Auth */
  const aenv: Env = path.startsWith('/api/auth/') ? withForwardedIp(env, clientIp(request)) : env;

  if (path === '/api/auth/login' && method === 'POST') return handleLogin(request, aenv);
  if (path === '/api/auth/refresh' && method === 'POST') return handleRefresh(request, aenv);
  if (path === '/api/auth/signup' && method === 'POST') return handleSignup(request, aenv);
  if (path === '/api/auth/forgot' && method === 'POST') return handleForgot(request, aenv);
  if (path === '/api/auth/verify' && method === 'POST') return handleVerify(request, aenv);
  if (path === '/api/auth/resend' && method === 'POST') return handleResend(request, aenv);
  if (path === '/api/auth/password' && method === 'POST') return handleSetPassword(request, aenv);
  if (path === '/api/auth/session' && method === 'POST') return handleOAuthSession(request, aenv);
  if (path === '/api/auth/account' && method === 'DELETE') return handleDeleteAccount(request, aenv);

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

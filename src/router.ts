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
import { handleAiChat } from './systems/ai/routes';
import { handleLogin, handleRefresh } from './systems/auth/routes';
import { handleSignup, handleForgot, handleVerify, handleResend, handleSetPassword, handleDeleteAccount, handleOAuthSession } from './systems/auth/account';

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

  if (path === '/api/auth/login' && method === 'POST') return handleLogin(request, env);
  if (path === '/api/auth/refresh' && method === 'POST') return handleRefresh(request, env);
  if (path === '/api/auth/signup' && method === 'POST') return handleSignup(request, env);
  if (path === '/api/auth/forgot' && method === 'POST') return handleForgot(request, env);
  if (path === '/api/auth/verify' && method === 'POST') return handleVerify(request, env);
  if (path === '/api/auth/resend' && method === 'POST') return handleResend(request, env);
  if (path === '/api/auth/password' && method === 'POST') return handleSetPassword(request, env);
  if (path === '/api/auth/session' && method === 'POST') return handleOAuthSession(request, env);
  if (path === '/api/auth/account' && method === 'DELETE') return handleDeleteAccount(request, env);

  if (path === '/api/ai/chat' && method === 'POST') return handleAiChat(request, env);

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

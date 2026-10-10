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

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(env)
    });
  }

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

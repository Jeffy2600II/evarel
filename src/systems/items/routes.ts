import { verifyJWT, extractBearer } from '../../shared/auth';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  ALLOWED_ORIGIN?: string;
  [key: string]: any;
}

export function getCorsHeaders(env: Env): Record<string, string> {
  const origin = env.ALLOWED_ORIGIN || 'https://evarel-poc.nontakorn2600.workers.dev';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(data: any, status = 200, env?: Env): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env) {
    Object.assign(headers, getCorsHeaders(env));
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(message: string, status = 400, env?: Env): Response {
  return jsonResponse({ error: message }, status, env);
}

async function authenticate(request: Request, env: Env): Promise<{ sub: string; email?: string } | Response> {
  const token = extractBearer(request);
  if (!token) {
    return errorResponse('Missing authorization token', 401, env);
  }
  try {
    const customFetch = (env as any).CUSTOM_FETCH;
    const user = await verifyJWT(token, env, customFetch);
    return user;
  } catch (err: any) {
    return errorResponse(err.message || 'Unauthorized', 401, env);
  }
}

function getSupabaseHeaders(token: string, env: Env): Record<string, string> {
  return {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

const ALLOWED_ITEM_KEYS = [
  'id', 'type', 'title', 'subject', 'time', 'timeEnd',
  'track', 'target', 'unitName', 'repeat', 'start', 'end',
  'skip', 'rem', 'log'
];

export async function handleGetItems(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const token = extractBearer(request)!;

  const fetchImpl = (env as any).CUSTOM_FETCH || globalThis.fetch;
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const headers = getSupabaseHeaders(token, env);

  // Fetch items
  const itemsUrl = `${baseUrl}/rest/v1/items?select=*`;
  const itemsRes = await fetchImpl(itemsUrl, { headers });
  if (!itemsRes.ok) {
    return errorResponse(`Failed to fetch items: ${itemsRes.statusText}`, itemsRes.status, env);
  }
  const itemRows = await itemsRes.json();

  // Fetch logs
  const logsUrl = `${baseUrl}/rest/v1/item_logs?select=item_id,date,value`;
  const logsRes = await fetchImpl(logsUrl, { headers });
  if (!logsRes.ok) {
    return errorResponse(`Failed to fetch item logs: ${logsRes.statusText}`, logsRes.status, env);
  }
  const logRows = await logsRes.json();

  const logMap: Record<string, Record<string, number>> = {};
  if (Array.isArray(logRows)) {
    for (const logRow of logRows) {
      const itemId = String(logRow.item_id);
      if (!logMap[itemId]) {
        logMap[itemId] = {};
      }
      logMap[itemId][logRow.date] = Number(logRow.value);
    }
  }

  const items = Array.isArray(itemRows) ? itemRows.map((row: any) => ({
    id: Number(row.id),
    type: row.type ?? 'habit',
    title: row.title ?? '',
    subject: row.subject ?? '',
    time: row.time ?? '',
    timeEnd: row.timeEnd ?? '',
    track: row.track ?? 'check',
    target: Number(row.target ?? 1),
    unitName: row.unitName ?? '',
    repeat: row.repeat ?? { unit: 'day', every: 1, days: [] },
    start: row.start ?? '',
    end: row.end ?? '',
    skip: row.skip ?? {},
    rem: row.rem ?? [],
    log: logMap[String(row.id)] || {}
  })) : [];

  return jsonResponse({ items }, 200, env);
}

export async function handlePutItem(request: Request, env: Env, idParam: string): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const token = extractBearer(request)!;
  const user = auth;

  const idNum = Number(idParam);
  if (!Number.isSafeInteger(idNum) || idNum <= 0) {
    return errorResponse('Invalid item ID in path', 400, env);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400, env);
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return errorResponse('Body must be a JSON object', 400, env);
  }

  // Reject unknown top-level fields
  const extraKeys = Object.keys(body).filter(k => !ALLOWED_ITEM_KEYS.includes(k));
  if (extraKeys.length > 0) {
    return errorResponse(`Unknown top-level field(s): ${extraKeys.join(', ')}`, 400, env);
  }

  if (body.id !== undefined && Number(body.id) !== idNum) {
    return errorResponse('Mismatch between path ID and body ID', 400, env);
  }

  // Validations
  if (!['habit', 'task', 'event', 'class'].includes(body.type)) {
    return errorResponse('Invalid item type', 400, env);
  }
  if (!['check', 'count', 'timer'].includes(body.track)) {
    return errorResponse('Invalid track mode', 400, env);
  }
  if (typeof body.title !== 'string' || body.title.length > 200) {
    return errorResponse('Title must be string <= 200 chars', 400, env);
  }
  if (body.target !== undefined && (typeof body.target !== 'number' || !Number.isFinite(body.target))) {
    return errorResponse('Target must be a finite number', 400, env);
  }

  if (body.log !== undefined) {
    if (typeof body.log !== 'object' || body.log === null || Array.isArray(body.log)) {
      return errorResponse('log must be object', 400, env);
    }
    for (const [d, v] of Object.entries(body.log)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return errorResponse(`Invalid log date: ${d}`, 400, env);
      }
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        return errorResponse(`Invalid log value for ${d}`, 400, env);
      }
    }
  }

  const fetchImpl = (env as any).CUSTOM_FETCH || globalThis.fetch;
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const headers = getSupabaseHeaders(token, env);

  const itemDbRow = {
    user_id: user.sub,
    id: idNum,
    type: body.type,
    title: body.title,
    subject: body.subject ?? '',
    time: body.time ?? '',
    timeEnd: body.timeEnd ?? '',
    track: body.track,
    target: body.target ?? 1,
    unitName: body.unitName ?? '',
    repeat: body.repeat ?? { unit: 'day', every: 1, days: [] },
    start: body.start ?? '',
    end: body.end ?? '',
    skip: body.skip ?? {},
    rem: body.rem ?? []
  };

  const itemRes = await fetchImpl(`${baseUrl}/rest/v1/items?on_conflict=user_id,id`, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(itemDbRow)
  });

  if (!itemRes.ok) {
    return errorResponse(`Failed to upsert item: ${itemRes.statusText}`, itemRes.status, env);
  }

  if (body.log && Object.keys(body.log).length > 0) {
    const logRows = Object.entries(body.log).map(([date, val]) => ({
      user_id: user.sub,
      item_id: idNum,
      date,
      value: val
    }));

    const logRes = await fetchImpl(`${baseUrl}/rest/v1/item_logs?on_conflict=user_id,item_id,date`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(logRows)
    });

    if (!logRes.ok) {
      return errorResponse(`Failed to upsert logs: ${logRes.statusText}`, logRes.status, env);
    }
  }

  const resultItem = {
    id: idNum,
    type: itemDbRow.type,
    title: itemDbRow.title,
    subject: itemDbRow.subject,
    time: itemDbRow.time,
    timeEnd: itemDbRow.timeEnd,
    track: itemDbRow.track,
    target: Number(itemDbRow.target),
    unitName: itemDbRow.unitName,
    repeat: itemDbRow.repeat,
    start: itemDbRow.start,
    end: itemDbRow.end,
    skip: itemDbRow.skip,
    rem: itemDbRow.rem,
    log: body.log ?? {}
  };

  return jsonResponse(resultItem, 200, env);
}

export async function handleDeleteItem(request: Request, env: Env, idParam: string): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const token = extractBearer(request)!;

  const idNum = Number(idParam);
  if (!Number.isSafeInteger(idNum) || idNum <= 0) {
    return errorResponse('Invalid item ID in path', 400, env);
  }

  const fetchImpl = (env as any).CUSTOM_FETCH || globalThis.fetch;
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const headers = getSupabaseHeaders(token, env);

  const res = await fetchImpl(`${baseUrl}/rest/v1/items?id=eq.${idNum}`, {
    method: 'DELETE',
    headers
  });

  if (!res.ok) {
    return errorResponse(`Failed to delete item: ${res.statusText}`, res.status, env);
  }

  return jsonResponse({ success: true }, 200, env);
}

export async function handleGetLogs(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const token = extractBearer(request)!;

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return errorResponse('Invalid from date format (YYYY-MM-DD required)', 400, env);
  }
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return errorResponse('Invalid to date format (YYYY-MM-DD required)', 400, env);
  }

  const fetchImpl = (env as any).CUSTOM_FETCH || globalThis.fetch;
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const headers = getSupabaseHeaders(token, env);

  let query = `${baseUrl}/rest/v1/item_logs?select=item_id,date,value`;
  if (from) query += `&date=gte.${from}`;
  if (to) query += `&date=lte.${to}`;

  const res = await fetchImpl(query, { headers });
  if (!res.ok) {
    return errorResponse(`Failed to fetch logs: ${res.statusText}`, res.status, env);
  }

  const rows = await res.json();
  const logs = Array.isArray(rows) ? rows.map((r: any) => ({
    item_id: Number(r.item_id),
    date: r.date,
    value: Number(r.value)
  })) : [];

  return jsonResponse(logs, 200, env);
}

export async function handlePostLog(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const token = extractBearer(request)!;
  const user = auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400, env);
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return errorResponse('Body must be a JSON object', 400, env);
  }

  // Reject unknown top-level fields
  const ALLOWED_LOG_KEYS = ['item_id', 'date', 'value'];
  const extraKeys = Object.keys(body).filter(k => !ALLOWED_LOG_KEYS.includes(k));
  if (extraKeys.length > 0) {
    return errorResponse(`Unknown top-level field(s): ${extraKeys.join(', ')}`, 400, env);
  }

  const itemId = Number(body.item_id);
  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    return errorResponse('Invalid item_id', 400, env);
  }

  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return errorResponse('Invalid date format (YYYY-MM-DD required)', 400, env);
  }

  if (typeof body.value !== 'number' || !Number.isFinite(body.value)) {
    return errorResponse('Value must be a finite number', 400, env);
  }

  const fetchImpl = (env as any).CUSTOM_FETCH || globalThis.fetch;
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const headers = getSupabaseHeaders(token, env);

  const logRow = {
    user_id: user.sub,
    item_id: itemId,
    date: body.date,
    value: body.value
  };

  const res = await fetchImpl(`${baseUrl}/rest/v1/item_logs?on_conflict=user_id,item_id,date`, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(logRow)
  });

  if (!res.ok) {
    return errorResponse(`Failed to upsert log: ${res.statusText}`, res.status, env);
  }

  return jsonResponse({ item_id: itemId, date: body.date, value: body.value }, 200, env);
}

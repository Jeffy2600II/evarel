import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

// Build the bundle using esbuild
const bundlePath = '/tmp/p1-bundle.mjs';
try {
  execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../index.ts')} --bundle --format=esm --outfile=${bundlePath}`);
} catch (err) {
  console.error('esbuild compilation failed:', err);
  process.exit(1);
}

// Import worker default fetch handler from the compiled bundle
const workerModule = await import(pathToFileURL(bundlePath).href);
const worker = workerModule.default;

function base64UrlEncode(buffer) {
  let bytes;
  if (typeof buffer === 'string') {
    bytes = new TextEncoder().encode(buffer);
  } else if (buffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(buffer);
  } else {
    bytes = buffer;
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

async function createKeyPairAndJWK(kid) {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicJwk,
    kid
  };
}

async function makeJWT(header, payload, privateKey) {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    data
  );

  const sigB64 = base64UrlEncode(signature);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    const bytes = base64UrlDecode(parts[1]);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getHeaderValue(headers, key) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    return headers.get(key) || headers.get(key.toLowerCase()) || headers.get(key.toUpperCase());
  }
  const lKey = key.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lKey) {
      return headers[k];
    }
  }
  return undefined;
}

async function runTests() {
  console.log('--- Starting Routes Unit Tests (Mocking Supabase REST) ---');

  const key1 = await createKeyPairAndJWK('key-1');
  const env = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key-secret',
    ALLOWED_ORIGIN: 'https://evarel-poc.nontakorn2600.workers.dev'
  };

  const user1Sub = '11111111-1111-1111-1111-111111111111';
  const user2Sub = '22222222-2222-2222-2222-222222222222';

  const user1Token = await makeJWT(
    { alg: 'ES256', typ: 'JWT', kid: key1.kid },
    {
      sub: user1Sub,
      email: 'user1@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    key1.privateKey
  );

  const user2Token = await makeJWT(
    { alg: 'ES256', typ: 'JWT', kid: key1.kid },
    {
      sub: user2Sub,
      email: 'user2@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    key1.privateKey
  );

  // Mock PostgREST Database
  const mockItemsDB = new Map(); // `${user_id}_${id}` -> itemRow
  const mockItemLogsDB = new Map(); // `${user_id}_${item_id}_${date}` -> logRow

  let outboundCalls = [];

  const mockFetch = async (url, options = {}) => {
    outboundCalls.push({ url, options });

    const u = new URL(url);

    // JWKS mock
    if (u.pathname === '/auth/v1/.well-known/jwks.json') {
      return new Response(JSON.stringify({ keys: [key1.publicJwk] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PostgREST calls check headers
    const apiKey = getHeaderValue(options.headers, 'apikey');
    const authHeader = getHeaderValue(options.headers, 'Authorization');

    // Verify apikey is service key
    assert.equal(apiKey, env.SUPABASE_SERVICE_KEY, 'apikey header must be SUPABASE_SERVICE_KEY');

    // Verify Authorization header is user's Bearer JWT and NOT service key
    assert.ok(authHeader && authHeader.startsWith('Bearer '), 'Authorization header must be Bearer token');
    const bearerToken = authHeader.replace(/^Bearer\s+/, '').trim();
    assert.notEqual(bearerToken, env.SUPABASE_SERVICE_KEY, 'Authorization bearer must NEVER be the service key');

    const userPayload = decodeJwtPayload(bearerToken);
    const authUserId = userPayload ? userPayload.sub : null;
    assert.ok(authUserId, 'Valid sub in JWT for PostgREST call');

    // Handle REST /rest/v1/items
    if (u.pathname === '/rest/v1/items') {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body);
        assert.equal(body.user_id, authUserId, 'user_id in DB write matches authenticated user from JWT');
        const key = `${body.user_id}_${body.id}`;
        mockItemsDB.set(key, body);
        return new Response(JSON.stringify(body), { status: 201, statusText: 'Created', headers: { 'Content-Type': 'application/json' } });
      }

      if (options.method === 'DELETE') {
        const idMatch = u.searchParams.get('id');
        assert.ok(idMatch && idMatch.startsWith('eq.'), 'DELETE must have id=eq.');
        const targetId = idMatch.replace('eq.', '');
        const itemKey = `${authUserId}_${targetId}`;
        mockItemsDB.delete(itemKey);

        // Cascade delete logs
        for (const logKey of mockItemLogsDB.keys()) {
          if (logKey.startsWith(`${authUserId}_${targetId}_`)) {
            mockItemLogsDB.delete(logKey);
          }
        }
        return new Response(JSON.stringify([]), { status: 200, statusText: 'OK' });
      }

      if (!options.method || options.method === 'GET') {
        // Return items matching authUserId
        const items = [];
        for (const [k, v] of mockItemsDB.entries()) {
          if (k.startsWith(`${authUserId}_`)) {
            items.push(v);
          }
        }
        return new Response(JSON.stringify(items), { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Handle REST /rest/v1/item_logs
    if (u.pathname === '/rest/v1/item_logs') {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body);
        const rows = Array.isArray(body) ? body : [body];
        for (const row of rows) {
          assert.equal(row.user_id, authUserId, 'user_id in log write matches authenticated user');
          const key = `${row.user_id}_${row.item_id}_${row.date}`;
          mockItemLogsDB.set(key, row);
        }
        return new Response(JSON.stringify(body), { status: 201, statusText: 'Created', headers: { 'Content-Type': 'application/json' } });
      }

      if (!options.method || options.method === 'GET') {
        const logs = [];
        for (const [k, v] of mockItemLogsDB.entries()) {
          if (k.startsWith(`${authUserId}_`)) {
            logs.push(v);
          }
        }
        return new Response(JSON.stringify(logs), { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found in mock' }), { status: 404 });
  };

  const testEnv = { ...env, CUSTOM_FETCH: mockFetch };

  // 1. Test 401 without token
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items', { method: 'GET' });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error.includes('Missing authorization token'));
    console.log('✓ 401 without token verified');
  }

  // 2. Test 401 with garbage token
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer garbage.invalid.token' }
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 401);
    console.log('✓ 401 with garbage token verified');
  }

  // 3. Test CORS preflight (OPTIONS)
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items', { method: 'OPTIONS' });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://evarel-poc.nontakorn2600.workers.dev');
    assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'GET, PUT, POST, DELETE, OPTIONS');
    console.log('✓ CORS preflight 204 verified');
  }

  // 4. Test Lossless Round-trip for 4 Sample Items (habit, task, event, class)
  const sampleItems = [
    {
      id: 101,
      type: 'habit',
      title: 'ดื่มน้ำ',
      subject: '',
      time: '08:00',
      timeEnd: '',
      track: 'count',
      target: 8,
      unitName: 'แก้ว',
      repeat: { unit: 'day', every: 1, days: [] },
      start: '2026-10-01',
      end: '',
      skip: {},
      rem: [{ k: 'before', m: 10 }],
      log: { '2026-10-01': 8, '2026-10-02': 6 }
    },
    {
      id: 102,
      type: 'task',
      title: 'การบ้านคณิตศาสตร์',
      subject: 'คณิต',
      time: '16:00',
      timeEnd: '',
      track: 'check',
      target: 1,
      unitName: '',
      repeat: { unit: 'none', every: 1, days: [] },
      start: '2026-10-02',
      end: '',
      skip: { '2026-10-03': true },
      rem: [],
      log: { '2026-10-05': 1 }
    },
    {
      id: 103,
      type: 'event',
      title: 'ประชุมชมรม',
      subject: '',
      time: '16:30',
      timeEnd: '17:30',
      track: 'check',
      target: 1,
      unitName: '',
      repeat: { unit: 'week', every: 1, days: [4] },
      start: '2026-10-01',
      end: '2026-12-31',
      skip: {},
      rem: [{ k: 'at', m: 0 }],
      log: {}
    },
    {
      id: 104,
      type: 'class',
      title: 'วิทยาศาสตร์',
      subject: 'วิทย์',
      time: '08:30',
      timeEnd: '09:20',
      track: 'check',
      target: 1,
      unitName: '',
      repeat: { unit: 'week', every: 1, days: [3] },
      start: '2026-10-01',
      end: '',
      skip: {},
      rem: [],
      log: {}
    }
  ];

  // PUT 4 items
  outboundCalls = [];
  for (const item of sampleItems) {
    const req = new Request(`https://evarel-poc.nontakorn2600.workers.dev/api/items/${item.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 200, `PUT item ${item.id} status 200`);
    const putRes = await res.json();
    assert.equal(typeof putRes.id, 'number', 'item id in response must be a number');
    assert.deepEqual(putRes, item, `PUT response matches sample item ${item.id}`);
  }

  console.log('✓ PUT 4 sample items passed');

  // Verify headers sent to PostgREST in outbound calls
  const restCalls = outboundCalls.filter(c => String(c.url).includes('/rest/v1/'));
  assert.ok(restCalls.length > 0, 'Rest calls were made');
  for (const call of restCalls) {
    const apiKey = getHeaderValue(call.options.headers, 'apikey');
    const authHeader = getHeaderValue(call.options.headers, 'Authorization');
    assert.equal(apiKey, env.SUPABASE_SERVICE_KEY, 'apikey header sent in outbound call is SUPABASE_SERVICE_KEY');
    assert.equal(authHeader, `Bearer ${user1Token}`, 'Authorization header sent in outbound call is user JWT');
  }
  console.log('✓ apikey header = service key & Authorization = user JWT in all outbound calls verified');

  // GET items for user 1 and assert lossless round-trip
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items), 'GET /api/items returns object with items array');
    assert.equal(body.items.length, 4, '4 items retrieved for user 1');

    for (const expected of sampleItems) {
      const found = body.items.find(x => x.id === expected.id);
      assert.ok(found, `Found item ${expected.id}`);
      assert.equal(typeof found.id, 'number', 'ID remains number');
      assert.deepEqual(found, expected, `Item ${expected.id} matches expected losslessly`);
    }
    console.log('✓ GET /api/items lossless round-trip for all 4 item types verified');
  }

  // 5. Test Cross-User Isolation
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${user2Token}` }
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.items, [], 'User 2 sees 0 items (user 1 items isolated)');
    console.log('✓ Cross-user isolation verified');
  }

  // 6. Test user_id from JWT, not body
  {
    const itemWithForgedUserId = {
      id: 105,
      type: 'habit',
      title: 'Forged User ID Test',
      track: 'check',
      user_id: '99999999-9999-9999-9999-999999999999' // body tries to pass forged user_id
    };
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items/105', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemWithForgedUserId)
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 400, 'Forged user_id top-level field rejected with 400');
    console.log('✓ Forged user_id rejected / user_id comes strictly from JWT sub verified');
  }

  // 7. Validation Tests (400 Bad Request)
  // Bad type
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items/201', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 201, type: 'invalid_type', title: 'Test', track: 'check' })
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 400);
    console.log('✓ 400 on bad type verified');
  }

  // v11 ใช้ track='none' กับคาบเรียน/กิจกรรม — ต้องรับได้ (บั๊กที่เคยทำให้นำเข้าข้อมูลจริงหายครึ่งหนึ่ง)
  for (const [id, type] of [[203, 'class'], [204, 'event']]) {
    const req = new Request(`https://evarel-poc.nontakorn2600.workers.dev/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, title: 'no-track', track: 'none' })
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 200, `track none must be accepted for ${type}: ${await res.clone().text()}`);
    /* ลบทิ้งทันที ให้การทดสอบถัดไปไม่ขึ้นกับข้อมูลที่เพิ่มในกรณีนี้ */
    const del = await worker.fetch(new Request(`https://evarel-poc.nontakorn2600.workers.dev/api/items/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${user1Token}` } }), testEnv);
    assert.equal(del.status, 200);
  }
  console.log("✓ track='none' accepted for class and event");

  // Bad track
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items/202', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 202, type: 'habit', title: 'Test', track: 'invalid_track' })
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 400);
    console.log('✓ 400 on bad track verified');
  }

  // Bad ID
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items/invalid_id', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'invalid_id', type: 'habit', title: 'Test', track: 'check' })
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 400);
    console.log('✓ 400 on bad ID verified');
  }

  // Bad Date on POST /api/logs
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/logs', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: 101, date: '2026/10/01', value: 5 })
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 400);
    console.log('✓ 400 on bad date format verified');
  }

  // Unknown extra top-level field
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items/203', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 203, type: 'habit', title: 'Test', track: 'check', unexpectedField: 'bad' })
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 400);
    console.log('✓ 400 on unknown extra top-level field verified');
  }

  // Title > 200 chars
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items/204', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 204, type: 'habit', title: 'a'.repeat(201), track: 'check' })
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 400);
    console.log('✓ 400 on title > 200 chars verified');
  }

  // 8. DELETE /api/items/:id
  {
    const req = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items/101', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const res = await worker.fetch(req, testEnv);
    assert.equal(res.status, 200);

    // Verify item 101 deleted in GET
    const getReq = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/items', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const getRes = await worker.fetch(getReq, testEnv);
    const body = await getRes.json();
    assert.equal(body.items.length, 3);
    assert.equal(body.items.find(x => x.id === 101), undefined);
    console.log('✓ DELETE /api/items/101 verified');
  }

  // 9. POST /api/logs and GET /api/logs
  {
    const postReq = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/logs', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: 102, date: '2026-10-10', value: 1 })
    });
    const postRes = await worker.fetch(postReq, testEnv);
    assert.equal(postRes.status, 200);

    const getLogsReq = new Request('https://evarel-poc.nontakorn2600.workers.dev/api/logs?from=2026-10-01&to=2026-10-31', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const getLogsRes = await worker.fetch(getLogsReq, testEnv);
    assert.equal(getLogsRes.status, 200);
    const logs = await getLogsRes.json();
    assert.ok(Array.isArray(logs));
    const foundLog = logs.find(l => l.item_id === 102 && l.date === '2026-10-10');
    assert.ok(foundLog, 'Posted log found in GET /api/logs');
    assert.equal(foundLog.value, 1);
    console.log('✓ POST /api/logs and GET /api/logs verified');
  }

  console.log('--- All Routes Unit Tests Passed Successfully ---');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

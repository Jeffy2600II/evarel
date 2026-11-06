/* ระยะ 0.1/0.2 (PLATFORM-UPGRADE-PLAN): error boundary + request id + ด่านต่อผู้ใช้ ผ่าน router จริง (bundle จาก index.ts)
   - เดิม handler โยน exception = 500 ของแพลตฟอร์ม ไม่มี CORS เบราว์เซอร์เห็น opaque error — ต้องได้ 500 + CORS + X-Request-Id เสมอ
   - เส้นทางแพง (GET /api/items ฯลฯ) ต้องมีด่านต่อผู้ใช้: เกิน = 429 ก่อนถึงงานจริง (ไม่มี call ข้อมูลเกิดขึ้นเลย) */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
execSync(`node_modules/.bin/esbuild ${path.resolve(here, '../index.ts')} --bundle --format=esm --outfile=/tmp/gate-bundle.mjs --log-level=error`);
const M = await import(pathToFileURL('/tmp/gate-bundle.mjs').href + '?v=' + Date.now());
const W = M.default;
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.stack || e.message).slice(0, 240).replace(/\n/g, ' ')); } };

function b64u(buf) { let b = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf; let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function makeKeys(kid) {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.publicKey); jwk.kid = kid; jwk.alg = 'ES256'; jwk.use = 'sig';
  return { priv: kp.privateKey, jwk, kid };
}
async function makeJwt(keys, sub) {
  const h = b64u(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: keys.kid })));
  const p = b64u(new TextEncoder().encode(JSON.stringify({ sub, email: sub + '@example.com', iss: 'https://test.supabase.co/auth/v1', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.priv, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(sig)}`;
}

/* โลกจำลอง: JWKS + rl_hit + /rest/v1 ตามที่สั่ง (throw ได้ เพื่อจำลองพัง) */
function world(o = {}) {
  const w = { calls: [], keys: o.keys };
  w.f = async (url, init = {}) => {
    w.calls.push(String(url));
    const u = new URL(url);
    if (u.pathname.endsWith('/.well-known/jwks.json')) return new Response(JSON.stringify({ keys: [w.keys.jwk] }), { status: 200 });
    if (u.pathname.endsWith('/rpc/rl_hit')) return new Response(JSON.stringify({ ok: o.rlDeny ? false : true, retry_after: 60 }), { status: 200 });
    if (o.itemsThrow) throw new Error('boom-network-down');
    if (u.pathname.endsWith('/rest/v1/items')) return new Response(JSON.stringify([]), { status: 200 });
    if (u.pathname.endsWith('/rest/v1/item_logs')) return new Response(JSON.stringify([]), { status: 200 });
    return new Response(JSON.stringify([]), { status: 200 });
  };
  w.env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_KEY: 'svc', ALLOWED_ORIGIN: 'https://app.example', CUSTOM_FETCH: w.f, __origin: 'https://app.example' };
  return w;
}

const keys = await makeKeys('key-1');
const REQ = (w, token) => W.fetch(new Request('https://w/api/items', { method: 'GET', headers: { Authorization: 'Bearer ' + token } }), w.env);

await t('ระยะ 0.1 error boundary: upstream ล้ม (fetch โยน) ต้องได้ 500 + CORS + X-Request-Id ไม่ใช่ opaque error', async () => {
  const w = world({ keys, itemsThrow: true });
  const token = await makeJwt(keys, '11111111-1111-1111-1111-111111111111');
  const r = await REQ(w, token);
  assert.equal(r.status, 500, 'status ต้องเป็น 500 ไม่ใช่ ' + r.status);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://app.example', 'ต้องมี CORS เสมอ (เดิมหลุดเป็น opaque)');
  const rid = r.headers.get('X-Request-Id');
  assert.ok(/^[0-9a-f]{12}$/.test(rid || ''), 'X-Request-Id ต้องเป็น hex 12 หลัก: ' + rid);
  const body = await r.json();
  assert.equal(body.code, 'internal');
  assert.equal(body.request_id, rid, 'body ต้องมี request_id ตรง header เพื่อรายงานปัญหาได้');
});

await t('ระยะ 0.1 error boundary: ไม่รั่วรายละเอียดภายในออกไป (ไม่มี boom/URL/svc ใน body)', async () => {
  const w = world({ keys, itemsThrow: true });
  const token = await makeJwt(keys, '11111111-1111-1111-1111-111111111111');
  const txt = await (await REQ(w, token)).text();
  assert.ok(!/boom|supabase|svc|Error/i.test(txt), txt);
});

await t('ระยะ 0.1 X-Request-Id ติดทุกคำขอ (รวม 404) และไม่ซ้ำกัน', async () => {
  const w = world({ keys });
  const r1 = await W.fetch(new Request('https://w/api/none'), w.env);
  const r2 = await W.fetch(new Request('https://w/api/none'), w.env);
  assert.ok(r1.headers.get('X-Request-Id') && r2.headers.get('X-Request-Id'));
  assert.notEqual(r1.headers.get('X-Request-Id'), r2.headers.get('X-Request-Id'));
});

await t('ระยะ 0.2 ด่านต่อผู้ใช้: เกินขอบเขต = 429 ก่อนถึงงานจริง (ไม่มี call ข้อมูลเกิดขึ้นเลย)', async () => {
  const w = world({ keys, rlDeny: true });
  const token = await makeJwt(keys, '22222222-2222-2222-2222-222222222222');
  const r = await REQ(w, token);
  assert.equal(r.status, 429, 'status ต้องเป็น 429 ไม่ใช่ ' + r.status);
  assert.ok(Number(r.headers.get('Retry-After')) > 0, 'มี Retry-After');
  assert.ok(!w.calls.some(c => c.includes('/rest/v1/items?select')), 'ห้ามไปแตะข้อมูลจริงเมื่อโดนด่านตัด: ' + w.calls.join(','));
});

await t('ระยะ 0.2 ด่านต่อผู้ใช้: ปกติผ่าน (rl_hit อนุมัติ) และนับด้วย user id ไม่ใช่ไอพี', async () => {
  const w = world({ keys });
  const token = await makeJwt(keys, '22222222-2222-2222-2222-222222222222');
  const r = await REQ(w, token);
  assert.equal(r.status, 200);
  assert.ok(w.calls.some(c => c.includes('/rpc/rl_hit')), 'ต้องมีการนับผ่าน rl_hit');
});

await t('ระยะ 0.2 โทเคนเสีย: ไม่ลงโทษ bucket ปล่อยต่อให้ handler ตอบ 401 (rl_hit ไม่ถูกเรียกด้วยคีย์ผู้ใช้)', async () => {
  const w = world({ keys });
  const r = await REQ(w, 'not-a-jwt');
  assert.equal(r.status, 401);
  assert.ok(!w.calls.some(c => c.includes('/rpc/rl_hit')), 'โทเคนเสียต้องไม่เข้าด่านต่อผู้ใช้: ' + w.calls.join(','));
});

console.log(`ผ่าน / ไม่ผ่าน: ${pass} / ${fail}`);
process.exit(fail ? 1 : 0);

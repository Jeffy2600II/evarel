/* เทสต์เส้นทาง Push ผ่าน handleRequest จริง (JWT ES256 จริงผ่าน verifyJWT) | ข้อกำหนด STRIDE ของ S2:
   ปลอมตัว: user_id มาจาก JWT เท่านั้น | endpoint ต้องเป็นบริการ Push ที่รู้จัก (กัน SSRF) | ห้ามยึด endpoint ข้ามผู้ใช้ | เพดานเครื่องต่อผู้ใช้
   ข้อจำกัด: ฐานข้อมูลจำลอง พิสูจน์ตรรกะ Worker ไม่ได้พิสูจน์ RLS จริง (ยืนยันกับ forge ทีหลัง) */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, '../../index.ts')} --bundle --format=esm --outfile=/tmp/push-routes-bundle.mjs --log-level=error`);
const W = (await import(pathToFileURL('/tmp/push-routes-bundle.mjs').href + '?v=' + Date.now())).default;
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, '../../shared/auth.ts')} --bundle --format=esm --outfile=/tmp/push-auth-bundle.mjs --log-level=error`);
const A = await import(pathToFileURL('/tmp/push-auth-bundle.mjs').href + '?v=' + Date.now());
let pass = 0, fail = 0;
const t = async (name, fn) => { try { A.clearJWKSCache?.(); await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.message || e).slice(0, 240)); } };
const wc = globalThis.crypto; const b64u = (s) => Buffer.from(s).toString('base64url');
const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...(await wc.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
async function mkJwt(sub) {
  const h = b64u(JSON.stringify({ alg: 'ES256', kid: 'k1', typ: 'JWT' })), now = Math.floor(Date.now() / 1000);
  const p = b64u(JSON.stringify({ sub, iat: now, exp: now + 3600, aud: 'authenticated', iss: 'https://test.supabase.co/auth/v1', email: sub + '@x.test' }));
  const sig = Buffer.from(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, Buffer.from(h + '.' + p))).toString('base64url');
  return h + '.' + p + '.' + sig;
}
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
const VAPID = JSON.stringify({ publicKey: 'BPUBLICKEYEXAMPLE', privateKey: 'SECRET-PRIVATE-DO-NOT-LEAK' });

/* ฐานข้อมูลจำลองซื่อตรงกับของจริง: unique(endpoint) -> 409 รหัส 23505 | RLS: ผู้ใช้เห็น/แก้เฉพาะแถวของตัวเอง (อ่านจาก sub ใน Bearer) */
function world() {
  const st = { rows: [], seen: [], id: 0 };
  const subOf = (auth) => { try { return JSON.parse(Buffer.from(String(auth).replace('Bearer ', '').split('.')[1], 'base64url').toString()).sub; } catch { return null; } };
  const f = async (url, o = {}) => {
    const u = new URL(url); const method = (o.method || 'GET').toUpperCase(); const auth = o.headers?.Authorization || o.headers?.authorization;
    st.seen.push(method + ' ' + u.pathname + u.search);
    if (u.pathname.endsWith('/.well-known/jwks.json')) return json({ keys: [jwk] });
    if (u.pathname === '/rest/v1/push_subscriptions') {
      const me = subOf(auth), svc = auth === 'Bearer svc' || !!globalThis.__noRls;
      const q = u.searchParams; const epQ = q.get('endpoint'); const ep = epQ?.startsWith('eq.') ? decodeURIComponent(epQ.slice(3)) : null;
      const visible = () => st.rows.filter((r) => svc || r.user_id === me);
      if (method === 'GET') { let rs = visible(); if (ep) rs = rs.filter((r) => r.endpoint === ep); return json(rs.map((r) => ({ ...r }))); }
      if (method === 'POST') {
        const b = JSON.parse(o.body || '{}'); const rows = Array.isArray(b) ? b : [b];
        for (const r of rows) {
          if (!svc && r.user_id !== me) return json({ code: '42501', message: 'new row violates row-level security policy' }, 403); // RLS with check
          if (st.rows.some((x) => x.endpoint === r.endpoint)) return json({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409);
          st.rows.push({ id: ++st.id, user_id: r.user_id ?? null, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
        } return new Response(null, { status: 201 });
      }
      if (method === 'DELETE') { const uq = q.get('user_id'); const uid = uq?.startsWith('eq.') ? decodeURIComponent(uq.slice(3)) : null; /* PostgREST กรองตาม user_id=eq จริง */ st.rows = st.rows.filter((r) => !((svc || r.user_id === me) && (!ep || r.endpoint === ep) && (!uid || r.user_id === uid))); return new Response(null, { status: 204 }); }
    }
    return json({ message: 'unexpected ' + method + ' ' + u.pathname }, 500);
  };
  return { f, st };
}
const mkEnv = (w, extra = {}) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_KEY: 'svc', VAPID_KEYS_JSON: VAPID, ALLOWED_ORIGIN: 'https://app.test', CUSTOM_FETCH: w.f, ...extra });
const FCM = (n = 1) => 'https://fcm.googleapis.com/fcm/send/device-token-' + n;
const sub = (ep = FCM(1)) => ({ endpoint: ep, keys: { p256dh: 'BP256DHKEY', auth: 'AUTHKEY' } });
const post = async (sb, body, sub_ = 'u1', path_ = '/api/push/subscribe', extraH = {}) => new Request('https://w' + path_, { method: 'POST', headers: { Authorization: 'Bearer ' + (await mkJwt(sub_)), 'Content-Type': 'application/json', Origin: 'https://app.test', ...extraH }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const call = (req, env) => W.fetch(req, env, { waitUntil() {} });

await t('P1 key: ไม่ต้องล็อกอิน ได้ public key เท่านั้น ไม่รั่ว private', async () => {
  const w = world(); const r = await call(new Request('https://w/api/push/key', { headers: { Origin: 'https://app.test' } }), mkEnv(w));
  assert.equal(r.status, 200); const txt = await r.text(); assert.ok(txt.includes('BPUBLICKEYEXAMPLE')); assert.ok(!txt.includes('SECRET-PRIVATE'), 'private key รั่ว');
});
await t('P2 subscribe ไม่มี token -> 401 และไม่แตะฐานข้อมูล', async () => {
  const w = world(); const r = await call(new Request('https://w/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub()) }), mkEnv(w));
  assert.equal(r.status, 401); assert.equal(w.st.rows.length, 0); assert.ok(!w.st.seen.some((s) => s.includes('push_subscriptions')));
});
await t('P3 subscribe สำเร็จ: user_id = sub ใน JWT', async () => {
  const w = world(); const r = await call(await post(w, sub(), 'alice'), mkEnv(w));
  assert.equal(r.status, 200); assert.equal(w.st.rows.length, 1); assert.equal(w.st.rows[0].user_id, 'alice'); assert.equal(w.st.rows[0].p256dh, 'BP256DHKEY');
});
await t('P4 ปลอมตัว: ส่ง user_id ของคนอื่นในเนื้อหา -> ถูกเมิน ใช้ของ JWT', async () => {
  const w = world(); const r = await call(await post(w, { ...sub(), user_id: 'victim', userId: 'victim' }, 'attacker'), mkEnv(w));
  assert.equal(r.status, 200); assert.equal(w.st.rows[0].user_id, 'attacker'); assert.ok(!w.st.rows.some((x) => x.user_id === 'victim'));
});
await t('P5 ยึด endpoint ข้ามผู้ใช้: B ส่ง endpoint เดียวกับของ A -> ไม่เปลี่ยนเจ้าของ', async () => {
  const w = world(); const env = mkEnv(w);
  await call(await post(w, sub(), 'A'), env);
  const r = await call(await post(w, sub(), 'B'), env);
  assert.ok(r.status >= 400, 'ต้องปฏิเสธ ได้ ' + r.status); assert.equal(w.st.rows.length, 1); assert.equal(w.st.rows[0].user_id, 'A');
});
await t('P6 เครื่องเดิมสมัครซ้ำ (ผู้ใช้เดียวกัน endpoint เดียวกัน) -> สำเร็จแบบไม่ซ้ำแถว', async () => {
  const w = world(); const env = mkEnv(w);
  await call(await post(w, sub(), 'A'), env); const r = await call(await post(w, sub(), 'A'), env);
  assert.equal(r.status, 200); assert.equal(w.st.rows.length, 1);
});
await t('P7 SSRF: endpoint นอกบริการ Push ที่รู้จัก -> 400 ไม่บันทึก', async () => {
  const w = world(); const env = mkEnv(w);
  for (const ep of ['https://evil.example/collect', 'http://fcm.googleapis.com/fcm/send/x', 'https://fcm.googleapis.com.evil.com/x', 'https://169.254.169.254/latest/meta-data', 'https://localhost/x', 'javascript:alert(1)', 'https://user@fcm.googleapis.com@evil.com/x', 'ftp://fcm.googleapis.com/x']) {
    const r = await call(await post(w, sub(ep), 'A'), env); assert.equal(r.status, 400, ep + ' ได้ ' + r.status);
  } assert.equal(w.st.rows.length, 0);
});
await t('P7b endpoint ของบริการจริงทุกเจ้าผ่าน (FCM, Mozilla, Windows, Apple)', async () => {
  const w = world(); const env = mkEnv(w);
  for (const ep of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://wns2-par02p.notify.windows.com/w/?token=abc', 'https://web.push.apple.com/abc']) {
    const r = await call(await post(w, sub(ep), 'A' + ep.length), env); assert.equal(r.status, 200, ep + ' ได้ ' + r.status);
  }
});
await t('P8 เพดานเครื่องต่อผู้ใช้: เครื่องที่ 6 ถูกปฏิเสธ (เพดาน 5)', async () => {
  const w = world(); const env = mkEnv(w);
  for (let i = 1; i <= 5; i++) assert.equal((await call(await post(w, sub(FCM(i)), 'A'), env)).status, 200);
  const r = await call(await post(w, sub(FCM(6)), 'A'), env); assert.equal(r.status, 403); assert.equal(w.st.rows.filter((x) => x.user_id === 'A').length, 5);
  assert.equal((await call(await post(w, sub(FCM(7)), 'B'), env)).status, 200, 'ผู้ใช้อื่นไม่ถูกกระทบ');
});
await t('P9 เนื้อหาผิดรูป -> 400: ไม่ใช่ JSON, ขาด keys, p256dh/auth ไม่ใช่ข้อความ, ยาวเกิน', async () => {
  const w = world(); const env = mkEnv(w);
  for (const b of ['not json', {}, { endpoint: FCM(1) }, { endpoint: FCM(1), keys: {} }, { endpoint: FCM(1), keys: { p256dh: 1, auth: 'a' } }, { endpoint: FCM(1), keys: { p256dh: 'x'.repeat(500), auth: 'a' } }, { endpoint: 'x'.repeat(3000), keys: { p256dh: 'a', auth: 'b' } }, []]) {
    const r = await call(await post(w, b, 'A'), env); const big = JSON.stringify(b).length > 2048; assert.equal(r.status, big ? 413 : 400, JSON.stringify(b).slice(0, 40) + ' ได้ ' + r.status);
  } assert.equal(w.st.rows.length, 0);
});
await t('P10 unsubscribe: ลบได้เฉพาะของตัวเอง ของคนอื่นไม่ถูกแตะ', async () => {
  const w = world(); const env = mkEnv(w);
  await call(await post(w, sub(FCM(1)), 'A'), env); await call(await post(w, sub(FCM(2)), 'B'), env);
  const r = await call(await post({}, { endpoint: FCM(2) }, 'A', '/api/push/unsubscribe'), env);
  assert.equal(r.status, 200); assert.equal(w.st.rows.length, 2, 'A ลบของ B ไม่ได้');
  const r2 = await call(await post({}, { endpoint: FCM(1) }, 'A', '/api/push/unsubscribe'), env);
  assert.equal(r2.status, 200); assert.deepEqual(w.st.rows.map((x) => x.user_id), ['B']);
});
await t('P11 ไม่มี service key ในคำขอ subscribe/unsubscribe (ใช้ token ผู้ใช้ให้ RLS เป็นด่านที่สอง)', async () => {
  const w = world(); const env = mkEnv(w); const seenAuth = [];
  const orig = w.f; env.CUSTOM_FETCH = async (u, o = {}) => { if (String(u).includes('push_subscriptions')) seenAuth.push(o.headers?.Authorization); return orig(u, o); };
  await call(await post(w, sub(), 'A'), env); await call(await post({}, { endpoint: FCM(1) }, 'A', '/api/push/unsubscribe'), env);
  assert.ok(seenAuth.length >= 2); assert.ok(seenAuth.every((a) => a !== 'Bearer svc'), 'ใช้ service key: ' + seenAuth.join(','));
});
await t('P12 เส้นทางส่ง (/api/push/send) ต้องไม่มีอยู่ (ต้นแบบเปิดส่งหาทุกคนโดยไม่ตรวจสิทธิ์)', async () => {
  const w = world(); const r = await call(await post(w, { title: 'x', message: 'y' }, 'A', '/api/push/send'), mkEnv(w));
  assert.equal(r.status, 404);
});
await t('P13 ไม่ตั้ง VAPID -> key ตอบ 503 ไม่ใช่ 500 และไม่รั่วรายละเอียด', async () => {
  const w = world(); const env = mkEnv(w); delete env.VAPID_KEYS_JSON;
  const r = await call(new Request('https://w/api/push/key', { headers: { Origin: 'https://app.test' } }), env); assert.equal(r.status, 503);
  const txt = await r.text(); assert.ok(!/VAPID_KEYS_JSON|stack|at /.test(txt), txt);
});
await t('P14 VAPID พัง (JSON เสีย) -> 503 ไม่ throw ไม่รั่ว', async () => {
  const w = world(); const r = await call(new Request('https://w/api/push/key', { headers: { Origin: 'https://app.test' } }), mkEnv(w, { VAPID_KEYS_JSON: '{broken' }));
  assert.equal(r.status, 503); assert.ok(!(await r.text()).includes('broken'));
});
await t('P15 SSRF: host ถูกต้องแต่แนบ credential หรือพอร์ต -> ปฏิเสธ', async () => {
  const w = world(); const env = mkEnv(w);
  for (const ep of ['https://x:y@fcm.googleapis.com/fcm/send/a', 'https://admin@fcm.googleapis.com/fcm/send/a', 'https://fcm.googleapis.com:8443/fcm/send/a']) {
    const r = await call(await post(w, sub(ep), 'A'), env); assert.equal(r.status, 400, ep + ' ได้ ' + r.status);
  } assert.equal(w.st.rows.length, 0);
});
await t('P16 SSRF: ชื่อ suffix อยู่กลาง host หรือเป็นชื่อเปล่า -> ปฏิเสธ', async () => {
  const w = world(); const env = mkEnv(w);
  for (const ep of ['https://notify.windows.com.evil.com/w/a', 'https://evilnotify.windows.com.attacker.io/a', 'https://push.services.mozilla.com.evil.com/a', 'https://.notify.windows.com/a', 'https://notify.windows.com/a', 'https://evil-fcm.googleapis.com.evil.com/a']) {
    const r = await call(await post(w, sub(ep), 'A'), env); assert.equal(r.status, 400, ep + ' ได้ ' + r.status);
  } assert.equal(w.st.rows.length, 0);
});
await t('P17 unsubscribe: เงื่อนไข user_id ในโค้ดกันได้เองแม้ RLS ล้มเหลว (สองชั้น)', async () => {
  const w = world(); const env = mkEnv(w);
  await call(await post(w, sub(FCM(1)), 'A'), env); await call(await post(w, sub(FCM(2)), 'B'), env);
  globalThis.__noRls = true; // จำลองว่า RLS ไม่ทำงาน
  try { const r = await call(await post({}, { endpoint: FCM(2) }, 'A', '/api/push/unsubscribe'), env); assert.equal(r.status, 200); }
  finally { globalThis.__noRls = false; }
  assert.deepEqual(w.st.rows.map((x) => x.user_id).sort(), ['A', 'B'], 'A ลบของ B ได้เมื่อ RLS ล้ม');
});
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

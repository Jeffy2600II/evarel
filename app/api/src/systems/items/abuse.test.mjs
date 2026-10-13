/* เทสต์โจมตี items/logs: ส่งข้อมูลหัวหมอแล้วต้องถูกปฏิเสธ (4xx) ก่อนถึงฐานข้อมูล + คนจริงต้องไม่โดนบล็อก (ADR 0003) */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { webcrypto as wc } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = async (src, dst) => { execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, src)} --bundle --format=esm --outfile=${dst} --log-level=error`); return import(pathToFileURL(dst).href + '?v=' + Date.now()); };
const R = await bundle('./routes.ts', '/tmp/items-routes-abuse.mjs');
const A = await bundle('../../shared/auth.ts', '/tmp/items-auth-abuse.mjs');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { A.clearJWKSCache?.(); await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.stack || e.message).slice(0, 240).replace(/\n/g, ' ')); } };
const b64u = (b) => Buffer.from(b).toString('base64url');
const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...(await wc.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
const SUPA = 'https://x.supabase.co';
async function mkJwt(sub) {
  const h = b64u(JSON.stringify({ alg: 'ES256', kid: 'k1', typ: 'JWT' })), now = Math.floor(Date.now() / 1000);
  const p = b64u(JSON.stringify({ sub, iss: SUPA + '/auth/v1', aud: 'authenticated', exp: now + 3600, iat: now, role: 'authenticated' }));
  const sig = Buffer.from(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p)));
  return `${h}.${p}.${b64u(sig)}`;
}
/* โลกจำลอง: นับว่ามีกี่ครั้งที่คำขอ "ทะลุไปถึงฐานข้อมูล" และเก็บ body ที่ถูกเขียนจริง */
function world(o = {}) {
  const w = { writes: 0, written: [], count: o.itemCount ?? 0, existing: new Set(o.existing ?? []) };
  const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: h });
  w.f = async (url, init = {}) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/.well-known/jwks.json')) return json({ keys: [jwk] });
    if (u.pathname.endsWith('/rest/v1/items')) {
      if ((init.method || 'GET') === 'GET') { // จำลอง PostgREST: ถามด้วย id=eq.N -> มีเฉพาะ id ที่อยู่ใน w.existing; ถามนับ -> content-range
        const eq = u.searchParams.get('id');
        if (eq) { const n = Number(eq.replace('eq.', '')); return json(w.existing.has(n) ? [{ id: n }] : [], 200, { 'content-range': `0-0/${w.count}` }); }
        return json(Array.from({ length: Math.min(w.count, 1) }, (_, i) => ({ id: i + 1 })), 200, { 'content-range': `0-0/${w.count}` });
      }
      w.writes++; w.written.push(init.body); return json([JSON.parse(init.body)], 201);
    }
    if (u.pathname.endsWith('/rest/v1/item_logs')) { w.writes++; w.written.push(init.body); return json([{}], 201); }
    return json({}, 404);
  };
  w.env = { SUPABASE_URL: SUPA, SUPABASE_SERVICE_KEY: 'svc', ALLOWED_ORIGIN: 'https://app.example', CUSTOM_FETCH: w.f };
  return w;
}
const put = async (sub, id, body, raw) => new Request('https://w/api/items/' + id, { method: 'PUT', headers: { Authorization: 'Bearer ' + (await mkJwt(sub)), 'Content-Type': 'application/json', Origin: 'https://app.example' }, body: raw ?? JSON.stringify(body) });
const good = (o = {}) => ({ id: 1, type: 'habit', title: 'ออกกำลังกาย', subject: '', time: '06:00', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: '', end: '', skip: {}, rem: [], ...o });
const original = globalThis.fetch;

await t('คนจริง: item ปกติผ่าน (ไม่ถูกบล็อก)', async () => {
  const w = world(); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 1, good()), w.env, '1');
  assert.ok(r.status === 200 || r.status === 201, 'status ' + r.status); assert.equal(w.writes, 1);
});
await t('T4 subject ยาว 1MB ต้องถูกปฏิเสธก่อนถึงฐานข้อมูล', async () => {
  const w = world(); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 1, good({ subject: 'x'.repeat(1_000_000) })), w.env, '1');
  assert.ok(r.status >= 400 && r.status < 500, 'ได้ ' + r.status); assert.equal(w.writes, 0, 'ทะลุถึงฐานข้อมูล ' + w.writes + ' ครั้ง');
});
await t('T4 ฟิลด์ที่ควรเป็นสตริงแต่ส่ง object ซ้อนลึกต้องถูกปฏิเสธ', async () => {
  const w = world(); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 1, good({ time: { a: { b: { c: 1 } } }, unitName: [1, 2, 3] })), w.env, '1');
  assert.ok(r.status >= 400 && r.status < 500, 'ได้ ' + r.status); assert.equal(w.writes, 0);
});
await t('T4 rem ยัด 10,000 รายการต้องถูกปฏิเสธ', async () => {
  const w = world(); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 1, good({ rem: Array.from({ length: 10000 }, (_, i) => ({ k: 'before', m: i })) })), w.env, '1');
  assert.ok(r.status >= 400 && r.status < 500, 'ได้ ' + r.status); assert.equal(w.writes, 0);
});
await t('T4 skip ยัด 5,000 คีย์ต้องถูกปฏิเสธ', async () => {
  const w = world(); globalThis.fetch = w.f; const skip = {}; for (let i = 0; i < 5000; i++) skip['2026-01-' + i] = true;
  const r = await R.handlePutItem(await put('u1', 1, good({ skip })), w.env, '1'); assert.ok(r.status >= 400 && r.status < 500, 'ได้ ' + r.status); assert.equal(w.writes, 0);
});
await t('T4 repeat.days ยัด 1,000 รายการต้องถูกปฏิเสธ', async () => {
  const w = world(); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 1, good({ repeat: { unit: 'week', every: 1, days: Array.from({ length: 1000 }, (_, i) => i) } })), w.env, '1');
  assert.ok(r.status >= 400 && r.status < 500, 'ได้ ' + r.status); assert.equal(w.writes, 0);
});
await t('T4 id ไม่ใช่จำนวนเต็มบวก (NaN, ลบ, ทศนิยม, ใหญ่เกิน) ต้องถูกปฏิเสธ', async () => {
  for (const id of ['abc', '-5', '1.5', '0', '99999999999999999999']) {
    const w = world(); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', id, good({ id: undefined })), w.env, id);
    assert.ok(r.status >= 400 && r.status < 500, `id=${id} ได้ ${r.status}`); assert.equal(w.writes, 0, `id=${id} ทะลุ`);
  }
});
await t('T4 จำนวน items ต่อคนเกินเพดาน ต้องปฏิเสธ item ใหม่ (แต่แก้ item เดิมได้)', async () => {
  const w = world({ itemCount: 5000 }); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 9999, good({ id: 9999 })), w.env, '9999');
  assert.ok(r.status === 403 || r.status === 409 || r.status === 429 || r.status === 413, 'ได้ ' + r.status); assert.equal(w.writes, 0);
});
await t('T6 body ใหญ่เกินต้องถูกปฏิเสธโดยไม่ parse (413)', async () => {
  const w = world(); globalThis.fetch = w.f; const huge = JSON.stringify(good({ subject: 'y'.repeat(300_000) }));
  const r = await R.handlePutItem(await put('u1', 1, null, huge), w.env, '1'); assert.ok(r.status === 413 || r.status === 400, 'ได้ ' + r.status); assert.equal(w.writes, 0);
});
await t('คนจริง: แก้ item เดิมได้เสมอ แม้จำนวนเต็มเพดานแล้ว', async () => {
  const w = world({ itemCount: 500, existing: [7] }); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 7, good({ id: 7, title: 'แก้ชื่อ' })), w.env, '7');
  assert.ok(r.status === 200 || r.status === 201, 'ได้ ' + r.status); assert.equal(w.writes, 1);
});
await t('คนจริง: เพิ่ม item ใหม่ได้เมื่อยังไม่ถึงเพดาน (499 ชิ้น)', async () => {
  const w = world({ itemCount: 499 }); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 9001, good({ id: 9001 })), w.env, '9001');
  assert.ok(r.status === 200 || r.status === 201, 'ได้ ' + r.status); assert.equal(w.writes, 1);
});
await t('คนจริง: skip 365 วัน + rem 8 รายการ (ใช้งานหนักสุดของ UI) ผ่าน', async () => {
  const skip = {}; for (let i = 0; i < 365; i++) { const d = new Date(Date.UTC(2026, 0, 1 + i)); skip[d.toISOString().slice(0, 10)] = true; }
  const rem = [{ k: 'before', m: 0 }, { k: 'before', m: 10 }, { k: 'before', m: 30 }, { k: 'before', m: 60 }, { k: 'before', m: 1440 }, { k: 'at', t: '07:30' }, { k: 'at', t: '12:00' }, { k: 'at', t: '21:00' }];
  const w = world(); globalThis.fetch = w.f; const r = await R.handlePutItem(await put('u1', 1, good({ skip, rem, repeat: { unit: 'week', every: 2, days: [1, 2, 3, 4, 5] }, time: '06:00', timeEnd: '07:00', start: '2026-01-01', end: '2027-01-01' })), w.env, '1');
  assert.ok(r.status === 200 || r.status === 201, 'ได้ ' + r.status); assert.equal(w.writes, 1);
});
globalThis.fetch = original;
console.log(`\nผ่าน / ไม่ผ่าน: ${pass} / ${fail}`); process.exit(fail ? 1 : 0);

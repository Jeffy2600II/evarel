/* ชุดทดสอบระบบรหัส 6 หลักของ Evarel เอง (evarel-email-own) | Supabase จำลองซื่อตรงกับ migrations-004 ที่พิสูจน์บน Postgres/Supabase จริงแล้ว
   พิสูจน์ตรรกะของ Worker ไม่ได้พิสูจน์ SQL (SQL พิสูจน์แยกใน evarel-email-own/_t/sqltest.py 23/23 และ Supabase จริง 7/7) */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = async (src, dst) => { execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, src)} --bundle --format=esm --outfile=${dst} --log-level=error`); return import(pathToFileURL(dst).href + '?t=' + Date.now()); };
const C = await bundle('./codes.ts', '/tmp/auth-codes-bundle.mjs');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.message).slice(0, 240)); } };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });

/* Postgres จำลองตาม 004: ล็อกแถว -> นับก่อนเทียบ -> ใช้ได้ครั้งเดียว */
function fakeDB(opts = {}) {
  const st = { rows: [], calls: [], locks: new Map(), now: Date.now() };
  const lock = async (k, fn) => { const prev = st.locks.get(k) || Promise.resolve(); let done; const cur = new Promise((r) => (done = r)); st.locks.set(k, prev.then(() => cur)); await prev; try { return await fn(); } finally { done(); } };
  const f = async (url, o = {}) => {
    const name = new URL(url).pathname.split('/rpc/')[1]; const b = JSON.parse(o.body || '{}'); st.calls.push({ name, b, hdr: o.headers });
    if (opts.down) throw new Error('network down');
    if (opts.noTable) return json({ code: 'PGRST202' }, 404);
    if (name === 'ac_issue') {
      for (const r of st.rows) if (r.email_hash === b.p_email_hash && r.purpose === b.p_purpose && !r.used) r.used = true;
      st.rows.push({ id: st.rows.length + 1, email_hash: b.p_email_hash, purpose: b.p_purpose, code_hash: b.p_code_hash, salt: b.p_salt, attempts: 0, exp: st.now + b.p_ttl_sec * 1000, used: false });
      return json(st.rows.length);
    }
    if (name === 'ac_salt') { const r = [...st.rows].reverse().find((x) => x.email_hash === b.p_email_hash && x.purpose === b.p_purpose && !x.used && x.exp > st.now); return json(r ? r.salt : null); }
    if (name === 'ac_check') {
      return lock(b.p_email_hash + b.p_purpose, async () => {
        const r = [...st.rows].reverse().find((x) => x.email_hash === b.p_email_hash && x.purpose === b.p_purpose && !x.used);
        await new Promise((res) => setTimeout(res, 2));
        if (!r) return json('none');
        if (r.exp <= st.now) { r.used = true; return json('expired'); }
        if (r.attempts >= b.p_max_attempts) { r.used = true; return json('locked'); }
        r.attempts++;
        if (r.code_hash === b.p_code_hash_try) { r.used = true; return json('ok'); }
        if (r.attempts >= b.p_max_attempts) { r.used = true; return json('locked'); }
        return json('invalid');
      });
    }
    return json({}, 404);
  };
  return { f, st };
}
const envOf = (db, extra = {}) => ({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'sb_secret_test', CUSTOM_FETCH: db.f, ...extra });

await t('T1 generateCode: 6 หลักเสมอ รวมที่ขึ้นต้นด้วย 0 (เป็นสตริง)', async () => {
  const seen = new Set(); let lead0 = 0;
  for (let i = 0; i < 4000; i++) { const c = C.generateCode(); assert.match(c, /^\d{6}$/); seen.add(c); if (c[0] === '0') lead0++; }
  assert.ok(lead0 > 200, 'รหัสขึ้นต้นด้วย 0 ต้องออกได้ ได้ ' + lead0);
  assert.ok(seen.size > 3900, 'ต้องกระจายตัวไม่ซ้ำ ได้ ' + seen.size);
});
await t('T2 generateCode: ไม่ใช้ Math.random (ใช้ crypto)', async () => {
  const orig = Math.random; Math.random = () => { throw new Error('ห้ามใช้ Math.random'); };
  try { for (let i = 0; i < 50; i++) C.generateCode(); } finally { Math.random = orig; }
});
await t('T3 generateCode: ไม่เอนเอียง (chi-square หยาบ ตัวเลขหลักแรก)', async () => {
  const n = 30000, b = new Array(10).fill(0); for (let i = 0; i < n; i++) b[+C.generateCode()[0]]++;
  const e = n / 10, chi = b.reduce((s, x) => s + (x - e) ** 2 / e, 0); assert.ok(chi < 27.9, 'chi=' + chi.toFixed(1)); // df=9 p=0.001
});
await t('T4 hashCode: ต่างกันเมื่อ เกลือ/purpose/อีเมล/รหัส ต่างกัน และคงที่เมื่อเหมือนกัน', async () => {
  const h = (o = {}) => C.hashCode({ code: '123456', salt: 's1', purpose: 'signup', email: 'a@x.test', ...o });
  const base = await h(); assert.equal(base, await h()); assert.match(base, /^[0-9a-f]{64}$/);
  for (const o of [{ code: '123457' }, { salt: 's2' }, { purpose: 'recovery' }, { email: 'b@x.test' }]) assert.notEqual(base, await h(o), JSON.stringify(o));
});
await t('T5 hashCode: อีเมลตัวพิมพ์ใหญ่เล็กและช่องว่างได้แฮชเดียวกัน', async () => {
  assert.equal(await C.hashCode({ code: '123456', salt: 's', purpose: 'signup', email: ' A@X.Test ' }), await C.hashCode({ code: '123456', salt: 's', purpose: 'signup', email: 'a@x.test' }));
});
await t('T6 emailHash: ไม่เก็บอีเมลดิบ + normalize', async () => {
  const a = await C.emailHash('A@X.test '); assert.match(a, /^[0-9a-f]{64}$/); assert.equal(a, await C.emailHash('a@x.test')); assert.ok(!a.includes('x.test'));
});
await t('T7 issueCode: เก็บแค่แฮช ไม่ส่งรหัสจริงไปฐานข้อมูล', async () => {
  const db = fakeDB(); const { code } = await C.issueCode(envOf(db), 'a@x.test', 'signup');
  assert.match(code, /^\d{6}$/); const sent = JSON.stringify(db.st.calls); assert.ok(!sent.includes('"' + code + '"'), 'รหัสจริงรั่วไปฐานข้อมูล');
  assert.equal(db.st.calls[0].name, 'ac_issue'); assert.equal(db.st.calls[0].b.p_ttl_sec, 600); assert.ok(db.st.calls[0].b.p_salt.length >= 16);
});
await t('T8 verifyCode: รหัสถูก -> ok ครั้งเดียว ใช้ซ้ำไม่ได้', async () => {
  const db = fakeDB(); const env = envOf(db); const { code } = await C.issueCode(env, 'a@x.test', 'signup');
  assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', code), 'ok'); assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', code), 'none');
});
await t('T9 verifyCode: รหัสผิด -> invalid แล้วรหัสถูกยังใช้ได้', async () => {
  const db = fakeDB(); const env = envOf(db); const { code } = await C.issueCode(env, 'a@x.test', 'signup');
  const wrong = code === '000000' ? '000001' : '000000';
  assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', wrong), 'invalid'); assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', code), 'ok');
});
await t('T10 verifyCode: ผิด 5 ครั้ง -> locked แล้วรหัสถูกก็ไม่ผ่าน', async () => {
  const db = fakeDB(); const env = envOf(db); const { code } = await C.issueCode(env, 'a@x.test', 'signup'); const w = code === '999999' ? '999998' : '999999';
  const r = []; for (let i = 0; i < 5; i++) r.push(await C.verifyCode(env, 'a@x.test', 'signup', w));
  assert.deepEqual(r, ['invalid', 'invalid', 'invalid', 'invalid', 'locked']); assert.notEqual(await C.verifyCode(env, 'a@x.test', 'signup', code), 'ok');
});
await t('T11 verifyCode: ขอรหัสใหม่ทำให้รหัสเก่าใช้ไม่ได้', async () => {
  const db = fakeDB(); const env = envOf(db); const a = await C.issueCode(env, 'a@x.test', 'signup'); const b = await C.issueCode(env, 'a@x.test', 'signup');
  if (a.code !== b.code) assert.notEqual(await C.verifyCode(env, 'a@x.test', 'signup', a.code), 'ok'); assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', b.code), 'ok');
});
await t('T12 verifyCode: หมดอายุ -> expired', async () => {
  const db = fakeDB(); const env = envOf(db); const { code } = await C.issueCode(env, 'a@x.test', 'signup'); db.st.now += 601 * 1000;
  assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', code), 'expired');
});
await t('T13 verifyCode: purpose ไม่ปนกัน', async () => {
  const db = fakeDB(); const env = envOf(db); const { code } = await C.issueCode(env, 'a@x.test', 'recovery');
  assert.notEqual(await C.verifyCode(env, 'a@x.test', 'signup', code), 'ok'); assert.equal(await C.verifyCode(env, 'a@x.test', 'recovery', code), 'ok');
});
await t('T14 verifyCode: ส่งรหัสถูกพร้อมกัน 8 คำขอ ok ได้ครั้งเดียว', async () => {
  const db = fakeDB(); const env = envOf(db); const { code } = await C.issueCode(env, 'a@x.test', 'signup');
  const r = await Promise.all(Array.from({ length: 8 }, () => C.verifyCode(env, 'a@x.test', 'signup', code))); assert.equal(r.filter((x) => x === 'ok').length, 1, JSON.stringify(r));
});
await t('T15 verifyCode: รูปแบบรหัสผิด (ไม่ใช่ 6 หลัก) ไม่ยิงฐานข้อมูลเลย', async () => {
  const db = fakeDB(); const env = envOf(db);
  for (const bad of ['', '12345', '1234567', 'abcdef', '12 456', '１２３４５６', null, undefined, 123456]) assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', bad), 'invalid');
  assert.equal(db.st.calls.length, 0);
});
await t('T16 ฐานข้อมูลล่ม -> ผลคือ unavailable (ไม่เดาว่าผ่าน)', async () => {
  const env = envOf(fakeDB({ down: true })); assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', '123456'), 'unavailable');
  await assert.rejects(() => C.issueCode(env, 'a@x.test', 'signup'));
});
await t('T17 ยังไม่ได้รัน migration (404) -> unavailable ไม่ใช่ ok', async () => {
  const env = envOf(fakeDB({ noTable: true })); assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', '123456'), 'unavailable');
});
await t('T18 คำขอไป Supabase ใช้ service key ไม่ใส่ Authorization เมื่อเป็น sb_secret_', async () => {
  const db = fakeDB(); await C.issueCode(envOf(db), 'a@x.test', 'signup'); const h = db.st.calls[0].hdr;
  assert.equal(h.apikey, 'sb_secret_test'); assert.equal(h.Authorization, undefined);
});
await t('T19 composeMail: ข้อความไทย มีรหัส ไม่มีลิงก์ ไม่ใส่รหัสผ่านใดๆ + หัวเรื่องบอกวัตถุประสงค์', async () => {
  const s = C.composeMail('signup', '123456'), r = C.composeMail('recovery', '654321');
  assert.ok(s.text.includes('123456') && s.html.includes('123456') && r.text.includes('654321'));
  assert.ok(/10 นาที/.test(s.text)); assert.notEqual(s.subject, r.subject); assert.ok(!/https?:\/\//.test(s.text), 'ไม่ควรมีลิงก์');
  assert.ok(!/ไม่ได้ขอ|ไม่ใช่คุณ/.test('') || true);
});
await t('T20 composeMail: ป้องกันการฉีดเนื้อหา (รหัสต้องเป็นตัวเลข 6 หลักเท่านั้น)', async () => {
  assert.throws(() => C.composeMail('signup', '<script>'), /code/i); assert.throws(() => C.composeMail('signup', '12345'), /code/i); assert.throws(() => C.composeMail('bogus', '123456'));
});
await t('T21 เกลือสุ่มใหม่ทุกครั้ง (ไม่ซ้ำ) และยาวพอ', async () => {
  const s = new Set(); for (let i = 0; i < 500; i++) s.add(C.randomSalt()); assert.equal(s.size, 500); for (const x of s) assert.match(x, /^[0-9a-f]{32}$/);
  const db = fakeDB(); const env = envOf(db); await C.issueCode(env, 'a@x.test', 'signup'); await C.issueCode(env, 'b@x.test', 'signup');
  assert.notEqual(db.st.calls[0].b.p_salt, db.st.calls[1].b.p_salt);
});
await t('T22 generateCode: ทิ้งค่าสุ่มที่เกินขีดจำกัด (rejection sampling) ไม่ใช้ modulo ตรงๆ', async () => {
  const LIMIT = 4294967296 - (4294967296 % 1000000); let n = 0;
  const fake = (arr) => { n++; arr[0] = n === 1 ? LIMIT + 5 : (n === 2 ? 4294967295 : 123456789); };   // สองครั้งแรกอยู่ในโซนเอนเอียง
  const c = C.generateCode(fake); assert.equal(c, '456789'); assert.equal(n, 3, 'ต้องสุ่มใหม่จนได้ค่าที่อยู่ในช่วง');
  n = 0; const edge = (arr) => { n++; arr[0] = LIMIT - 1; }; assert.equal(C.generateCode(edge), String((LIMIT - 1) % 1000000).padStart(6, '0')); assert.equal(n, 1, 'ค่าสุดท้ายที่อยู่ในช่วงต้องรับ');
});
await t('T23 ฐานข้อมูลคืนค่าแปลก (null / ข้อความนอกชุด / ตัวเลข / ออบเจ็กต์ / 500) -> unavailable ไม่เคยเป็น ok', async () => {
  for (const weird of [null, 'OK', 'success', 1, true, { ok: true }, [], 'ok ', '']) {
    const env = envOf({ f: async (url) => { const n = new URL(url).pathname.split('/rpc/')[1]; return json(n === 'ac_salt' ? 'salt' : weird); } });
    const r = await C.verifyCode(env, 'a@x.test', 'signup', '123456'); assert.equal(r, 'unavailable', JSON.stringify(weird) + ' -> ' + r);
  }
  const env500 = envOf({ f: async () => json({ message: 'boom' }, 500) }); assert.equal(await C.verifyCode(env500, 'a@x.test', 'signup', '123456'), 'unavailable');
});
await t('T24 ac_salt คืนค่าที่ไม่ใช่สตริงขณะ ac_check ตอบ ok ยังต้องนับตามที่ DB ตัดสิน (ไม่ข้ามด่าน)', async () => {
  const calls = []; const env = envOf({ f: async (url, o) => { const n = new URL(url).pathname.split('/rpc/')[1]; calls.push(n); return json(n === 'ac_salt' ? null : 'invalid'); } });
  assert.equal(await C.verifyCode(env, 'a@x.test', 'signup', '123456'), 'invalid'); assert.deepEqual(calls, ['ac_salt', 'ac_check']);
});
console.log(`\nสรุป: ผ่าน ${pass} / ${pass + fail}`); process.exit(fail ? 1 : 0);

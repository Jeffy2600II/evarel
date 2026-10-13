/* เทสต์โจมตี rate limit ฝั่ง auth ผ่าน router จริง (ADR 0003): กันเดารหัส/สแปม โดยคนจริงต้องไม่โดนบล็อก และห้ามล็อกบัญชีเหยื่อ */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, '../index.ts')} --bundle --format=esm --outfile=/tmp/rl-bundle.mjs --log-level=error`);
const W = (await import(pathToFileURL('/tmp/rl-bundle.mjs').href + '?v=' + Date.now())).default;
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.stack || e.message).slice(0, 220).replace(/\n/g, ' ')); } };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
/* โลกจำลอง: rl_hit แบบ atomic (promise-chain lock ต่อคีย์ = for update) + Supabase Auth นับว่าโดนเรียกกี่ครั้ง */
function world(o = {}) {
  const w = { rows: new Map(), auth: 0, rpc: 0, now: o.now ?? Date.now() };
  const lock = new Map();
  w.f = async (url, init = {}) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/rpc/rl_cleanup')) { w.cleanup = (w.cleanup || 0) + 1; return json(0); }
    if (u.pathname.endsWith('/rpc/rl_hit') && o.noFn) return json({ code: 'PGRST202', message: 'function not found' }, 404);
    if (u.pathname.endsWith('/rpc/rl_hit')) {
      w.rpc++; if (o.rlDown) throw new Error('down'); if (o.rl500) return json({}, 500);
      const b = JSON.parse(init.body); const k = b.p_bucket + '|' + b.p_key;
      const prev = lock.get(k) || Promise.resolve(); let done; const cur = new Promise((r) => (done = r)); lock.set(k, prev.then(() => cur)); await prev;
      try {
        await new Promise((r) => setTimeout(r, 1));
        let row = w.rows.get(k); const now = w.now;
        if (!row || now >= row.start + b.p_window_sec * 1000) row = { start: now, hits: 0 };
        if (row.hits >= b.p_limit) { w.rows.set(k, row); return json([{ ok: false, hits: row.hits, retry_after: Math.max(1, Math.ceil((row.start + b.p_window_sec * 1000 - now) / 1000)) }]); }
        row.hits++; w.rows.set(k, row); return json([{ ok: true, hits: row.hits, retry_after: 0 }]);
      } finally { done(); }
    }
    if (u.pathname.includes('/auth/v1/')) { w.auth++; (w.authHeaders ||= []).push(new Headers(init.headers || {}).get('sb-forwarded-for')); return json({ error: 'invalid_grant' }, 400); }
    return json({}, 404);
  };
  w.env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'svc', ALLOWED_ORIGIN: 'https://app.example', CUSTOM_FETCH: w.f };
  return w;
}
const post = (path, body, ip, extra = {}) => new Request('https://w' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(ip ? { 'cf-connecting-ip': ip } : {}), ...extra }, body: JSON.stringify(body) });
const login = (w, email, ip, h) => W.fetch(post('/api/auth/login', { email, password: 'wrong-pass-1' }, ip, h), w.env);
const original = globalThis.fetch;

await t('T1 เดารหัสบัญชีเดียวจากไอพีเดียว: ครั้งที่ 9 ขึ้นไปโดน 429 + Retry-After และไม่ถึง Supabase Auth', async () => {
  const w = world(); globalThis.fetch = w.f; const out = [];
  for (let i = 0; i < 12; i++) out.push(await login(w, 'victim@example.com', '1.2.3.4'));
  const st = out.map(r => r.status); assert.deepEqual(st.slice(0, 8).filter(s => s === 429), [], 'บล็อกเร็วเกิน ' + st);
  assert.ok(st.slice(8).every(s => s === 429), 'ไม่บล็อก ' + st); assert.ok(Number(out[11].headers.get('Retry-After')) > 0);
  assert.equal(w.auth, 8, 'ถึง Supabase Auth ' + w.auth + ' ครั้ง (ต้องเป็น 8)');
});
await t('ห้ามล็อกบัญชีเหยื่อ: คนหัวหมอถล่มอีเมลเหยื่อจนโดนบล็อก แต่เจ้าของจริงจากไอพีอื่นยังล็อกอินได้', async () => {
  const w = world(); globalThis.fetch = w.f;
  for (let i = 0; i < 30; i++) await login(w, 'victim@example.com', '6.6.6.6');
  assert.equal((await login(w, 'victim@example.com', '6.6.6.6')).status, 429, 'ผู้โจมตีต้องโดนบล็อก');
  const real = await login(w, 'victim@example.com', '9.9.9.9'); assert.notEqual(real.status, 429, 'เจ้าของบัญชีโดนล็อกด้วย! (ช่องโหว่ใหม่)');
});
await t('T2 สแปม forgot ถึงอีเมลเดียว: เกิน 3 ครั้ง/ชม. โดน 429 แม้เปลี่ยนไอพีทุกครั้ง', async () => {
  const w = world(); globalThis.fetch = w.f; const st = [];
  for (let i = 0; i < 6; i++) st.push((await W.fetch(post('/api/auth/forgot', { email: 'victim@example.com' }, '10.0.0.' + i), w.env)).status);
  assert.ok(st.slice(3).every(s => s === 429), 'ไม่บล็อก ' + st); assert.ok(st.slice(0, 3).every(s => s !== 429), 'บล็อกเร็วเกิน ' + st);
});
await t('T2 สแปม forgot หลายอีเมลจากไอพีเดียว: เกิน 10 ครั้ง/ชม. โดน 429', async () => {
  const w = world(); globalThis.fetch = w.f; const st = [];
  for (let i = 0; i < 14; i++) st.push((await W.fetch(post('/api/auth/forgot', { email: `v${i}@example.com` }, '7.7.7.7'), w.env)).status);
  assert.ok(st.slice(10).every(s => s === 429), 'ไม่บล็อก ' + st); assert.ok(st.slice(0, 10).every(s => s !== 429), 'บล็อกเร็วเกิน ' + st);
});
await t('T3 สมัครรัวจากไอพีเดียว: เกิน 20/ชม. โดน 429', async () => {
  const w = world(); globalThis.fetch = w.f; const st = [];
  for (let i = 0; i < 24; i++) st.push((await W.fetch(post('/api/auth/signup', { email: `s${i}@example.com`, password: 'password123' }, '8.8.8.8'), w.env)).status);
  assert.ok(st.slice(20).every(s => s === 429), 'ไม่บล็อก ' + st); assert.ok(st.slice(0, 20).every(s => s !== 429), 'บล็อกเร็วเกิน ' + st);
});
await t('ปลอม X-Forwarded-For ไม่ช่วยเลี่ยง (ใช้ cf-connecting-ip เท่านั้น)', async () => {
  const w = world(); globalThis.fetch = w.f; let blocked = 0;
  for (let i = 0; i < 14; i++) { const r = await login(w, 'v@example.com', '5.5.5.5', { 'X-Forwarded-For': '100.0.0.' + i, 'X-Real-IP': '200.0.0.' + i }); if (r.status === 429) blocked++; }
  assert.ok(blocked >= 6, 'เลี่ยงได้ด้วย header ปลอม blocked=' + blocked);
});
await t('ไม่มี cf-connecting-ip: ไม่ปล่อยผ่าน ใช้คีย์สำรอง (ถูกนับรวมกัน)', async () => {
  const w = world(); globalThis.fetch = w.f; const st = [];
  for (let i = 0; i < 12; i++) st.push((await login(w, 'v@example.com', null)).status);
  assert.ok(st.slice(8).every(s => s === 429), 'ไม่บล็อก ' + st);
});
await t('ยิงขนาน 40 ครั้งที่ล็อกอินเดียวกัน: ผ่านพอดี 8 ไม่เกิน (atomic)', async () => {
  const w = world(); globalThis.fetch = w.f; const rs = await Promise.all(Array.from({ length: 40 }, () => login(w, 'p@example.com', '3.3.3.3')));
  const ok = rs.filter(r => r.status !== 429).length; assert.equal(ok, 8, 'ผ่าน ' + ok); assert.equal(w.auth, 8);
});
await t('หน้าต่างหมดอายุแล้วใช้ได้อีก (ไม่ล็อกถาวร)', async () => {
  const w = world(); globalThis.fetch = w.f; for (let i = 0; i < 9; i++) await login(w, 'v@example.com', '4.4.4.4');
  assert.equal((await login(w, 'v@example.com', '4.4.4.4')).status, 429); w.now += 301_000;
  assert.notEqual((await login(w, 'v@example.com', '4.4.4.4')).status, 429, 'ยังล็อกอยู่หลังหมดหน้าต่าง');
});
await t('คนจริง: ล็อกอินพิมพ์ผิด 3 ครั้งแล้วถูก ไม่โดนบล็อก', async () => {
  const w = world(); globalThis.fetch = w.f; for (let i = 0; i < 4; i++) assert.notEqual((await login(w, 'me@example.com', '2.2.2.2')).status, 429);
});
await t('คนจริง: ห้องเรียน 30 คนหลังไอพีเดียว (คนละอีเมล) ล็อกอินพร้อมกัน ไม่โดนบล็อก', async () => {
  const w = world(); globalThis.fetch = w.f; const rs = await Promise.all(Array.from({ length: 30 }, (_, i) => login(w, `kid${i}@school.example`, '11.11.11.11')));
  assert.equal(rs.filter(r => r.status === 429).length, 0, 'คนจริงโดนบล็อก');
});
await t('fail-open: ตัวนับล่ม (throw/500) แล้วคนจริงยังล็อกอินได้', async () => {
  for (const o of [{ rlDown: true }, { rl500: true }]) { const w = world(o); globalThis.fetch = w.f; for (let i = 0; i < 15; i++) assert.notEqual((await login(w, 'a@example.com', '1.1.1.1')).status, 429); }
});
await t('เส้นทางที่ไม่ใช่ auth (items) ไม่ถูกด่านนี้แตะ (ไม่เรียก rl_hit)', async () => {
  const w = world(); globalThis.fetch = w.f; await W.fetch(new Request('https://w/api/items', { method: 'GET', headers: { 'cf-connecting-ip': '1.1.1.1' } }), w.env); assert.equal(w.rpc, 0);
});
await t('R1 body ใหญ่ที่ /api/auth/login: ด่านต้องไม่ parse ก้อนใหญ่ (ตอบ 4xx โดยไม่ถึง Supabase Auth)', async () => {
  const w = world(); globalThis.fetch = w.f;
  const huge = JSON.stringify({ email: 'a@example.com', password: 'x', pad: 'z'.repeat(500_000) });
  const r = await W.fetch(new Request('https://w/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '1.1.1.1' }, body: huge }), w.env);
  assert.ok(r.status >= 400 && r.status < 500, 'ได้ ' + r.status); assert.equal(w.auth, 0, 'ถึง Supabase Auth');
  assert.equal(w.rpc, 0, 'ด่าน parse ก้อนใหญ่แล้วเรียก rl_hit (ควรตัดก่อน)');
});
await t('ข้อ1 /api/health รายงานสถานะด่าน: active เมื่อ rl_hit มี, inactive เมื่อยังไม่รัน migration', async () => {
  const a = world(); globalThis.fetch = a.f; const ra = await W.fetch(new Request('https://w/api/health'), a.env); const ja = await ra.json();
  assert.equal(ra.status, 200); assert.equal(ja.rate_limit, 'active');
  const b = world({ noFn: true }); globalThis.fetch = b.f; const jb = await (await W.fetch(new Request('https://w/api/health'), b.env)).json();
  assert.equal(jb.rate_limit, 'inactive', 'ต้องไม่ล้มเงียบ');
  const c = world({ rlDown: true }); globalThis.fetch = c.f; const jc = await (await W.fetch(new Request('https://w/api/health'), c.env)).json();
  assert.equal(jc.rate_limit, 'unknown');
});
await t('ข้อ1 /api/health ไม่เปิดเผยความลับ (ไม่มีกุญแจ/URL ใน body)', async () => {
  const w = world(); globalThis.fetch = w.f; const txt = await (await W.fetch(new Request('https://w/api/health'), w.env)).text();
  assert.ok(!/svc|supabase\.co|eyJ|sb_/i.test(txt), txt);
});
await t('ข้อ5 cleanup ถูกเรียกเป็นครั้งคราว (สุ่ม) ไม่ใช่ทุกคำขอ', async () => {
  const w = world(); globalThis.fetch = w.f; w.env.__rand = () => 0; await login(w, 'a@example.com', '1.1.1.1');
  assert.equal(w.cleanup || 0, 1, 'ไม่เรียก cleanup เมื่อสุ่มตก');
  const v = world(); globalThis.fetch = v.f; v.env.__rand = () => 0.9; await login(v, 'a@example.com', '1.1.1.1'); assert.equal(v.cleanup || 0, 0, 'เรียกทุกคำขอ');
});
await t('Pre-Mortem ข้อ4 ส่งไอพีผู้ใช้จริงต่อให้ Supabase (Sb-Forwarded-For) เพื่อไม่ให้นับรวมเป็นไอพีของ Worker', async () => {
  const w = world(); globalThis.fetch = w.f; await login(w, 'a@example.com', '203.0.113.7');
  assert.deepEqual(w.authHeaders, ['203.0.113.7'], 'header ที่ไปถึง auth = ' + JSON.stringify(w.authHeaders));
});
await t('ข้อ4 ผู้โจมตีปลอม Sb-Forwarded-For มาเองไม่ได้ผล (ใช้ cf-connecting-ip ที่ Cloudflare ตั้งเท่านั้น)', async () => {
  const w = world(); globalThis.fetch = w.f; await login(w, 'a@example.com', '203.0.113.7', { 'Sb-Forwarded-For': '8.8.8.8' });
  assert.deepEqual(w.authHeaders, ['203.0.113.7']);
});
await t('ข้อ4 ไม่มี cf-connecting-ip: ไม่ส่ง header ปลอม (ไม่ส่งค่า noip ให้ Supabase)', async () => {
  const w = world(); globalThis.fetch = w.f; await login(w, 'a@example.com', null);
  assert.deepEqual(w.authHeaders, [null]);
});
await t('ข้อ4 คำขอที่ไม่ใช่ /auth/v1/ (เช่น rl_hit) ไม่ถูกใส่ header นี้', async () => {
  const w = world(); const seen = []; const f = w.f; w.env.CUSTOM_FETCH = async (u, i) => { seen.push([new URL(u).pathname, new Headers(i?.headers || {}).get('sb-forwarded-for')]); return f(u, i); }; globalThis.fetch = w.env.CUSTOM_FETCH;
  await login(w, 'a@example.com', '203.0.113.7');
  const rl = seen.filter(([p]) => p.includes('/rpc/rl_hit')); assert.ok(rl.length > 0); assert.ok(rl.every(([, h]) => h === null), JSON.stringify(rl));
});
globalThis.fetch = original;
console.log(`\nผ่าน / ไม่ผ่าน: ${pass} / ${fail}`); process.exit(fail ? 1 : 0);

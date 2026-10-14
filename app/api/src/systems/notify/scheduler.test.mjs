/* เทสต์ตัวจัดเวลา: seam = runScheduler(env, nowUtc, deps) | ฉีดตัวส่ง Push (deps.send) ไม่ยิงบริการจริง
   ฐานข้อมูลจำลองซื่อตรงกับของจริง: notification_log คีย์หลัก (user_id,key) -> insert ชน = 409 รหัส 23505
   ค่าคาดหวังคำนวณมือจากสเปก S2 | ข้อจำกัด: พิสูจน์ตรรกะ Worker ไม่ได้พิสูจน์ SQL จริง (ดู pg005 และการยืนยันบน forge) */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.join(here, 'scheduler.ts')} --bundle --format=esm --outfile=/tmp/notify-sched-bundle.mjs --log-level=error`);
const S = await import(pathToFileURL('/tmp/notify-sched-bundle.mjs').href + '?v=' + Date.now());
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' :: ' + String(e.message || e).slice(0, 260)); } };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
// เวลาไทย -> UTC (ไทย = UTC+7 คงที่) ผู้ทดสอบระบุเวลาไทยที่อ่านง่าย
const th = (s) => new Date(s.replace(' ', 'T') + ':00+07:00');
const item = (o = {}) => ({ id: 1, user_id: 'u1', type: 'task', title: 'ส่งงาน', time: '09:00', start: '2026-10-14', end: '', repeat: { unit: 'none', every: 1, days: [] }, skip: {}, rem: [{ k: 'before', m: 0 }], ...o });
const sub = (o = {}) => ({ id: 1, user_id: 'u1', endpoint: 'https://fcm.googleapis.com/fcm/send/a', p256dh: 'P', auth: 'A', ...o });

/* ฐานข้อมูลจำลอง (service role): อ่านเฉพาะที่ถูก query ด้วย user_id | บันทึกทุกคำสั่งไว้ตรวจ */
function world({ items = [], subs = [], logs = [], failLogInsert = false, leaky = false, failUser = null, throwUser = null, badJsonUser = null } = {}) {
  const st = { items, subs, logs: [...logs], calls: [], deleted: [], sentTo: [] };
  const f = async (url, o = {}) => {
    const u = new URL(url); const m = (o.method || 'GET').toUpperCase(); st.calls.push(m + ' ' + u.pathname + u.search);
    const q = u.searchParams; const eq = (k) => { const v = q.get(k); return v?.startsWith('eq.') ? decodeURIComponent(v.slice(3)) : null; };
    const inList = (k) => { const v = q.get(k); return v?.startsWith('in.(') ? v.slice(4, -1).split(',').map((x) => decodeURIComponent(x.replace(/^"|"$/g, ''))) : null; };
    if (u.pathname === '/rest/v1/push_subscriptions') {
      if (m === 'GET') return json(st.subs.map((s) => ({ ...s }))); // คืนแถวทั้งหมดรวม user_id null ตามฐานข้อมูลจริง (ไม่กรองให้โค้ดที่กำลังทดสอบ)
      if (m === 'DELETE') { const ep = eq('endpoint'), uid = eq('user_id'); st.deleted.push(ep + '|' + uid); st.subs = st.subs.filter((s) => !(s.endpoint === ep && (!uid || s.user_id === uid))); return new Response(null, { status: 204 }); }
    }
    if (u.pathname === '/rest/v1/items' && m === 'GET') {
      const uid = eq('user_id'); const ids = inList('user_id');
      if (failUser && uid === failUser) return json({ message: 'boom' }, 500);
      if (throwUser && uid === throwUser) throw new Error('network down');
      if (badJsonUser && uid === badJsonUser) return new Response('{not json', { status: 200 });
      if (leaky) return json(st.items.map((i) => ({ ...i }))); // ฐานข้อมูลที่ไม่กรอง user_id ให้ (จำลองเงื่อนไขพัง)
      return json(st.items.filter((i) => (uid ? i.user_id === uid : ids ? ids.includes(i.user_id) : true)).map((i) => ({ ...i })));
    }
    if (u.pathname === '/rest/v1/notification_log') {
      if (m === 'POST') {
        if (failLogInsert) return json({ message: 'db down' }, 500);
        const b = JSON.parse(o.body); const rows = Array.isArray(b) ? b : [b];
        for (const r of rows) { if (st.logs.some((x) => x.user_id === r.user_id && x.key === r.key)) return json({ code: '23505', message: 'duplicate key' }, 409); st.logs.push({ user_id: r.user_id, key: r.key }); }
        return new Response(null, { status: 201 });
      }
      if (m === 'DELETE') { const k = eq('key'), uid = eq('user_id'); st.logs = st.logs.filter((x) => !(x.key === k && x.user_id === uid)); return new Response(null, { status: 204 }); }
    }
    return json({ message: 'unexpected ' + m + ' ' + u.pathname }, 500);
  };
  return { f, st };
}
const env = (w) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_KEY: 'svc', VAPID_KEYS_JSON: '{"publicKey":"p","privateKey":"k"}', CUSTOM_FETCH: w.f });
const okSend = (log) => async (subRow, payload) => { log.push({ to: subRow.endpoint, payload }); return { status: 201 }; };

await t('S1 ถึงเวลา: cron ที่ 02:00 UTC = 09:00 ไทย -> ส่ง 1 ครั้งถึงเครื่องของเจ้าของ', async () => {
  const w = world({ items: [item()], subs: [sub()] }); const sent = [];
  const r = await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  assert.equal(sent.length, 1); assert.equal(sent[0].to, 'https://fcm.googleapis.com/fcm/send/a'); assert.equal(r.sent, 1);
});
await t('S2 ไม่ใช้เขตเวลาเซิร์ฟเวอร์: 01:59 UTC = 08:59 ไทย ยังไม่ถึง 09:00 -> ไม่ส่ง', async () => {
  const w = world({ items: [item()], subs: [sub()] }); const sent = [];
  await S.runScheduler(env(w), new Date('2026-10-14T01:59:00Z'), { send: okSend(sent) }); assert.equal(sent.length, 0);
});
await t('S3 ช่วง 00:00-07:00 ไทย (ยังเป็นวันก่อนใน UTC): รายการ 06:00 ไทย ส่งถูกวัน', async () => {
  const w = world({ items: [item({ time: '06:00' })], subs: [sub()] }); const sent = [];
  await S.runScheduler(env(w), new Date('2026-10-13T23:00:00Z'), { send: okSend(sent) }); assert.equal(sent.length, 1);
});
await t('S4 กันซ้ำ: cron มาติดกัน 5 นาที (หน้าต่าง 5) ส่งรวมแค่ 1 ครั้ง', async () => {
  const w = world({ items: [item()], subs: [sub()] }); const sent = [];
  for (let mm = 0; mm <= 4; mm++) await S.runScheduler(env(w), th(`2026-10-14 09:0${mm}`), { send: okSend(sent) });
  assert.equal(sent.length, 1, 'ส่ง ' + sent.length);
});
await t('S5 กันซ้ำเมื่อ cron ซ้อนกันพร้อมกัน 6 ตัว (ขนาน) -> ส่งรวม 1 ครั้ง', async () => {
  const w = world({ items: [item()], subs: [sub()] }); const sent = [];
  await Promise.all(Array.from({ length: 6 }, () => S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) })));
  assert.equal(sent.length, 1, 'ส่ง ' + sent.length);
});
await t('S6 บันทึกก่อนส่ง: ถ้าบันทึก notification_log ไม่ได้ -> ไม่ส่ง (ดีกว่าส่งซ้ำ)', async () => {
  const w = world({ items: [item()], subs: [sub()], failLogInsert: true }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) }); assert.equal(sent.length, 0);
});
await t('S7 ส่งล้มชั่วคราว (5xx/เครือข่าย): ปลดบันทึกเพื่อให้รอบถัดไปลองใหม่ ได้ส่งภายในหน้าต่าง', async () => {
  const w = world({ items: [item()], subs: [sub()] }); const sent = []; let first = true;
  const flaky = async (s, p) => { if (first) { first = false; return { status: 503 }; } sent.push(1); return { status: 201 }; };
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: flaky });
  await S.runScheduler(env(w), th('2026-10-14 09:01'), { send: flaky }); assert.equal(sent.length, 1);
});
await t('S8 subscription หมดอายุ (404/410): ลบแถวนั้นทิ้ง และไม่ลองซ้ำ', async () => {
  for (const code of [404, 410]) {
    const w = world({ items: [item()], subs: [sub()] }); const sent = [];
    await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: async () => ({ status: code }) });
    assert.deepEqual(w.st.deleted, ['https://fcm.googleapis.com/fcm/send/a|u1'], 'สถานะ ' + code); assert.equal(w.st.subs.length, 0);
  }
});
await t('S9 เครื่องหนึ่งเสีย อีกเครื่องยังได้รับ (ผู้ใช้ 2 เครื่อง)', async () => {
  const w = world({ items: [item()], subs: [sub({ id: 1, endpoint: 'https://fcm.googleapis.com/fcm/send/dead' }), sub({ id: 2, endpoint: 'https://fcm.googleapis.com/fcm/send/live' })] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: async (s, p) => { if (s.endpoint.endsWith('dead')) return { status: 410 }; sent.push(s.endpoint); return { status: 201 }; } });
  assert.deepEqual(sent, ['https://fcm.googleapis.com/fcm/send/live']); assert.equal(w.st.subs.length, 1);
});
await t('S10 ไม่ข้ามผู้ใช้: รายการของ u1 ส่งถึงเครื่องของ u1 เท่านั้น ไม่ถึงของ u2', async () => {
  const w = world({ items: [item({ user_id: 'u1' })], subs: [sub({ user_id: 'u1', endpoint: 'https://fcm.googleapis.com/fcm/send/u1dev' }), sub({ id: 2, user_id: 'u2', endpoint: 'https://fcm.googleapis.com/fcm/send/u2dev' })] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  assert.deepEqual(sent.map((x) => x.to), ['https://fcm.googleapis.com/fcm/send/u1dev']);
});
await t('S11 ผู้ใช้ที่ไม่มี subscription ไม่ถูกประมวลผล (ไม่อ่านรายการของเขา)', async () => {
  const w = world({ items: [item({ user_id: 'nosub' })], subs: [sub({ user_id: 'u1' })] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  assert.equal(sent.length, 0); assert.ok(!w.st.calls.some((c) => c.includes('user_id=eq.nosub') || c.includes('nosub')), 'อ่านข้อมูลผู้ใช้ที่ไม่มี subscription');
});
await t('S12 แถว subscription ที่ user_id เป็น null (เครื่องจาก PoC) ไม่ถูกส่ง ไม่ถูกลบ', async () => {
  const w = world({ items: [item({ user_id: 'u1' })], subs: [sub({ id: 9, user_id: null, endpoint: 'https://fcm.googleapis.com/fcm/send/poc' })] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) }); assert.equal(sent.length, 0); assert.equal(w.st.subs.length, 1);
});
await t('S13 เพดาน 2 ต่อรอบ (วัดจริงบน Cloudflare: ส่ง 5 ครั้ง = CPU 16.4 ms เกินเพดาน 10 ms; ~3 ms ต่อการส่ง): 5 รายการถึงเวลา รอบนี้ส่ง 2 ที่เหลือรอบถัดไป รวมครบ 5 ไม่ซ้ำ', async () => {
  const items = Array.from({ length: 5 }, (_, i) => item({ id: 100 + i, title: 'งาน' + i }));
  const w = world({ items, subs: [sub()] }); const sent = [];
  const r1 = await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  assert.equal(r1.sent, 2); assert.equal(sent.length, 2);
  await S.runScheduler(env(w), th('2026-10-14 09:01'), { send: okSend(sent) }); assert.equal(sent.length, 4);
  await S.runScheduler(env(w), th('2026-10-14 09:02'), { send: okSend(sent) });
  assert.equal(sent.length, 5); assert.equal(new Set(sent.map((x) => x.payload.tag)).size, 5, 'ส่งซ้ำ');
});
await t('S13b ค่าคงที่เพดานต้องไม่เกิน 2 (งบ CPU ของแผนฟรี) และรอบที่ 5 ยังอยู่ในหน้าต่างเตือน', async () => {
  assert.ok(S.MAX_SENDS_PER_RUN <= 2, 'เพดาน ' + S.MAX_SENDS_PER_RUN);
  const R = await import(pathToFileURL('/tmp/notify-rem-bundle.mjs').href).catch(() => null);
  if (R) assert.ok(Math.ceil(5 / S.MAX_SENDS_PER_RUN) <= R.WINDOW_MIN, 'รอบสุดท้ายหลุดหน้าต่าง');
});
await t('S14 รายการที่ลบแล้ว/แก้เวลาแล้วไม่ส่งด้วยเวลาเก่า (อ่านรายการสดทุกรอบ)', async () => {
  const w = world({ items: [item({ time: '09:00' })], subs: [sub()] }); const sent = [];
  w.st.items = [item({ time: '10:30' })];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) }); assert.equal(sent.length, 0, 'เวลาเก่า');
  w.st.items = []; await S.runScheduler(env(w), th('2026-10-14 10:30'), { send: okSend(sent) }); assert.equal(sent.length, 0, 'ลบแล้ว');
});
await t('S15 payload: มีเฉพาะชื่อรายการ ไม่รั่ว id ผู้ใช้/อีเมล/endpoint/กุญแจ', async () => {
  const w = world({ items: [item({ title: 'ประชุมทีม' })], subs: [sub()] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  const p = JSON.stringify(sent[0].payload); assert.ok(p.includes('ประชุมทีม')); assert.ok(!/u1|fcm\.googleapis|"P"|"A"|privateKey|svc/.test(p), p);
});
await t('S16 ผู้ใช้เปิดสิทธิ์ซ่อนชื่อ: ส่งข้อความกลาง ไม่ใส่ชื่อรายการ (settings.hideTitle)', async () => {
  const w = world({ items: [item({ title: 'ความลับ' })], subs: [sub({ hide_title: true })] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) }); assert.ok(!JSON.stringify(sent[0].payload).includes('ความลับ'));
});
await t('S17 ผู้ใช้เดียวมีหลายรายการและหลายเครื่อง: ครบทุกคู่ (รายการ x เครื่อง) คู่ละ 1 ครั้ง ไม่ตกหล่นไม่ซ้ำ (ข้ามหลายรอบเพราะเพดาน 2 ต่อรอบ)', async () => {
  const w = world({ items: [item({ id: 1 }), item({ id: 2, title: 'อีกงาน' })], subs: [sub({ id: 1, endpoint: 'https://fcm.googleapis.com/fcm/send/d1' }), sub({ id: 2, endpoint: 'https://fcm.googleapis.com/fcm/send/d2' })] }); const sent = [];
  const perRun = [];
  for (const mm of ['09:00', '09:01', '09:02']) { const before = sent.length; await S.runScheduler(env(w), th('2026-10-14 ' + mm), { send: okSend(sent) }); perRun.push(sent.length - before); }
  assert.ok(perRun.every((n) => n <= S.MAX_SENDS_PER_RUN), 'เกินเพดานต่อรอบ: ' + perRun);
  const pairs = sent.map((x) => x.payload.tag + '>' + x.to);
  assert.equal(pairs.length, 4, 'ส่ง ' + pairs.length + ' รอบละ ' + perRun);
  assert.equal(new Set(pairs).size, 4, 'ส่งซ้ำคู่เดิม: ' + pairs.join(' , '));
  assert.deepEqual([...new Set(sent.map((x) => x.to))].sort(), ['https://fcm.googleapis.com/fcm/send/d1', 'https://fcm.googleapis.com/fcm/send/d2']);
});
await t('S18 ข้อมูลพัง: รายการ rem=null / ผู้ใช้หนึ่งอ่านล้ม ไม่ทำให้ผู้ใช้อื่นไม่ได้รับ', async () => {
  const w = world({ items: [item({ id: 1, user_id: 'bad', rem: null }), item({ id: 2, user_id: 'u1' })], subs: [sub({ user_id: 'bad', endpoint: 'https://fcm.googleapis.com/fcm/send/bad' }), sub({ id: 2, user_id: 'u1' })] }); const sent = [];
  const r = await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) }); assert.equal(sent.length, 1); assert.equal(r.errors, 0);
});
await t('S19 ไม่มี VAPID/ฐานข้อมูลล่ม: คืนผลแบบไม่ throw ไม่ส่ง (cron ต้องไม่ล้มทั้งงาน)', async () => {
  const w = world({ items: [item()], subs: [sub()] }); const e = env(w); delete e.VAPID_KEYS_JSON; const sent = [];
  const r = await S.runScheduler(e, th('2026-10-14 09:00'), { send: okSend(sent) }); assert.equal(sent.length, 0); assert.ok(r.skipped);
});
await t('S20 ชั้นป้องกันที่สอง: ฐานข้อมูลคืนรายการของผู้ใช้อื่นปนมา -> ไม่ส่งรายการของคนอื่นถึงเครื่องเรา', async () => {
  const w = world({ leaky: true, items: [item({ id: 1, user_id: 'u1', title: 'ของเรา' }), item({ id: 2, user_id: 'victim', title: 'ความลับของคนอื่น' })], subs: [sub({ user_id: 'u1' })] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  assert.equal(sent.length, 1); assert.ok(!JSON.stringify(sent).includes('ความลับของคนอื่น'), 'รั่วข้ามผู้ใช้');
});
await t('S21 ผู้ใช้หนึ่งอ่านรายการล้ม (ฐานข้อมูลตอบ 500) -> ผู้ใช้อื่นยังได้รับ และรอบไม่ throw', async () => {
  const w = world({ failUser: 'bad', items: [item({ id: 1, user_id: 'bad' }), item({ id: 2, user_id: 'u1' })], subs: [sub({ id: 1, user_id: 'bad', endpoint: 'https://fcm.googleapis.com/fcm/send/bad' }), sub({ id: 2, user_id: 'u1' })] }); const sent = [];
  const r = await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  assert.equal(sent.length, 1); assert.ok(r.errors >= 1);
});
await t('S22 ตัวส่ง throw (เครือข่ายล่ม) กับผู้ใช้หนึ่ง -> ผู้ใช้อื่นยังได้รับ และคืนการจองเพื่อลองใหม่', async () => {
  const w = world({ items: [item({ id: 1, user_id: 'a' }), item({ id: 2, user_id: 'b' })], subs: [sub({ id: 1, user_id: 'a', endpoint: 'https://fcm.googleapis.com/fcm/send/a' }), sub({ id: 2, user_id: 'b', endpoint: 'https://fcm.googleapis.com/fcm/send/b' })] }); const sent = [];
  const send = async (s) => { if (s.user_id === 'a') throw new Error('network'); sent.push(s.user_id); return { status: 201 }; };
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send }); assert.deepEqual(sent, ['b']);
  assert.ok(!w.st.logs.some((x) => x.user_id === 'a'), 'ต้องคืนการจองของ a');
});
await t('S23 ลบเครื่องหมดอายุ: ลบเฉพาะของผู้ใช้ที่ส่ง ไม่ลบเครื่องของคนอื่นที่ endpoint ซ้ำชื่อ', async () => {
  const w = world({ items: [item({ user_id: 'u1' })], subs: [sub({ id: 1, user_id: 'u1', endpoint: 'https://fcm.googleapis.com/fcm/send/dup' }), sub({ id: 2, user_id: 'other', endpoint: 'https://fcm.googleapis.com/fcm/send/dup' })] });
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: async () => ({ status: 410 }) });
  assert.ok(w.st.subs.some((s) => s.user_id === 'other'), 'ลบของคนอื่นไปด้วย');
});
await t('S24 ส่ง 4xx อื่น (เช่น 400/401/403) = ล้มถาวร: ไม่ลองซ้ำ ไม่ลบเครื่อง', async () => {
  for (const code of [400, 401, 403]) {
    const w = world({ items: [item()], subs: [sub()] }); let calls = 0;
    const send = async () => { calls++; return { status: code }; };
    await S.runScheduler(env(w), th('2026-10-14 09:00'), { send }); await S.runScheduler(env(w), th('2026-10-14 09:01'), { send });
    assert.equal(calls, 1, 'ลองซ้ำที่ ' + code); assert.equal(w.st.subs.length, 1, 'ลบเครื่องที่ ' + code);
  }
});
await t('S25 fetch ของผู้ใช้หนึ่ง throw (เครือข่ายล่ม) หรือ JSON พัง -> ผู้ใช้อื่นยังได้รับ รอบไม่ throw', async () => {
  for (const mode of ['throwUser', 'badJsonUser']) {
    const w = world({ [mode]: 'bad', items: [item({ id: 1, user_id: 'bad' }), item({ id: 2, user_id: 'u1' })], subs: [sub({ id: 1, user_id: 'bad', endpoint: 'https://fcm.googleapis.com/fcm/send/bad' }), sub({ id: 2, user_id: 'u1' })] }); const sent = [];
    const r = await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
    assert.equal(sent.length, 1, mode + ' ส่ง ' + sent.length); assert.ok(r.errors >= 1, mode);
  }
});
await t('S26 แถว subscription ที่ user_id เป็น null: ไม่มีการอ่านข้อมูลของ null เลย (ไม่ยิง items?user_id=eq.null)', async () => {
  const w = world({ items: [item()], subs: [sub({ id: 1, user_id: 'u1' }), sub({ id: 9, user_id: null, endpoint: 'https://fcm.googleapis.com/fcm/send/poc' })] }); const sent = [];
  await S.runScheduler(env(w), th('2026-10-14 09:00'), { send: okSend(sent) });
  assert.ok(!w.st.calls.some((c) => /user_id=eq\.(null|undefined)?(&|$)/.test(c) || c.includes('user_id=eq.null')), 'อ่านข้อมูลของ null: ' + w.st.calls.filter((c) => c.includes('items')).join(' | '));
});
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

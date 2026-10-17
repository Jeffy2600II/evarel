/* ตัวทดสอบ race ของ liveRefresh แบบกำหนดผลได้ (ไม่พึ่งจังหวะ): GET /items ถูกหน่วงและคืนข้อมูลเก่า (ก่อนกด)
   ระหว่างที่ GET ค้าง ผู้ใช้กดจริงหนึ่งครั้งและ PUT เสร็จ แล้วค่อยปล่อย GET เก่า → ค่าที่กดต้องไม่ย้อนกลับ
   บั๊กเดิม: PENDING กลับเป็น 0 ก่อน GET ตอบ การ์ดจึงผ่านและข้อมูลเก่าทับ | ใช้: node tests/live_race.test.mjs (พอร์ต 8779 ต้องตอบ 200) exit 1 ถ้าค่าย้อนกลับ */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); const user = await makeTestUser('race'); let release = null; const res = [], t = (name, ok, detail = '') => res.push({ name, ok: !!ok, detail });
try {
  const mk = (id, title, extra) => ({ id, type: 'habit', title, subject: '', time: '', timeEnd: '', track: 'count', target: 5, unitName: 'ข้อ', repeat: { unit: 'day', every: 1, days: [] }, start: '2026-10-01', end: '', skip: {}, rem: [], log: {}, ...extra });
  await seedItems(user.session, [mk(9201, 'นับแข่งกัน')]);
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3800);
  const today = await p.evaluate(() => { const n = new Date(), z = x => String(x).padStart(2, '0'); return `${n.getFullYear()}-${z(n.getMonth() + 1)}-${z(n.getDate())}` });
  const val = () => p.evaluate(([id, d]) => (S.items.find(i => i.id === id)?.log?.[d]) ?? 0, [9201, today]);
  t('เริ่มที่ 0', (await val()) === 0);
  // ดักเฉพาะ GET /items: จับไว้ (ค้าง) ด้วยข้อมูลเก่า แล้วค่อยปล่อยเอง
  const gate = new Promise(r => { release = r }); let held = 0; let staleBody = null;
  await p.route(/\/items(\?.*)?$/, async route => { const rq = route.request(); if (rq.method() !== 'GET') return route.continue(); held++; try { const resp = await route.fetch(); staleBody = await resp.text(); await gate; await route.fulfill({ response: resp, body: staleBody }) } catch (e) { /* ปิดเบราว์เซอร์ระหว่างค้าง ไม่ใช่ความผิดของแอป */ } });
  // กระตุ้นให้ liveRefresh เริ่มดึง (GET จะค้างอยู่ที่ gate พร้อมข้อมูลเก่า = log ว่าง)
  // liveBusy/PENDING เป็น let ในโมดูล อ่านจาก window ไม่ได้ผล (คัดลอกค่าตอนโหลด) จึงวัดจากผลจริงเท่านั้น: ยิง liveRefresh ซ้ำจนกว่า GET จะถูกจับไว้ (ถ้ามี refresh อัตโนมัติถือ liveBusy อยู่ การเรียกจะถูกข้ามเงียบ)
  for (let k = 0; k < 24 && held < 1; k++) { await p.evaluate(() => { window.liveRefresh() }); await p.waitForTimeout(250) }
  t('GET ถูกจับค้างไว้แล้ว', held >= 1, 'held=' + held);
  // ผู้ใช้กดระหว่าง GET ค้าง: PUT ไปเซิร์ฟเวอร์จริงและ PENDING กลับเป็น 0
  await p.click('[data-act="inc"][data-id="9201"]'); await p.waitForFunction(([id, d]) => (S.items.find(i => i.id === id)?.log?.[d] ?? 0) === 1, [9201, today], { timeout: 6000 }).catch(() => null);
  await p.waitForFunction(() => (window.SYNC ? window.SYNC.pending === 0 : true), null, { timeout: 8000 }).catch(() => null);
  t('กดแล้ว log เป็น 1 และ PENDING กลับเป็น 0 ก่อนปล่อย GET เก่า', (await val()) === 1 && (await p.evaluate(() => (window.SYNC ? window.SYNC.pending : 0))) === 0, JSON.stringify({ v: await val(), pending: await p.evaluate(() => (window.SYNC ? window.SYNC.pending : 0)) }));
  release(); await p.waitForTimeout(1200);
  t('หลังปล่อย GET ข้อมูลเก่า: ค่าที่กดต้องไม่ย้อนกลับเป็น 0', (await val()) === 1, 'val=' + (await val()));
  t('ไม่มี pageerror', errs.length === 0, errs.join(' | '));
} finally { try { release && release() } catch (e) {} await new Promise(r => setTimeout(r, 300)); await b.close(); console.log('cleanup', await user.cleanup()); }
for (const r of res) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' | ' + r.detail)); const bad = res.filter(r => !r.ok); console.log(`สรุป: ผ่าน ${res.length - bad.length}/${res.length}`); process.exit(bad.length ? 1 : 0);

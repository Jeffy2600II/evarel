/* ทดสอบการ์ดอนิเมชั่นในหน้าตั้งค่า (v24 ui/perf): เลือก auto/full/lite แล้ว data-perf เปลี่ยนทันที จำค่าข้ามการโหลดใหม่ และ "อัตโนมัติ" ล้างผลวัดเฟรมเดิม
   ค่าคาดหวังมาจากสเปกของ v24 (ACTIONS.perf) ไม่ได้คำนวณจากโค้ดแอป
   รัน: node tests/perf_setting.test.mjs  (ต้องมีเซิร์ฟเวอร์ 8779 เสิร์ฟ app/web) */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const user = await makeTestUser('perfset');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light', viewport: { width: 412, height: 915 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2600);
  for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.settings)) break; await p.waitForTimeout(200); }
  await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(900);
  const card = async () => p.evaluate(() => { const pg = document.getElementById('page'); const sec = [...pg.querySelectorAll('section.ev-card')].find(s => s.querySelector('b')?.textContent === 'อนิเมชั่น'); if (!sec) return null; return { sub: sec.querySelector('.ev-sub')?.textContent, btns: [...sec.querySelectorAll('button')].map(x => x.dataset.id + ':' + x.getAttribute('aria-pressed')) }; });
  const c0 = await card();
  ok('มีการ์ดอนิเมชั่นในหน้าตั้งค่า', !!c0);
  ok('มีข้อความอธิบาย', c0?.sub === 'อัตโนมัติจะลดเอฟเฟกต์เองเมื่อเครื่องไม่ลื่น', c0?.sub);
  ok('มีสามตัวเลือก auto/full/lite', c0?.btns.map(x => x.split(':')[0]).join(',') === 'auto,full,lite', c0?.btns.join(' '));
  ok('ค่าเริ่มต้นคืออัตโนมัติ', c0?.btns[0] === 'auto:true', c0?.btns.join(' '));
  const click = async (id) => { await p.click(`#page [data-act="perf"][data-id="${id}"]`); await p.waitForTimeout(500); };
  await click('full'); ok('เลือกเต็มรูปแบบ -> data-perf=full', await p.evaluate(() => document.documentElement.dataset.perf) === 'full');
  ok('การ์ดอัปเดตสถานะที่เลือก (full)', (await card())?.btns[1] === 'full:true', (await card())?.btns.join(' '));
  await click('lite'); ok('เลือกประหยัดเครื่อง -> data-perf=lite', await p.evaluate(() => document.documentElement.dataset.perf) === 'lite');
  ok('บันทึกค่าลง localStorage', await p.evaluate(() => localStorage.getItem('evarel-perf-pref')) === 'lite');
  await p.evaluate(() => localStorage.setItem('evarel-perf-auto', 'lite'));
  await click('auto'); ok('เลือกอัตโนมัติล้างผลวัดเฟรมเดิม', await p.evaluate(() => localStorage.getItem('evarel-perf-auto')) === null);
  await click('full');
  await p.reload(); await p.waitForTimeout(2200);
  ok('จำค่าข้ามการโหลดใหม่ (full)', await p.evaluate(() => document.documentElement.dataset.perf) === 'full');
  ok('ไม่มี pageerror', errs.length === 0, errs.join('|').slice(0, 200));
} finally { await b.close(); }
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

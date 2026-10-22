/* เกตพฤติกรรมซ้อนหน้า (behavior_equiv): พิสูจน์ว่าแอปเปิดหน้าเป็นสแต็กซ้อนกันได้แบบเดโม
   เดโม v24: AI → settings ซ้อน 2 ชั้น, ย้อนกลับปิดทีละชั้น, ไม่มี pageerror
   วิธีรัน: node tests/behavior_equiv.mjs  (สภาพแวดล้อมเหมือน _parity_bands: เซิร์ฟเวอร์ 8779 + API forge จริง)
   ผ่าน = ทุก PASS ... errs demo 0 app 0 */
import { chromium } from '/tmp/evarel-repo/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from '/tmp/evarel-repo/tests/live_user.mjs';

const WEB_DIR = process.env.EVAREL_WEB_DIR || '/tmp/evarel-repo/build/web';
let fails = 0, errsDemo = 0, errsApp = 0;
const check = (ok, label) => { console.log((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) fails++; };

const snap = () => {
  const pages = [...document.querySelectorAll('.ev-page')];
  const open = pages.filter(e => e.dataset.open === 'true' && !e.hidden);
  return { open: open.length, text: open.map(e => (e.innerText || '').trim().slice(0, 10)) };
};

/* --- เดโม --- */
{
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 50)));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/, r => r.fulfill({ contentType: 'application/javascript', body: readFileSync('/tmp/evarel-repo/build/web/vendor/fullcalendar.min.js', 'utf8') }));
  await p.addInitScript(() => { Math.random = () => 0.5; const D = Date, fixed = new D('2026-10-09T10:00:00+07:00'); D.now = () => fixed.getTime(); });
  await p.goto('http://localhost:8779/design/Evarel%20v24.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const u = { id: 'u_test', name: 'Nontakorn', email: 'demo.u@evarel.app' }; localStorage.setItem('ev:user', JSON.stringify(u)); localStorage.setItem('ev:token', 't'); });
  await p.reload(); await p.waitForTimeout(2600);
  await p.evaluate(() => openAI()); await p.waitForTimeout(1000);
  await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(1000);
  const set2 = await p.evaluate(snap);
  await p.evaluate(() => history.back()); await p.waitForTimeout(1000);
  const back1 = await p.evaluate(snap);
  errsDemo = errs.length;
  check(set2.open === 2, `demo stack2 open=${set2.open}`);
  check(back1.open === 1, `demo backPopsOne open=${back1.open}`);
  await b.close();
}

/* --- แอป (บิลด์ที่เสิร์ฟจริง) --- */
{
  process.env.EVAREL_WEB_DIR = WEB_DIR;
  const b = await chromium.launch();
  const user = await makeTestUser('behav');
  const ctx = await openAsUser(b, user);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 50)));
  await p.addInitScript(() => { Math.random = () => 0.5; const D = Date, fixed = new D('2026-10-09T10:00:00+07:00'); D.now = () => fixed.getTime(); });
  await p.goto(APP_ORIGIN + '/index.html');
  await p.waitForTimeout(3000);
  await p.evaluate(() => openAI()); await p.waitForTimeout(1000);
  await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(1000);
  const set2 = await p.evaluate(snap);
  await p.evaluate(() => history.back()); await p.waitForTimeout(1000);
  const back1 = await p.evaluate(snap);
  errsApp = errs.length;
  check(set2.open === 2, `app stack2 open=${set2.open}`);
  check(back1.open === 1, `app backPopsOne open=${back1.open}`);
  check(errs.length === 0, `app ไม่มี pageerror (${errs.length})`);
  await b.close();
}

console.log(`BEHAVIOR-EQUIV สรุป fails=${fails} | errs demo ${errsDemo} app ${errsApp}`);
process.exit(fails || errsDemo || errsApp ? 1 : 0);

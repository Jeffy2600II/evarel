/* ทดสอบพฤติกรรมท่าทางนิ้วของ sheet ด้วย touch events จริง เทียบเดโมจริง กับแอปจริง ด้วยสถานการณ์ชุดเดียวกัน
   กฎจาก v24: ปิดเมื่อลากเกิน 35% ของความสูง หรือเร็วเกิน .55 px/ms | ขยับต่ำกว่า SLOP 8px ไม่นับ | แนวนอนมากกว่าแนวตั้งไม่นับ
   กฎเลื่อนซ้อน: ถ้าเนื้อหาข้างในยังเลื่อนกลับได้ตอนเริ่มแตะ จะเลื่อนเนื้อหาและไม่ปิด | ลากที่ด้ามจับ (.ev-grab,h2) ปิดได้เสมอ
   รัน: node tests/gesture_equiv.test.mjs  (ต้องมีเซิร์ฟเวอร์ 8779 เสิร์ฟ app/web) ผล: exit 1 ถ้ามีสถานการณ์ใดสองฝั่งไม่ตรงกัน */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const DEMO = 'file:///tmp/evarel-repo/design/master-demo-v24.html';
const BODY = '<div id="gbody" style="height:1400px">' + Array.from({ length: 40 }, (_, i) => `<p>บรรทัด ${i}</p>`).join('') + '</div>';

/* ส่ง touch จริงผ่าน CDP: เริ่มที่ (x,y0) ลากไปทีละขั้นถึง y1 ใช้เวลา ms แล้วปล่อย */
async function swipe(p, x, y0, y1, ms, steps = 12) {
  const cdp = await p.context().newCDPSession(p);
  const t = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await t('touchStart', y0);
  for (let i = 1; i <= steps; i++) { await p.waitForTimeout(ms / steps); await t('touchMove', y0 + (y1 - y0) * i / steps); }
  await t('touchEnd', y1); await cdp.detach();
}
const openBoth = async (p, isApp) => {
  await p.evaluate((body) => { window.openSheet('ทดสอบ', body); }, BODY);
  await p.waitForTimeout(700);
};
const state = (p) => p.evaluate(() => { const s = document.getElementById('sheet'); const r = s.getBoundingClientRect(); return { open: s.dataset.open, top: Math.round(r.top), h: Math.round(r.height), sc: document.getElementById('sheetBody')?.scrollTop ?? -1 }; });

async function scenarios(p, label) {
  const out = {};
  const run = async (name, fn) => { await openBoth(p); const before = await state(p); await fn(before); await p.waitForTimeout(700); const after = await state(p); out[name] = after.open; await p.evaluate(() => { try { window.closeTop?.() } catch (e) { } }); await p.waitForTimeout(600); return { before, after }; };
  const vw = p.viewportSize(); const x = Math.round(vw.width / 2);
  /* 1 ลากที่ด้ามจับไกลเกิน 35% ช้าๆ -> ปิด */
  await run('ด้ามจับ ลากไกล 50% ช้า', async (b0) => swipe(p, x, b0.top + 12, b0.top + 12 + Math.round(b0.h * .5), 700));
  /* 2 ลากที่ด้ามจับสั้น 10% ช้า -> ไม่ปิด (เด้งกลับ) */
  await run('ด้ามจับ ลากสั้น 10% ช้า', async (b0) => swipe(p, x, b0.top + 12, b0.top + 12 + Math.round(b0.h * .1), 700));
  /* 3 ปัดเร็วชัดเจน (fling) ความเร็วจริง ~2 px/ms เกินเกณฑ์ .55 หลายเท่า ไม่อยู่ติดขอบเกณฑ์ -> ปิด (ค่าเวลาที่สั่งสั้นมากเพราะ CDP ช้ากว่าที่สั่ง) */
  await run('ด้ามจับ ปัดเร็วชัดเจน', async (b0) => swipe(p, x, b0.top + 12, b0.top + 12 + 230, 20, 4));
  /* 3b ช้ามากและสั้น (~0.05 px/ms ต่ำกว่าเกณฑ์หลายเท่า) -> ไม่ปิด */
  await run('ด้ามจับ ช้ามากและสั้น', async (b0) => swipe(p, x, b0.top + 12, b0.top + 12 + 90, 1800, 12));
  /* 4 ขยับน้อยกว่า SLOP -> ไม่ปิด */
  await run('ขยับ 5px ไม่ถึง SLOP', async (b0) => swipe(p, x, b0.top + 12, b0.top + 17, 100, 3));
  /* 5 ลากแนวนอนเด่น -> ไม่ปิด */
  await run('แนวนอนเด่น', async (b0) => { const cdp = await p.context().newCDPSession(p); const t = (type, xx, yy) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: xx, y: yy }] }); await t('touchStart', x, b0.top + 12); for (let i = 1; i <= 8; i++) { await p.waitForTimeout(40); await t('touchMove', x + 20 * i, b0.top + 12 + 6 * i) } await t('touchEnd', x, 0); await cdp.detach(); });
  /* 6 เนื้อหาเลื่อนอยู่ไม่ที่ขอบบน แล้วลากลงในเนื้อหา -> ไม่ปิด (กฎเลื่อนซ้อน) */
  await run('เนื้อหาเลื่อนลงไปแล้ว ลากลงในเนื้อหา', async (b0) => { await p.evaluate(() => { const e = document.getElementById('sheetBody') || document.getElementById('gbody')?.parentElement; if (e) e.scrollTop = 200; }); await p.waitForTimeout(100); await swipe(p, x, b0.top + Math.round(b0.h * .5), b0.top + Math.round(b0.h * .5) + Math.round(b0.h * .45), 600); });
  /* 7 เนื้อหาอยู่ขอบบน ลากลงในเนื้อหาไกล -> ปิดได้ */
  await run('เนื้อหาอยู่ขอบบน ลากลงไกล', async (b0) => swipe(p, x, b0.top + Math.round(b0.h * .4), b0.top + Math.round(b0.h * .4) + Math.round(b0.h * .55), 700));
  return out;
}

try {
  const mk = { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, colorScheme: 'light', timezoneId: 'Asia/Bangkok' };
  /* ฝั่งเดโม */
  const cd = await b.newContext(mk); const pd = await cd.newPage(); const errD = []; pd.on('pageerror', e => errD.push(String(e)));
  await pd.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await pd.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('/tmp/evarel-repo/app/web/vendor/fullcalendar.min.js') }));
  await pd.goto(DEMO); await pd.waitForTimeout(500);
  await pd.evaluate(() => { const u = { id: 'u_test', name: 'Nontakorn', email: 'demo.user@gmail.com', provider: 'google' }; localStorage.setItem('evarel-demo-users', JSON.stringify([u])); localStorage.setItem('evarel-demo-session', 'u_test'); });
  await pd.reload(); await pd.waitForTimeout(1800);
  const D = await scenarios(pd, 'demo');
  /* ฝั่งแอปจริง */
  const user = await makeTestUser('gesture');
  const ca = await openAsUser(b, user, { colorScheme: 'light', viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }); const pa = await ca.newPage(); const errA = []; pa.on('pageerror', e => errA.push(String(e)));
  await pa.goto(APP_ORIGIN + '/index.html'); await pa.waitForTimeout(2600);
  const A = await scenarios(pa, 'app');
  for (const k of Object.keys(D)) ok(`${k}: เดโม=${D[k]} แอป=${A[k]}`, D[k] === A[k]);
  ok('เดโมไม่มี pageerror', errD.length === 0, errD.join('|').slice(0, 160));
  ok('แอปไม่มี pageerror', errA.length === 0, errA.join('|').slice(0, 160));
} finally { await b.close(); }
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

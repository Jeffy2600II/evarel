// ประตู console (evarel-ts-1c): เก็บ console.warn/error + pageerror ทั้งหมดของ "ต้นฉบับ" กับ "ใหม่" ในลำดับการใช้งานเดียวกัน แล้วเทียบแบบเซตเรียงลำดับ
// เหตุผล: โค้ดเดิมกลืน error ด้วย try/catch แล้ว console.warn; ตัวแปรเปล่าที่ตกค้างจะโผล่เป็นข้อความ warn ใหม่ที่ต้นฉบับไม่มี
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
/* ใช้: node ts1c_console_gate.mjs <โฟลเดอร์ต้นฉบับ> <โฟลเดอร์ใหม่>  (เสิร์ฟทีละฉบับใต้โดเมน forge ด้วยผู้ใช้จริงคนเดียวกัน) */
const [,, A, B] = process.argv;
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
async function run(dir, user) {
  const ctx = await openAsUser(b, user, { serviceWorkers: 'block' }); const p = await ctx.newPage(); const log = [];
  p.on('pageerror', e => log.push('pageerror: ' + e.message.slice(0, 120)));
  p.on('console', m => { if (['warning', 'error'].includes(m.type())) log.push(m.type() + ': ' + m.text().replace(/localhost:\d+/g, 'H').slice(0, 140)); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js') }));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3500);
  // เดินทางใช้งานทุกส่วนที่แตะตัวแปรร่วม: แท็บ, ปุ่ม +, sheet, AI, ตั้งค่า, รายละเอียด, ตัวจับเวลา
  const tryC = async (sel) => { try { await p.click(sel, { timeout: 1500 }); await p.waitForTimeout(350); } catch (e) { log.push('skip:' + sel); } };
  for (const h of ['#/all', '#/calendar', '#/stats', '#/today']) { await p.evaluate(x => { location.hash = x }, h); await p.waitForTimeout(450); }
  await tryC('[data-act="add"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await tryC('[data-act="ai"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await tryC('[data-act="settings"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => { location.hash = '#/all' }); await p.waitForTimeout(400);
  await tryC('.ev-row'); await p.waitForTimeout(500); await p.keyboard.press('Escape');
  await p.close(); await ctx.close(); return log;
}
let user = null, la = [], lb = [];
try {
  user = await makeTestUser('console'); await seedItems(user.session, SEED_ITEMS);
  process.env.EVAREL_WEB_DIR = A; la = await run(A, user);
  process.env.EVAREL_WEB_DIR = B; lb = await run(B, user);
} finally { try { await b.close(); } catch {} if (user) console.log('ลบผู้ใช้ทดสอบ ->', await user.cleanup()); }
const same = JSON.stringify(la) === JSON.stringify(lb);
console.log(same ? 'CONSOLE-GATE PASS' : 'CONSOLE-GATE FAIL', '| ต้นฉบับ', la.length, 'รายการ | ใหม่', lb.length, 'รายการ');
if (!same) { const sa = new Set(la), sb = new Set(lb); console.log(' มีเฉพาะใหม่:', [...sb].filter(x => !sa.has(x)).slice(0, 4)); console.log(' มีเฉพาะต้นฉบับ:', [...sa].filter(x => !sb.has(x)).slice(0, 4)); }
if (process.env.SHOW) console.log(JSON.stringify(la));
process.exit(same ? 0 : 1);

// ประตูลำดับโมดูล (evarel-ts-1b): 1) ลำดับ <script> ใน index.html ต้องตรง _order.json  2) โหลดแล้วต้องไม่มี console error/warn ชนิด ReferenceError
// เหตุผล: ชุด route/feature เดิมจับการสลับลำดับไม่ได้ เพราะโค้ดเดิมมี try/catch กลืน ReferenceError (พิสูจน์แล้ว 11 ต.ค. 2026)
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
/* ใช้: node ts1b_order_gate.mjs <appdir>  (อ่าน index.html/sw.js/_order.json จากโฟลเดอร์ แล้วเปิดแอปจริงผ่านผู้ใช้ API) */
const [,, DIR] = process.argv;
process.env.EVAREL_WEB_DIR = DIR;
const html = fs.readFileSync(DIR + '/index.html', 'utf8');
const got = [...html.matchAll(/<script (?:type="module" )?src="js\/m\/([^"]+)"/g)].map(m => m[1]);
const want = JSON.parse(fs.readFileSync(DIR + '/js/m/_order.json', 'utf8')).order.map(o => o.file);
const orderOk = JSON.stringify(got) === JSON.stringify(want);
// ลำดับรายการแคชใน sw.js ต้องตรง _order.json ด้วย (evarel-ts-1i): ไม่งั้นผู้ใช้ที่มีแคชเก่าโหลดไม่ครบหรือค้างไฟล์ชื่อเดิม
const swTxt = fs.readFileSync(DIR + '/sw.js', 'utf8'); const swGot = [...swTxt.matchAll(/'\.\/js\/m\/([^']+)'/g)].map(m => m[1]); const swOk = JSON.stringify(swGot) === JSON.stringify(want);
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
let user=null; const bad = [];
try {
user = await makeTestUser('order'); await seedItems(user.session, SEED_ITEMS);
const ctx = await openAsUser(b, user); const p = await ctx.newPage();
p.on('pageerror', e => bad.push('pageerror: ' + e.message.slice(0, 80)));
p.on('console', m => { if (/ReferenceError|is not defined|Cannot access .* before initialization/.test(m.text())) bad.push('console: ' + m.text().slice(0, 80)); });
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3500);
} finally { try { await b.close(); } catch {} if (user) { console.log('ลบผู้ใช้ทดสอบ ->', await user.cleanup()); } }
const ok = orderOk && swOk && bad.length === 0;
console.log((ok ? 'ORDER-GATE PASS' : 'ORDER-GATE FAIL'), '| ลำดับตรง', orderOk, '| sw.js ตรง', swOk, `(${got.length}/${want.length})`, '| error', bad.length, bad.slice(0, 2).join(' ; '));
process.exit(ok ? 0 : 1);

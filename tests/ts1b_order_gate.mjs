// ประตูลำดับโมดูล (evarel-ts-1b): 1) ลำดับ <script> ใน index.html ต้องตรง _order.json  2) โหลดแล้วต้องไม่มี console error/warn ชนิด ReferenceError
// เหตุผล: ชุด route/feature เดิมจับการสลับลำดับไม่ได้ เพราะโค้ดเดิมมี try/catch กลืน ReferenceError (พิสูจน์แล้ว 11 ต.ค. 2026)
import { chromium } from 'playwright'; import fs from 'fs';
const [,, URL_, DIR] = process.argv;
const html = await (await fetch(URL_)).text();
const got = [...html.matchAll(/<script src="js\/m\/([^"]+)"/g)].map(m => m[1]);
const want = JSON.parse(fs.readFileSync(DIR + '/js/m/_order.json', 'utf8')).order.map(o => o.file);
const orderOk = JSON.stringify(got) === JSON.stringify(want);
// ลำดับรายการแคชใน sw.js ต้องตรง _order.json ด้วย (evarel-ts-1i): ไม่งั้นผู้ใช้ที่มีแคชเก่าโหลดไม่ครบหรือค้างไฟล์ชื่อเดิม
const swTxt = fs.readFileSync(DIR + '/sw.js', 'utf8'); const swGot = [...swTxt.matchAll(/'\.\/js\/m\/([^']+)'/g)].map(m => m[1]); const swOk = JSON.stringify(swGot) === JSON.stringify(want);
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 412, height: 915 } }); const bad = [];
p.on('pageerror', e => bad.push('pageerror: ' + e.message.slice(0, 80)));
p.on('console', m => { if (/ReferenceError|is not defined|Cannot access .* before initialization/.test(m.text())) bad.push('console: ' + m.text().slice(0, 80)); });
await p.goto(URL_); await p.waitForTimeout(800); await p.evaluate(() => localStorage.clear());
await p.evaluate(() => { const u = { id: 'u_test', name: 'N', email: 'a@b.c', provider: 'google' }; localStorage.setItem('evarel-demo-users', JSON.stringify([u])); localStorage.setItem('evarel-demo-session', 'u_test'); });
await p.reload(); await p.waitForTimeout(2500); await b.close();
const ok = orderOk && swOk && bad.length === 0;
console.log((ok ? 'ORDER-GATE PASS' : 'ORDER-GATE FAIL'), '| ลำดับตรง', orderOk, '| sw.js ตรง', swOk, `(${got.length}/${want.length})`, '| error', bad.length, bad.slice(0, 2).join(' ; '));
process.exit(ok ? 0 : 1);

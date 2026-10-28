/* เทียบวงจรชีวิตของ CalendarLive (useEffect เรียก mountMain / cleanup เรียก destroyCal('main')) บน Chromium จริง
   ไม่ใช่เทียบ HTML: เป็นผลข้างเคียง จึงจดลำดับการเรียกของ mountMain/destroyCal ปลอมที่ใส่ใน window แล้วเทียบกับลำดับที่ต้องเป็น
   ครอบ: mount ปกติ, unmount เรียก destroyCal('main'), สลับซ้ำ 3 รอบ, mountMain ไม่ใช่ฟังก์ชัน (ข้ามเงียบ ไม่คืน cleanup), destroyCal หายก่อน cleanup (อ่านสดตอน cleanup ต้องไม่พัง)
   ไม่พึ่งเครือข่ายหรือบัญชีทดสอบ | ใช้: node tests/calendar_lifecycle_equiv.test.mjs   ผล: exit 1 ถ้ามีข้อใดไม่ตรง
   ตัวแปรสภาพแวดล้อม CAL_JS ชี้ไฟล์ calendar.js ที่จะทดสอบ (ใช้ฉีดความผิดพิสูจน์ว่าตัวเทียบจับได้) */
import fs from 'node:fs'; import { chromium } from 'playwright'; import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const rt = fs.readFileSync(root + '/app/web/js/react/runtime.js', 'utf8');
const cal = fs.readFileSync(process.env.CAL_JS || (root + '/app/web/js/react/calendar.js'), 'utf8');
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
let fails = 0; const t = (n, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${ok ? '' : extra}`); if (!ok) fails++; };
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
await p.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
await p.evaluate(`window.__NO_FLUSH = undefined; window.fcMainStub = 1;`);
await p.evaluate(rt); await p.evaluate(cal);
/* ตัวช่วยรันในหน้า: ตั้ง mountMain/destroyCal ตามโหมด เรียก mountAt แล้ว unmountOne คืนบันทึกลำดับ */
const run = (mode, cycles) => p.evaluate(({ mode, cycles }) => {
  const log = []; const W = window;
  if (mode === 'ok') { W.mountMain = () => log.push('mount'); W.destroyCal = (k) => log.push('destroy:' + k); }
  else if (mode === 'noMount') { delete W.mountMain; W.destroyCal = (k) => log.push('destroy:' + k); }
  else if (mode === 'destroyGone') { W.mountMain = () => log.push('mount'); W.destroyCal = (k) => log.push('destroy:' + k); }
  const host = document.getElementById('host');
  const props = { calSel: null, mode: 'month', calMode: 'month', cur: null };
  for (let i = 0; i < cycles; i++) {
    const el = document.createElement('main'); host.appendChild(el);
    let threw = null;
    try {
      W.EvarelMount.mountAt(el, 'calendar', props);
      if (mode === 'destroyGone') delete W.destroyCal; /* หายระหว่างทางก่อน cleanup: โค้ดต้องอ่านสดและไม่พัง */
      W.EvarelMount.unmountOne('calendar');
    } catch (e) { threw = String(e && e.message || e).slice(0, 100); }
    if (threw) log.push('THREW:' + threw);
    host.removeChild(el);
    if (mode === 'destroyGone') W.destroyCal = (k) => log.push('destroy:' + k);
  }
  return log;
}, { mode, cycles });
const J = JSON.stringify;
const a = await run('ok', 1);
t('mount ปกติ แล้ว unmount เรียก destroyCal(main)', J(a) === J(['mount', 'destroy:main']), J(a));
const c3 = await run('ok', 3);
t('สลับซ้ำ 3 รอบ ลำดับต้องเป็นคู่ mount/destroy ทุกรอบ', J(c3) === J(['mount', 'destroy:main', 'mount', 'destroy:main', 'mount', 'destroy:main']), J(c3));
const nm = await run('noMount', 1);
t('mountMain ไม่ใช่ฟังก์ชัน: ข้ามเงียบ ไม่ mount และไม่เรียก destroyCal', J(nm) === J([]), J(nm));
const dg = await run('destroyGone', 1);
t('destroyCal หายก่อน cleanup: อ่านสดตอน cleanup ไม่พัง ไม่เรียก', J(dg) === J(['mount']), J(dg));
t('ไม่มี pageerror', errs.length === 0, J(errs));
await b.close();
console.log(`\nผล: ${5 - fails} ผ่าน ${fails} ตก`);
process.exit(fails ? 1 : 0);

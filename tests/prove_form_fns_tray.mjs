// พิสูจน์ F3.3-g8: ฟอร์มที่รับ TYPE_INFO/remSum/repSum/rangeSum/notifyIssue ผ่านถาด เรนเดอร์ HTML เท่าไฟล์เดิมทุกไบต์
// ใช้: node tests/prove_form_fns_tray.mjs <form.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/form.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('formfns'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const W = window, r = {}, day = k => W.ymd(W.addDays(new Date(), k));
    delete W.EvarelPages.formBody; delete W.EvarelPages.typeBody; (0, eval)(code);
    const put = (k, fn) => { try { r[k] = fn(); } catch (e) { r[k] = 'ERR:' + e.message; } };
    put('เลือกประเภท', () => W.EvarelPages.typeBody());
    const variants = {
      'habit รายวัน เตือนตรงเวลา ไม่มีเวลา (มีข้อความเตือน)': { type: 'habit', unit: 'day', every: 1, rem: [{ k: 'before', m: 0 }], time: '' },
      'habit รายวัน เตือนตรงเวลา มีเวลา (ไม่มีข้อความเตือน)': { type: 'habit', unit: 'day', every: 1, rem: [{ k: 'before', m: 0 }], time: '07:30' },
      'habit ปิดเตือน': { type: 'habit', unit: 'day', every: 2, rem: [], time: '' },
      'habit รายสัปดาห์ เลือกวัน เตือน 3 อัน': { type: 'habit', unit: 'week', every: 1, days: [1, 3, 5], rem: [{ k: 'before', m: 10 }, { k: 'before', m: 60 }, { k: 'at', t: '08:00' }], time: '06:00' },
      'habit รายเดือน มีวันสิ้นสุด': { type: 'habit', unit: 'month', every: 3, rem: [{ k: 'before', m: 1440 }], time: '09:00', endMode: 'date', end: day(200) },
      'task ไม่ซ้ำ': { type: 'task', unit: 'none', every: 1, rem: [{ k: 'before', m: 30 }], time: '' },
      'task ไม่ซ้ำ มีเวลา': { type: 'task', unit: 'none', every: 1, rem: [{ k: 'before', m: 30 }], time: '18:00', start: day(3) },
      'event ซ้ำสัปดาห์': { type: 'event', unit: 'week', every: 2, days: [2, 4], rem: [{ k: 'before', m: 60 }], time: '13:00', timeEnd: '14:30' },
      'event ไม่ซ้ำ จบวันที่กำหนด': { type: 'event', unit: 'none', every: 1, rem: [{ k: 'at', t: '07:00' }], time: '10:00', endMode: 'date', end: day(9) },
      'class ภาคเรียน': { type: 'class', unit: 'week', every: 1, days: [1], rem: [], time: '08:30', timeEnd: '09:20', endMode: 'date', end: day(120), subject: 'คณิต' },
    };
    for (const [k, v] of Object.entries(variants)) { W.ST.D = Object.assign(W.newDraft(v.type), v); put(k, () => W.EvarelPages.formBody()); }
    return r;
  }, bundle);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = []; const keys = Object.keys(a.out);
for (const k of keys) { const x = a.out[k], y = c.out[k]; const real = typeof x === 'string' && !x.startsWith('ERR') && x.length > 300; (x === y && real) ? ok++ : bad.push(k + ' | ' + String(x).slice(0, 60) + ' | ' + String(y).slice(0, 60)); }
const warn = '\u0e15\u0e49\u0e2d\u0e07\u0e43\u0e2a\u0e48\u0e40\u0e27\u0e25\u0e32';
const withWarn = keys.filter(k => (c.out[k] || '').includes(warn)).length, noWarn = keys.filter(k => k !== 'เลือกประเภท' && !(c.out[k] || '').includes(warn)).length;
console.log('เทียบ', keys.length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.slice(0, 5));
console.log('กรณีที่ notifyIssue คืนข้อความเตือน:', withWarn, '| กรณีที่คืนว่าง:', noWarn, '(ต้องมีทั้งสองแบบ)');
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length || !withWarn || !noWarn ? 1 : 0);

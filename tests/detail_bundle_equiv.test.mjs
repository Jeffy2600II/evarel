// พิสูจน์ F6 หน้ารายละเอียด: ทั้งสองเส้นทางที่ลงทะเบียน (Pages.detail สตริง และ Components.detail คอมโพเนนต์) จากกล่อง shared/detail
// เรนเดอร์ HTML เท่า bundle เดิมทุกไบต์ ข้อมูลและเดือนชุดเดียวกับ prove_detail_tray (9 รายการ x 4 เดือน) + event/class ที่จบแล้ว 2 รายการ (สาขาไม่มีครั้งถัดไป) + กรณีไม่พบรายการ (ต้องไม่ผิดพลาด)
// ใช้: node tests/detail_bundle_equiv.test.mjs <detail.js เดิม>   (ไฟล์ใหม่อ่านจาก app/web/js/react/detail.js)
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/detail.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('detprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const W = window, ymd = d => W.ymd(d), day = k => ymd(W.addDays(new Date(), k)), r = {};
    const base = { type: 'habit', title: 'รายการ', subject: '', end: '', time: '', timeEnd: '', rem: [], track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, log: {}, skip: {} };
    const lg = (...ks) => Object.fromEntries(ks.map(k => [day(k), 1]));
    const items = [
      { ...base, id: 101, start: day(-25), log: lg(0, -1, -2, -3, -4) },
      { ...base, id: 102, start: day(-25), log: lg(-1, -2, -9), skip: { [day(-3)]: true } },
      { ...base, id: 103, track: 'count', target: 5, unitName: 'หน้า', start: day(-12), log: { [day(0)]: 5, [day(-1)]: 2 }, time: '08:15', rem: [{ k: 'before', m: 10 }, { k: 'at', t: '07:00' }] },
      { ...base, id: 104, type: 'task', start: day(-4), repeat: { unit: 'none', every: 1, days: [] }, log: {} },
      { ...base, id: 105, type: 'task', start: day(2), repeat: { unit: 'none', every: 1, days: [] }, log: {} },
      { ...base, id: 106, type: 'task', start: day(-2), repeat: { unit: 'none', every: 1, days: [] }, log: lg(-2) },
      { ...base, id: 107, type: 'event', start: day(1), time: '13:00', timeEnd: '14:30', repeat: { unit: 'week', every: 1, days: [1, 3] }, rem: [{ k: 'before', m: 60 }, { k: 'before', m: 1440 }] },
      { ...base, id: 108, type: 'class', subject: 'คณิต', start: day(-14), time: '09:00', timeEnd: '10:00', repeat: { unit: 'week', every: 2, days: [2, 4] }, rem: [] },
      { ...base, id: 109, type: 'event', start: day(3), repeat: { unit: 'month', every: 1, days: [] }, end: day(120) },
      { ...base, id: 110, type: 'event', start: day(-40), repeat: { unit: 'day', every: 1, days: [] }, end: day(-5), time: '10:00' }, /* จบแล้ว = ไม่มีครั้งถัดไป (สาขา Empty ของ ScheduleCard) */
      { ...base, id: 111, type: 'class', subject: 'ศิลปะ', start: day(-60), repeat: { unit: 'week', every: 1, days: [1] }, end: day(-10), time: '13:00', timeEnd: '14:00' },
    ];
    W.S.items = items;
    const n = new Date(), months = [[n.getFullYear(), n.getMonth()], [n.getFullYear(), n.getMonth() - 1], [n.getFullYear() - 1, 11], [n.getFullYear() + 1, 0]];
    delete W.EvarelPages.detail; (0, eval)(code);
    for (const it of items) for (const [y, m] of months) {
      W.UI.cal = { y, m }; const k = `${it.type}#${it.id} ${y}-${m + 1}`;
      try { r['สตริง ' + k] = W.EvarelPages.detail({ id: it.id }); } catch (e) { r['สตริง ' + k] = 'ERR:' + e.message; }
      try { r['คอมโพเนนต์ ' + k] = W.EvarelReact.renderToStaticMarkup(W.EvarelReact.h(W.EvarelComponents.detail, { id: it.id })); } catch (e) { r['คอมโพเนนต์ ' + k] = 'ERR:' + e.message; }
    }
    W.UI.cal = { y: n.getFullYear(), m: n.getMonth() };
    try { r['สตริง ไม่พบรายการ'] = 'OK:' + String(W.EvarelPages.detail({ id: 999999999 })).length; } catch (e) { r['สตริง ไม่พบรายการ'] = 'ERR:' + e.message; }
    try { r['คอมโพเนนต์ ไม่พบรายการ'] = 'OK:' + String(W.EvarelReact.renderToStaticMarkup(W.EvarelReact.h(W.EvarelComponents.detail, { id: 999999999 }))).length; } catch (e) { r['คอมโพเนนต์ ไม่พบรายการ'] = 'ERR:' + e.message; }
    return r;
  }, bundle);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = []; const keys = Object.keys(a.out);
for (const k of keys) { const x = a.out[k], y = c.out[k]; const real = typeof x === 'string' && !x.startsWith('ERR') && (k.includes('ไม่พบรายการ') ? x.startsWith('OK:') : x.length > 200); (x === y && real) ? ok++ : bad.push(k + ' | ' + String(x).slice(0, 50) + ' | ' + String(y).slice(0, 50)); }
const lens = keys.map(k => (a.out[k] || '').length);
console.log('เทียบ', keys.length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.slice(0, 5));
console.log('ความยาว HTML ต่ำสุด/สูงสุด:', Math.min(...lens), '/', Math.max(...lens), '| มีสตรีค/ทำแล้วทั้งหมด:', /ทำแล้วทั้งหมด/.test(c.out[keys[0]] || ''));
const emptyHit = keys.filter(k => /ไม่มีครั้งถัดไป/.test(c.out[k] || '')).length;
console.log('สาขาไม่มีครั้งถัดไปถูกเรนเดอร์จริง:', emptyHit, 'กรณี (ต้อง >= 8 = 2 รายการ x 4 เดือน x 2 เส้นทาง)');
if (emptyHit < 8) bad.push('สาขา Empty ของ ScheduleCard ไม่ถูกทดสอบ');
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

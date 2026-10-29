// พิสูจน์ F6 หน้าจับเวลา: Pages.focus (สตริง) และ Components.focus (คอมโพเนนต์) จากกล่อง shared/focus เรนเดอร์ HTML เท่า bundle เดิมทุกไบต์ (สตริงดิบ ไม่ normalize)
// สถานะ 8 กรณีเดียวกับ focus_equiv + ไม่พบรายการ (ต้องคืน null/ว่างเท่ากัน) | ตรึงเวลา: Date.now คงที่ เพื่อให้ tmMs ของทั้งสองฝั่งเท่ากัน
// ใช้: node tests/focus_bundle_equiv.test.mjs <focus.js เดิม>   (ไฟล์ใหม่อ่านจาก app/web/js/react/focus.js)
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/focus.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('focusprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const w = window, R = w.EvarelReact, NOW = new Date('2026-10-17T05:30:00Z').getTime(), RD = Date.now; Date.now = () => NOW;
    delete w.EvarelPages.focus; (0, eval)(code);
    const TODAY = w.ymd(new Date(NOW)), YEST = w.ymd(new Date(NOW - 864e5));
    const mk = (id, o) => Object.assign({ id, type: 'habit', title: 'อ่านหนังสือ', subject: '', time: '', timeEnd: '', track: 'timer', target: 30, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: TODAY, end: '', skip: {}, log: {}, rem: [] }, o || {});
    const CASES = [
      ['ไม่ใช่ของฉัน', mk(1, { log: { [TODAY]: 5 } }), null, TODAY],
      ['กำลังเดิน', mk(2, { log: { [TODAY]: 10 } }), { id: 2, acc: 30000, startedAt: NOW - 60000, date: TODAY }, TODAY],
      ['หยุดพัก', mk(3), { id: 3, acc: 420000, startedAt: 0, date: TODAY }, TODAY],
      ['ข้ามชั่วโมง', mk(4, { target: 120 }), { id: 4, acc: 3660000, startedAt: NOW - 1000, date: TODAY }, TODAY],
      ['ย้อนหลัง', mk(5, { log: { [YEST]: 12, [TODAY]: 3 } }), null, YEST],
      ['ต่างวัน', mk(6, { log: { [YEST]: 20 } }), { id: 6, acc: 0, startedAt: NOW - 5000, date: YEST }, TODAY],
      ['เกินเป้า', mk(7, { target: 10, log: { [TODAY]: 40 } }), { id: 7, acc: 600000, startedAt: 0, date: TODAY }, TODAY],
      ['อักขระพิเศษ', mk(8, { title: 'A<b>&"\'ก', unitName: '<หน้า>', target: 3, log: { [TODAY]: 1 } }), null, TODAY],
      ['หน่วยว่าง_ใช้ค่าเริ่มต้น', mk(9, { unitName: '', target: 45 }), { id: 9, acc: 1000, startedAt: NOW - 2000, date: TODAY }, TODAY],
    ];
    const r = {}; const keepItems = w.S.items, keepTM = w.ST.TM, keepF = w.UI.fdate;
    for (const [k, it, tm, fdate] of CASES) {
      w.S.items = [it]; w.ST.TM = tm; w.UI.fdate = fdate;
      try { r['สตริง ' + k] = w.EvarelPages.focus({ id: it.id }); } catch (e) { r['สตริง ' + k] = 'ERR:' + e.message; }
      try { r['คอมโพเนนต์ ' + k] = R.renderToStaticMarkup(R.h(w.EvarelComponents.focus, { id: it.id })); } catch (e) { r['คอมโพเนนต์ ' + k] = 'ERR:' + e.message; }
    }
    w.S.items = []; w.ST.TM = null;
    try { r['สตริง ไม่พบรายการ'] = 'OK:' + JSON.stringify(w.EvarelPages.focus({ id: 999999 })); } catch (e) { r['สตริง ไม่พบรายการ'] = 'ERR:' + e.message; }
    try { r['คอมโพเนนต์ ไม่พบรายการ'] = 'OK:' + JSON.stringify(R.renderToStaticMarkup(R.h(w.EvarelComponents.focus, { id: 999999 }))); } catch (e) { r['คอมโพเนนต์ ไม่พบรายการ'] = 'ERR:' + e.message; }
    w.S.items = keepItems; w.ST.TM = keepTM; w.UI.fdate = keepF; Date.now = RD; return r;
  }, bundle);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = [];
for (const k of Object.keys(a.out)) { const same = a.out[k] === c.out[k] && !String(a.out[k]).startsWith('ERR'); same ? ok++ : bad.push(k + ' | เดิม ' + String(a.out[k]).slice(0, 50) + ' | ใหม่ ' + String(c.out[k]).slice(0, 50)); }
console.log('เทียบ', Object.keys(a.out).length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.length ? bad.slice(0, 6) : '');
const S = (k) => c.out[k] || '';
const sk = Object.keys(c.out).filter(k => k.startsWith('สตริง ') && !k.includes('ไม่พบ'));
const hit = (re) => sk.filter(k => re.test(S(k))).length;
const g = { 'ปุ่มยกเลิก(ของฉัน)': hit(/data-act="tcancel"/), 'ปุ่มเริ่ม': hit(/data-act="tstart"/), 'ปุ่มหยุดชั่วคราว': hit(/data-act="tpause"/), 'ปุ่มต่อ': hit(/data-act="tresume"/), 'ปุ่มจบ': hit(/data-act="tfinish"/), 'กำลังเดิน(data-run=true)': hit(/data-run="true"/), 'พร้อมเริ่ม': hit(/พร้อมเริ่ม/), 'หน่วยเริ่มต้น(นาที)': hit(/เป้าหมาย 45 นาที/), 'นาฬิกาเกินชั่วโมง': hit(/1:01:0\d/) };
console.log('สาขาถูกเรนเดอร์จริง:', JSON.stringify(g));
for (const [n, v] of Object.entries(g)) if (v < 1) bad.push('สาขาไม่ถูกทดสอบ: ' + n);
console.log('ไม่พบรายการ (ต้องเท่ากันและไม่ error):', S('สตริง ไม่พบรายการ'), '/', S('คอมโพเนนต์ ไม่พบรายการ'), '| pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

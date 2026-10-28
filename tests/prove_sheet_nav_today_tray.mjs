// พิสูจน์ F3.3-g12: sheet/nav/today ที่รับของผ่านถาด เรนเดอร์ HTML เท่าไฟล์เดิมทุกไบต์ รวมทาง guard ของ sheet (ไม่มีรีจิสทรี/ไม่ลงทะเบียน)
// ใช้: node tests/prove_sheet_nav_today_tray.mjs <sheet.js เดิม> <nav.js เดิม> <today.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const rd = f => fs.readFileSync(f, 'utf8');
const OLD = { sheet: rd(process.argv[2]), nav: rd(process.argv[3]), today: rd(process.argv[4]) };
const NEW = { sheet: rd('app/web/js/react/sheet.js'), nav: rd('app/web/js/react/nav.js'), today: rd('app/web/js/react/today.js') };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(B) {
  const ctx = await openAsUser(b, await makeTestUser('snt'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const W = window, r = {}, put = (k, fn) => { try { r[k] = fn(); } catch (e) { r[k] = 'ERR:' + e.message; } };
    const day = k => W.ymd(W.addDays(new Date(), k));
    for (const k of ['sheet', 'nav', 'today']) { delete W.EvarelPages[k]; delete W.EvarelComponents[k]; }
    (0, eval)(code.sheet); (0, eval)(code.nav); (0, eval)(code.today);
    // nav
    for (const tab of ['today', 'calendar', 'stats', 'all', 'zzz']) put('nav tab=' + tab, () => W.EvarelPages.nav({ tab }));
    // sheet: ไม่ส่ง page (html raw) / ส่ง page ที่ลงทะเบียน / page ที่ไม่ลงทะเบียน / ไม่มีรีจิสทรีเลย
    const base = { title: 'หัวข้อ <x>', html: '<p>เนื้อ raw</p>', foot: '<button>ตกลง</button>' };
    put('sheet html raw', () => W.EvarelPages.sheet(base));
    put('sheet มี back', () => W.EvarelPages.sheet({ ...base, back: true }));
    put('sheet ไม่มี foot', () => W.EvarelPages.sheet({ title: 'ก', html: '' }));
    const keepComp = W.EvarelComponents.zzzDemo; W.EvarelComponents.zzzDemo = (pp) => W.EvarelReact.h('div', { className: 'demo' }, 'คอมโพเนนต์ ' + (pp.n || ''));
    put('sheet page ลงทะเบียน', () => W.EvarelPages.sheet({ ...base, page: 'zzzDemo', props: { n: 7 } }));
    delete W.EvarelComponents.zzzDemo; put('sheet page ไม่ลงทะเบียน (ทาง guard null)', () => W.EvarelPages.sheet({ ...base, page: 'zzzDemo' }));
    const keepReg = W.EvarelComponents; W.EvarelComponents = undefined;
    put('sheet ไม่มีรีจิสทรี EvarelComponents (ทาง guard)', () => W.EvarelPages.sheet({ ...base, page: 'formBody' }));
    W.EvarelComponents = keepReg;
    put('sheet page จริง formBody', () => { W.ST.D = W.newDraft('task'); return W.EvarelPages.sheet({ ...base, page: 'formBody' }); });
    // today: ว่าง / มีรายการ(มี nextItem ใช้ esc) / ชื่อมีอักขระพิเศษ
    const bi = { type: 'habit', title: 'ชื่อ <b>&"', subject: '', start: day(-9), end: '', time: '', timeEnd: '', rem: [], track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, log: {}, skip: {} };
    const mk = (id, o) => Object.assign(JSON.parse(JSON.stringify(bi)), { id }, o);
    const ui = Object.assign({}, W.UI, { date: day(0) }), now = new Date(Date.now()); now.setHours(6, 0, 0, 0);
    put('today ว่าง', () => W.EvarelPages.today({ items: [], ui, today: day(0), now }));
    put('today มี nextItem ชื่อพิเศษ', () => W.EvarelPages.today({ items: [mk(1, { time: '23:30', title: 'อ่าน <script>&"\'' }), mk(2, { time: '22:00' })], ui, today: day(0), now }));
    put('today ค้างอยู่', () => W.EvarelPages.today({ items: [mk(3, { type: 'task', start: day(-3), repeat: { unit: 'none', every: 1, days: [] } }), mk(4, { time: '10:00' })], ui, today: day(0), now }));
    put('today วันอื่น (ไม่ใช่วันนี้)', () => W.EvarelPages.today({ items: [mk(5, { time: '09:00' })], ui: Object.assign({}, ui, { date: day(1) }), today: day(0), now }));
    return r;
  }, B);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
const keys = Object.keys(a.out); let ok = 0; const bad = [];
for (const k of keys) { const x = a.out[k], y = c.out[k]; const real = typeof x === 'string' && !x.startsWith('ERR') && x.length > 60; (x === y && real) ? ok++ : bad.push(k + ' | ' + String(x).slice(0, 55) + ' | ' + String(y).slice(0, 55)); }
const reg = (c.out['sheet page ลงทะเบียน'] || '').includes('คอมโพเนนต์ 7'), guardNull = (c.out['sheet page ไม่ลงทะเบียน (ทาง guard null)'] || '').includes('เนื้อ raw'), nxt = (c.out['today มี nextItem ชื่อพิเศษ'] || '').includes('ev-next');
console.log('เทียบ', keys.length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.slice(0, 6));
console.log('เส้นทางสำคัญเรนเดอร์จริง: คอมโพเนนต์ที่ลงทะเบียน', reg, '| guard null ตกไปใช้ html raw', guardNull, '| nextItem (ใช้ esc)', nxt);
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length || !reg || !guardNull || !nxt ? 1 : 0);

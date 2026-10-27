// พิสูจน์ F3.3-g9: แถวรายการที่รับตรรกะจาก core/ และ isFuture/icon/UI ผ่านถาด เรนเดอร์ HTML เท่าไฟล์เดิมทุกไบต์ + วัดเวลาเรนเดอร์ 300 แถว
// ใช้: node tests/prove_itemrow_tray.mjs <item-row.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/item-row.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('itemrowp'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const W = window, day = k => W.ymd(W.addDays(new Date(), k)), r = {}, h = W.EvarelReact.h, R = W.EvarelReact.renderToStaticMarkup;
    const base = { id: 1, type: 'habit', title: 'ชื่อ <b>&"', subject: 'วิชา', start: day(-9), end: '', time: '', timeEnd: '', rem: [], track: 'check', target: 1, unitName: 'หน้า', repeat: { unit: 'day', every: 1, days: [] }, log: {}, skip: {} };
    const mk = (id, o) => Object.assign(JSON.parse(JSON.stringify(base)), { id }, o);
    const items = [
      mk(1, {}), mk(2, { log: { [day(0)]: 1 } }), mk(3, { track: 'none' }), mk(4, { track: 'count', target: 5, log: { [day(0)]: 3 } }),
      mk(5, { track: 'count', target: 5, log: { [day(0)]: 5 } }), mk(6, { track: 'timer', target: 30, log: { [day(0)]: 10 } }), mk(7, { type: 'event', time: '09:30', timeEnd: '10:45', track: 'none' }),
      mk(8, { type: 'task', start: day(-3), repeat: { unit: 'none', every: 1, days: [] }, track: 'check' }), mk(9, { type: 'class', time: '08:00', track: 'none', subject: 'คณิต' }),
      mk(10, { skip: { [day(0)]: true } }), mk(11, { type: 'task', start: day(4), repeat: { unit: 'none', every: 1, days: [] } }),
    ];
    W.S.items = items;
    delete W.EvarelComponents.itemRow; (0, eval)(code);
    const IR = W.EvarelComponents.itemRow, dates = [day(-1), day(0), day(1), day(5)];
    for (const it of items) for (const [di, ds] of dates.entries()) for (const next of [false, true]) for (const pop of [false, true]) {
      W.UI.pop = pop ? it.id : null; const k = `#${it.id} ${it.type}/${it.track} วัน${di} next=${next} pop=${pop}`;
      try { r[k] = R(h(IR, { it, ds, i: it.id, next })); } catch (e) { r[k] = 'ERR:' + e.message; }
    }
    W.UI.pop = null;
    const t0 = performance.now(); let sink = 0;
    for (let n = 0; n < 300; n++) sink += R(h(IR, { it: items[n % items.length], ds: day(0), i: n, next: false })).length;
    r.__ms = Math.round(performance.now() - t0); r.__sink = sink;
    return r;
  }, bundle);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
const keys = Object.keys(a.out).filter(k => !k.startsWith('__'));
let ok = 0; const bad = [];
for (const k of keys) { const x = a.out[k], y = c.out[k]; const real = typeof x === 'string' && !x.startsWith('ERR') && x.length > 150; (x === y && real) ? ok++ : bad.push(k + ' | ' + String(x).slice(0, 50) + ' | ' + String(y).slice(0, 50)); }
const hasPop = keys.filter(k => k.endsWith('pop=true') && (c.out[k] || '').includes('data-pop')).length;
console.log('เทียบ', keys.length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.slice(0, 5));
console.log('กรณีที่มี data-pop (ทางของ UI.pop ถูกใช้จริง):', hasPop);
console.log('เวลาเรนเดอร์ 300 แถว: เดิม', a.out.__ms, 'ms | ใหม่', c.out.__ms, 'ms | ผลรวมความยาวเท่ากัน:', a.out.__sink === c.out.__sink);
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length || !hasPop ? 1 : 0);

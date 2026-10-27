// พิสูจน์ F3.3-g6: ปฏิทิน(agendaHTML) และหน้าวันนี้(empty) ที่รับฟังก์ชันผ่านถาด เรนเดอร์ HTML เท่าไฟล์เดิมทุกไบต์
// ใช้: node tests/prove_calendar_today_tray.mjs <calendar.js เดิม> <today.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const OLD = { calendar: fs.readFileSync(process.argv[2], 'utf8'), today: fs.readFileSync(process.argv[3], 'utf8') };
const NEW = { calendar: fs.readFileSync('app/web/js/react/calendar.js', 'utf8'), today: fs.readFileSync('app/web/js/react/today.js', 'utf8') };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundles) {
  const user = await makeTestUser('calprove');
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate(({ cal, tod, seedList }) => {
    const r = {}; const ST = window.ST, today = window.TODAY;
    ST.items = seedList.map(x => JSON.parse(JSON.stringify(x))); const items = ST.items;
    (0, eval)(cal);
    for (const [k, sel] of [['ปฏิทิน เดือน วันนี้', today], ['ปฏิทิน เดือน วันอื่น', '2026-01-15'], ['ปฏิทิน เดือน อนาคต', '2027-03-01']]) {
      try { r[k] = window.EvarelPages.calendar({ calView: 'dayGridMonth', calSel: sel }); } catch (e) { r[k] = 'ERR:' + e.message; }
    }
    try { r['ปฏิทิน มุมมองอื่น (agenda ว่าง)'] = window.EvarelPages.calendar({ calView: 'timeGridWeek', calSel: today }); } catch (e) { r['ปฏิทิน มุมมองอื่น (agenda ว่าง)'] = 'ERR:' + e.message; }
    (0, eval)(tod);
    const ui = Object.assign({}, window.UI || {});
    try { r['วันนี้ ว่าง (empty)'] = window.EvarelPages.today({ items: [], ui, today, now: new Date() }); } catch (e) { r['วันนี้ ว่าง (empty)'] = 'ERR:' + e.message; }
    try { r['วันนี้ มีรายการ'] = window.EvarelPages.today({ items, ui, today, now: new Date() }); } catch (e) { r['วันนี้ มีรายการ'] = 'ERR:' + e.message; }
    return r;
  }, { cal: bundles.calendar, tod: bundles.today, seedList: SEED_ITEMS });
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = [];
for (const k of Object.keys(a.out)) { const same = a.out[k] === c.out[k] && !String(a.out[k]).startsWith('ERR') && String(a.out[k]).length > 40; same ? ok++ : bad.push(k + ' | เดิม ' + String(a.out[k]).slice(0, 60) + ' | ใหม่ ' + String(c.out[k]).slice(0, 60)); }
console.log('เทียบ', Object.keys(a.out).length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.length ? bad : '');
console.log('ความยาว HTML (ว่าง/มีรายการ):', (c.out['วันนี้ ว่าง (empty)'] || '').length, '/', (c.out['วันนี้ มีรายการ'] || '').length, '| มีคำว่า วันนี้ยังว่างอยู่ ในกรณีว่าง:', /\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\u0e22\u0e31\u0e07\u0e27\u0e48\u0e32\u0e07\u0e2d\u0e22\u0e39\u0e48/.test(c.out['วันนี้ ว่าง (empty)'] || ''));
const longer=(c.out['วันนี้ มีรายการ']||'').length>(c.out['วันนี้ ว่าง (empty)']||'').length; if(!longer){bad.push('กรณีมีรายการสั้นเท่ากรณีว่าง = เส้นทางมีรายการไม่ได้ถูกทดสอบจริง');}
console.log('เส้นทางมีรายการถูกเรนเดอร์จริง (ยาวกว่ากรณีว่าง):',longer);
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

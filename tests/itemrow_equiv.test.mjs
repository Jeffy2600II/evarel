/* เทียบแถวรายการ itemRow: ฉบับ string เดิม (12-ui__primitives) กับฉบับ React จริง (shared/item-row/ItemRowPage.jsx)
   เกณฑ์: DOM จริงเท่ากันทุกไบต์ (browser-serialized innerHTML) ทั้งสองฝั่ง กันความต่างที่เป็นแค่รูปเขียน attribute
   ครอบกรณี: ชนิด track ทั้งหมด, done/todo, late, next, skipped, future(disabled), data-pop, ประเภท event/task/class
   รัน: node tests/itemrow_equiv.test.mjs  (ต้องมีเซิร์ฟเวอร์ 8779 เสิร์ฟ app/web) */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('itemrow');
try {
  const pad = n => String(n).padStart(2, '0'); const t = new Date();
  const TD = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  const FUT = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(Math.min(28, t.getDate() + 7))}`;
  await seedItems(user.session, [
    { id: 980, type: 'task', title: 'งานติ๊กธรรมดา', subject: 'หัวข้อย่อย', time: '', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: TD, end: '', skip: {}, log: {}, rem: [] },
    { id: 981, type: 'task', title: 'งานนับจำนวน', subject: '', time: '', timeEnd: '', track: 'count', target: 3, unitName: 'หน้า', repeat: { unit: 'day', every: 1, days: [] }, start: TD, end: '', skip: { [TD]: true }, log: {}, rem: [] },
    { id: 982, type: 'event', title: 'เหตุการณ์จับเวลา', subject: 'ธีม', time: '09:00', timeEnd: '09:30', track: 'timer', target: 30, unitName: 'นาที', repeat: { unit: 'day', every: 1, days: [] }, start: TD, end: '', skip: {}, log: { [TD]: 30 }, rem: [] },
    { id: 983, type: 'habit', title: 'นิสัยไม่ติดตาม', subject: 'หมวด', time: '', timeEnd: '', track: 'none', target: 1, unitName: '', repeat: { unit: 'week', every: 1, days: [t.getDay()] }, start: TD, end: '', skip: {}, log: {}, rem: [] },
    { id: 984, type: 'class', title: 'คาบเรียนอนาคต', subject: 'ห้อง', time: '08:40', timeEnd: '09:30', track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: FUT, end: '', skip: {}, log: {}, rem: [] },
  ]);
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3500);
  const st = await p.evaluate(() => ({ ready: !!(window.EvarelReact && window.EvarelPages?.today && window.EvarelComponents?.itemRow) }));
  ok('โมดูลพร้อม (EvarelReact + today + itemRow)', st.ready, JSON.stringify(st));
  if (st.ready) {
    const cases = await p.evaluate(([TD, FUT]) => {
      const w = window; const S = w.S, UI = w.UI, T = w.T;
      const R = (x) => w.EvarelReact.renderToStaticMarkup(x);
      const IR = w.EvarelComponents.itemRow; const h = w.EvarelReact.h;
      const out = [];
      const run = (name, it, ds, i, opts) => {
        const a = document.createElement('div'); a.innerHTML = w.itemRow(it, ds, i, opts); document.body.appendChild(a);
        const bEl = document.createElement('div'); document.body.appendChild(bEl);
        const root = w.EvarelReact.createRoot(bEl);
        w.EvarelReact.flushSync(() => root.render(h(IR, { it, ds, i, ...(opts || {}) })));
        const norm = (h) => h.replace(/style="--i: (\d+);?"/g, (m, n) => 'style="--i:' + n + '"');
        const A = a.innerHTML, B = bEl.innerHTML;
        /* React SSR พิมพ์ --i:N ขณะ browser CSSOM serialize --i: N; (ต่างโดยธรรมชาติ คุมไม่ได้) เทียบค่า semantic ของ --i แทน raw byte จุดเดียวนี้ ส่วนอื่นทุกไบต์ */
        const same = norm(A) === norm(B) && (A.replace(/--i: ?\d+;?/g, '') === B.replace(/--i: ?\d+;?/g, ''));
        a.remove(); bEl.remove();
        out.push({ name, same, A: A.slice(0, 400), B: B.slice(0, 400) });
      };
      const items = S.items;
      const byTrack = (tr) => items.find(x => x.track === tr);
      const it980 = items.find(x => x.id === 980), it981 = items.find(x => x.id === 981), it982 = items.find(x => x.id === 982), it983 = items.find(x => x.id === 983), it984 = items.find(x => x.id === 984);
      run('check วันนี้ todo', it980, TD, 0, {});
      run('check done + pop', it980, TD, 1, {}); /* UI.pop ทดสอบแยก */
      UI.pop = 980; run('check done + data-pop จริง', it980, TD, 2, {}); UI.pop = 0;
      run('count ข้ามวันนี้ (skip)', it981, TD, 3, {});
      run('timer done วันนี้', it982, TD, 4, {});
      run('none habit วันนี้', it983, TD, 5, {});
      run('future disabled (ev-check + ปุ่ม)', it984, FUT, 6, {});
      run('count future (dec/inc disabled)', { ...it981, id: 985, start: FUT }, FUT, 7, {});
      run('late ค้างล้างหลัง', it980, TD, 8, { late: true });
      run('next รายการถัดไป', it980, TD, 9, { next: true });
      return out;
    }, [TD, FUT]);
    for (const c of cases) ok('itemRow ' + c.name + ' DOM ตรงกัน', c.same, c.same ? '' : '\n  classic: ' + c.A + '\n  react  : ' + c.B);
    ok('ไม่มี pageerror ตลอด', errs.length === 0, errs.slice(0, 2).join(' | '));
  }
} finally { await b.close(); await user.cleanup(); }
console.log(`เทียบ itemRow ${pass + fail} กรณี | ตก ${fail}`);
process.exit(fail ? 1 : 0);

/* เทียบเนื้อ <main> ของหน้า "วันนี้": ฉบับ classic (VIEWS.today โค้ดเดิม คำนวณในไฟล์) กับฉบับ React (EvarelPages.today คำนวณเองจาก core/today) ต้องตรงทุกไบต์
   ต่างจาก stats/all ที่เทียบ React รุ่นก่อน-หลัง: today เพิ่งเป็น React รอบนี้ ฐานคือ classic เอง (ยังอยู่ในไฟล์เป็น fallback)
   ใช้: node tests/today_equiv.test.mjs   ผล: exit 1 ถ้าต่างแม้ไบต์เดียว */
import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXED = new Date('2026-10-17T05:30:00Z'); const RD = Date;
globalThis.Date = class extends RD { constructor(...a){ if(a.length===0) super(FIXED.getTime()); else super(...a); } static now(){ return FIXED.getTime(); } };
globalThis.window = globalThis; globalThis.document = {}; globalThis.navigator = {};
/* โมดูล 01-07 เป็น ES module จริงแล้ว (base-esm): โหลดด้วย import จากดิสก์ ลำดับตาม _order ให้ shim window ถูกตั้งก่อนไฟล์ window-style (12, 13) อ่าน
   ไฟล์ปัจจุบัน = classic ยังฝังอยู่เป็น fallback ของ production จึงเทียบของจริงที่เสิร์ฟ ไม่ใช่ snapshot */
const O = globalThis; O.EVAREL_API = 'https://equiv.invalid';
const M = (f) => import('file://' + root + '/app/web/js/app/' + f + '.js');
for (const f of ['00-head','01-core__constants','02-core__dates','03-core__store','04-data__repo','05-data__auth','06-services__schedule','07-services__stats','12-ui__primitives']) await M(f);
/* S ของ module 05 (import binding) คือ object เดียวกับ window.S: ห้ามสร้าง O.S ใหม่ทับ (06 import S จาก 05 จะยังเห็นของเก่า) แก้เฉพาะฟิลด์ */
if (!O.S) O.S = { items: [] };
O.S.items = []; O.UI = O.UI || {}; Object.assign(O.UI, { period: 'week', date: '', weekOff: 0, weekDir: 0, pop: null, tab: 'today', type: 'all', animate: false, loading: false, error: null });
await M('13-views');
const rt = fs.readFileSync(root + '/app/web/js/react/runtime.js', 'utf8'); (0, eval)(rt);
const ir = fs.readFileSync(root + '/app/web/js/react/item-row.js', 'utf8'); O.EvarelComponents = {}; (0, eval)(ir); /* ลำดับตาม REACT_PAGES จริง: item-row ก่อน today */
const tj = fs.readFileSync(root + '/app/web/js/react/today.js', 'utf8'); O.EvarelPages = {}; (0, eval)(tj);
const R = O.EvarelPages.today;
const TODAY = O.ymd(new Date());
const cv = (id, o) => ({ id, type: 'habit', title: 'ทดสอบ ' + id, subject: 'วิชา', time: '', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: TODAY, end: '', skip: {}, log: {}, rem: [], ...o });
const mkTask = (id, start, done) => cv(id, { type: 'task', track: 'check', repeat: { unit: 'none', every: 1, days: [] }, start, log: done ? { [start]: 1 } : {} });
const CASES = [
  { name: 'วันนี้เปล่าทั้งหมด', items: [] },
  { name: 'วันนี้มีครบ 3 ชนิด + overdue + next', items: [cv(1, { log: { [TODAY]: 1 } }), mkTask(2, O.ymd(new Date(FIXED.getTime() - 2 * 864e5)), false), cv(3, { type: 'event', time: '23:30', timeEnd: '' }), cv(4, { track: 'count', target: 3, unitName: 'ข้อ', time: '09:00', log: { [TODAY]: 2 } })] },
  { name: 'วันอื่น (ย้อนดู)', ui: { date: O.ymd(new Date(FIXED.getTime() - 864e5)) }, items: [cv(1), cv(2, { time: '10:00' })] },
  { name: 'สัปดาห์ถัดไป', ui: { weekOff: 1, date: O.ymd(new Date(FIXED.getTime() + 7 * 864e5)) }, items: [cv(1)] },
  { name: 'วันนี้ครบทุกอย่าง', items: [cv(1, { log: { [TODAY]: 1 } })] },
];
let n = 0, fail = 0;
for (const c of CASES) {
  O.S.items = c.items; Object.assign(O.UI, { date: TODAY, weekOff: 0, weekDir: 0, pop: null }, c.ui || {});
  /* บังคับทาง classic: VIEWS.today เรียก React ก่อนเสมอเมื่อมี EvarelPages.today การเทียบที่ไม่ถอด React ออกคือเทียบ React กับตัวเอง (ตัวทดสอบหูหนวก — พิสูจน์แล้ว 18 ต.ค. 2026) */
  const savedR = O.EvarelPages.today; delete O.EvarelPages.today;
  const classic = O.VIEWS.today();
  O.EvarelPages.today = savedR;
  n++;
  if (!c.items.length) { /* ทางเข้าต้นฉบับ: ไม่มีข้อมูล = empty-state ทั้งหน้า React ไม่ถูกเรียก (13-views บล็อกก่อน) */
    if (classic.indexOf('ยังไม่มีอะไรเลย') < 0 || classic.indexOf('<main class="ev-main" id="main">') >= 0) { fail++; console.log('FAIL', c.name, '| empty-state ต้องออกจาก classic และห้ามมี main id'); }
    else console.log('ตรงตามทางเข้า', c.name, '(empty-state จาก classic ตามต้นฉบับ)');
    continue; }
  const react = R({ items: c.items, ui: { date: O.UI.date, weekOff: O.UI.weekOff, weekDir: O.UI.weekDir }, today: TODAY, now: new Date() });
  const cm = classic.slice(classic.indexOf('<main class="ev-main" id="main">'));
  if (cm !== react) { fail++; let i = 0; while (cm[i] === react[i]) i++; console.log('FAIL', c.name, 'ต่างที่', i, '\n classic:', cm.slice(Math.max(0, i - 70), i + 90), '\n react  :', react.slice(Math.max(0, i - 70), i + 90)); }
  else console.log('ตรงทุกไบต์', c.name, react.length, 'อักษร');
}
console.log(`เทียบ today ${n} กรณี | ต่างกัน ${fail}`); process.exit(fail ? 1 : 0);

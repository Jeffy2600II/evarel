/* เทียบเนื้อ <main> ของหน้าปฏิทิน: ฉบับ classic (VIEWS.calendar โค้ดเดิม) กับฉบับ React (EvarelPages.calendar) ต้องตรงทุกไบต์
   บทเรียนจาก today_equiv ใช้ครบ: (1) ถอด EvarelPages.calendar ก่อนเรียบ classic ไม่งั้นเทียบ React กับตัวเอง (2) แก้เฉพาะ O.S.items ห้ามสร้าง O.S ใหม่ทับ (import binding)
   ใช้: node tests/calendar_equiv.test.mjs   ผล: exit 1 ถ้าต่างแม้ไบต์เดียว */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXED = new Date('2026-10-17T05:30:00Z'); const RD = Date;
globalThis.Date = class extends RD { constructor(...a){ if(a.length===0) super(FIXED.getTime()); else super(...a); } static now(){ return FIXED.getTime(); } };
globalThis.window = globalThis; globalThis.document = {}; globalThis.navigator = {};
globalThis.EVAREL_API = 'https://equiv.invalid';
const O = globalThis;
const M = (f) => import('file://' + root + '/app/web/js/app/' + f + '.js');
for (const f of ['00-head','01-core__constants','02-core__dates','03-core__store','04-data__repo','05-data__auth','06-services__schedule','07-services__stats','12-ui__primitives']) await M(f);
if (!O.S) O.S = { items: [] };
O.S.items = []; O.UI = O.UI || {}; Object.assign(O.UI, { period:'week', date:'', weekOff:0, weekDir:0, pop:null, tab:'calendar', type:'all', animate:false, loading:false, error:null, calView:'dayGridMonth', calSel:'', calDate:null });
await M('13-views');
const rt = fs.readFileSync(root + '/app/web/js/react/runtime.js', 'utf8'); (0, eval)(rt);
const cj = fs.readFileSync(root + '/app/web/js/react/calendar.js', 'utf8'); O.EvarelPages = {}; (0, eval)(cj);
const R = O.EvarelPages.calendar;
const TODAY = O.ymd(new Date());
const cv = (id, o={}) => ({ id, type:'habit', title:'ทดสอบ '+id, subject:'', time:'09:00', timeEnd:'10:00', track:'check', target:1, unitName:'', repeat:{unit:'week', every:1, days:[6]}, start:'2026-10-01', end:'', skip:{}, log:{}, rem:[], ...o });
const CASES = [
  { name: 'มุมมองเดือน (agenda มีรายการ)', ui: { calView:'dayGridMonth', calSel:TODAY }, items:[cv(1),cv(2,{type:'event'})] },
  { name: 'มุมมองเดือน วันเลือกอื่น', ui: { calView:'dayGridMonth', calSel:'2026-10-10' }, items:[cv(1)] },
  { name: 'มุมมองสัปดาห์ (agenda ว่าง)', ui: { calView:'timeGridWeek', calSel:TODAY }, items:[cv(1),cv(2),cv(3)] },
  { name: 'ไม่มีข้อมูลเลย (agenda ว่าง)', ui: { calView:'dayGridMonth', calSel:TODAY }, items:[] },
];
let n = 0, fail = 0;
for (const c of CASES) {
  O.S.items = c.items; Object.assign(O.UI, c.ui);
  const savedR = O.EvarelPages.calendar; delete O.EvarelPages.calendar;
  const classic = O.VIEWS.calendar();
  O.EvarelPages.calendar = savedR;
  const react = R({ calView: O.UI.calView, calSel: O.UI.calSel });
  const cm = classic.slice(classic.indexOf('<main class="ev-main">'));
  n++;
  if (cm !== react) { fail++; let i = 0; while (cm[i] === react[i]) i++; console.log('FAIL', c.name, 'ต่างที่', i, '\n classic:', cm.slice(Math.max(0,i-70), i+90), '\n react  :', react.slice(Math.max(0,i-70), i+90)); }
  else console.log('ตรงทุกไบต์', c.name, react.length, 'อักษร');
}
console.log(`เทียบ calendar ${n} กรณี | ต่างกัน ${fail}`); process.exit(fail ? 1 : 0);

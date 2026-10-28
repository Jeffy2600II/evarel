/* เทียบหน้า "จับเวลา" (focus): classic focusBody (15-core__timer.js คำนวณในไฟล์ ยังอยู่เป็น fallback) กับ React (EvarelPages.focus) ต้องตรงทุกไบต์
   focusBody เป็นฟังก์ชันอิสระ เรียกตรงไม่ผ่าน React จึงไม่เทียบ React กับตัวเอง | ตรึงเวลาและตัวนับ ไม่พึ่งเครือข่าย
   ครอบ 7 สถานะ: ไม่ใช่ของฉัน, กำลังเดิน, หยุดพัก, เดินข้ามชั่วโมง, ต่างวัน, เกินเป้า 100%, ชื่อมีอักขระพิเศษ
   ใช้: node tests/focus_equiv.test.mjs   ผล: exit 1 ถ้าต่างแม้ไบต์เดียว */
import fs from 'node:fs'; import { chromium } from 'playwright'; import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXED = new Date('2026-10-17T05:30:00Z'); const RD = Date;
globalThis.Date = class extends RD { constructor(...a){ if(a.length===0) super(FIXED.getTime()); else super(...a); } static now(){ return FIXED.getTime(); } };
globalThis.window = globalThis; globalThis.document = {}; globalThis.navigator = {};
globalThis.localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const O = globalThis; O.EVAREL_API = 'https://equiv.invalid';
const M = (f) => import('file://' + root + '/app/web/js/m/' + f + '.js');
for (const f of ['00-head','01-core__constants','02-core__dates','03-core__store','04-data__repo','05-data__auth','06-services__schedule','07-services__stats','12-ui__primitives']) await M(f);
if (!O.S) O.S = { items: [] };
O.UI = O.UI || {};
/* 15-core__timer.js เป็นสคริปต์ปกติ (ไม่ใช่ ES module): ประเมินใน global เพื่อให้ focusBody เห็น ST UI find val icon esc dayLab fmtClock */
(0, eval)(fs.readFileSync(root + '/app/web/js/m/15-core__timer.js', 'utf8') + '\n;globalThis.__focusBody = focusBody;');
const classicFn = O.__focusBody;
if (typeof classicFn !== 'function') { console.log('FAIL โหลด focusBody ของ classic ไม่ได้'); process.exit(1); }
const rt = fs.readFileSync(root + '/app/web/js/react/runtime.js', 'utf8'); (0, eval)(rt);
const fj = fs.readFileSync(process.env.FOCUS_JS || (root + '/app/web/js/react/focus.js'), 'utf8'); O.EvarelPages = {}; O.EvarelComponents = {}; (0, eval)(fj);
const R = O.EvarelPages.focus;
const TODAY = O.ymd(new Date()), YEST = O.ymd(new Date(FIXED.getTime() - 864e5));
const mk = (id, o) => Object.assign({ id, type: 'habit', title: 'อ่านหนังสือ', subject: '', time: '', timeEnd: '', track: 'timer', target: 30, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: TODAY, end: '', skip: {}, rem: [], log: {} }, o);
const NOW = FIXED.getTime();
const CASES = [
  { name: 'ไม่ใช่ของฉัน (พร้อมเริ่ม)', it: mk(1, { log: { [TODAY]: 5 } }), tm: null, fdate: TODAY },
  { name: 'ของฉัน กำลังเดิน 90 วินาที', it: mk(2, { log: { [TODAY]: 10 } }), tm: { id: 2, acc: 30000, startedAt: NOW - 60000, date: TODAY }, fdate: TODAY },
  { name: 'ของฉัน หยุดพัก สะสม 7 นาที', it: mk(3), tm: { id: 3, acc: 420000, startedAt: 0, date: TODAY }, fdate: TODAY },
  { name: 'เดินข้ามชั่วโมง 1:01:01', it: mk(4, { target: 120 }), tm: { id: 4, acc: 3661000 - 1000, startedAt: NOW - 1000, date: TODAY }, fdate: TODAY },
  { name: 'ดูย้อนหลัง (เมื่อวาน) ทำแล้ว 12', it: mk(5, { log: { [YEST]: 12, [TODAY]: 3 } }), tm: null, fdate: YEST },
  { name: 'ของฉัน ต่างวันกับที่ดู', it: mk(6, { log: { [YEST]: 20 } }), tm: { id: 6, acc: 0, startedAt: NOW - 5000, date: YEST }, fdate: TODAY },
  { name: 'เกินเป้า (pct ถูกตัดที่ 100)', it: mk(7, { target: 10, log: { [TODAY]: 40 } }), tm: { id: 7, acc: 600000, startedAt: 0, date: TODAY }, fdate: TODAY },
  { name: 'ชื่อและหน่วยมีอักขระพิเศษ', it: mk(8, { title: 'A<b>&"\'ก', unitName: '<หน้า>', target: 3, log: { [TODAY]: 1 } }), tm: null, fdate: TODAY },
];

/* รวบรวมคู่ (classic, react) แล้วเทียบ "ผล DOM" ใน Chromium: parse ทั้งสองข้างให้เป็นรูปมาตรฐานเดียวกัน (data-flat กับ data-flat="" , padding:0px กับ 0 , &#39; กับ &#x27;)
   ส่วนที่มีความหมายจริง (ข้อความ ลำดับ class data-* และตัวเลข --p) ยังเทียบตรงๆ | ไม่ใช้ normalize ด้วย regex เพราะจะยอมรับทุกอย่างไปเรื่อยๆ */
const PAIRS = [];
for (const c of CASES) {
  O.S.items = [c.it]; O.ST.TM = c.tm; O.UI.fdate = c.fdate;
  PAIRS.push({ name: c.name, classic: classicFn(c.it).trim(), react: R({ id: c.it.id }).trim() });
}
O.S.items = []; O.ST.TM = null;
const none = R({ id: 999 });
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] }); const pg = await b.newPage();
const res = await pg.evaluate((pairs) => {
  /* รูปมาตรฐานของ DOM: ชื่อแท็ก + แอตทริบิวต์เรียงชื่อ (style ใช้ค่าที่ browser คำนวณ ไม่ใช่สตริงดิบ) + ข้อความ */
  const canon = (n) => {
    if (n.nodeType === 3) return JSON.stringify(n.textContent);
    if (n.nodeType !== 1) return '';
    const attrs = [...n.attributes].filter(a => a.name !== 'style').map(a => a.name + '=' + JSON.stringify(a.value)).sort().join(' ');
    const st = n.style ? [...n.style].sort().map(k => k + ':' + n.style.getPropertyValue(k)).join(';') : '';
    return '<' + n.tagName + ' ' + attrs + (st ? ' style{' + st + '}' : '') + '>' + [...n.childNodes].map(canon).join('') + '</' + n.tagName + '>';
  };
  const parse = (h) => { const t = document.createElement('div'); t.innerHTML = h; return canon(t); };
  return pairs.map(p => { const a = parse(p.classic), r = parse(p.react); let i = 0; const lim = Math.min(a.length, r.length); while (i < lim && a[i] === r[i]) i++; return { name: p.name, same: a === r, at: i, a: a.slice(Math.max(0, i - 60), i + 80), r: r.slice(Math.max(0, i - 60), i + 80), len: a.length }; });
}, PAIRS);
await b.close();
let n = 0, fail = 0;
for (const x of res) { n++; if (x.same) console.log('ตรงทุกโหนด', x.name, x.len, 'อักษร'); else { fail++; console.log('FAIL', x.name, 'ต่างที่', x.at, '\n classic:', x.a, '\n react  :', x.r); } }
n++; if (none !== '' && none != null) { fail++; console.log('FAIL ไม่พบรายการ ต้องคืนว่าง ได้', JSON.stringify(none).slice(0, 80)); } else console.log('ตรงตามทางเข้า ไม่พบรายการ คืนว่าง');
console.log(`เทียบ focus ${n} กรณี | ต่างกัน ${fail}`); process.exit(fail ? 1 : 0);

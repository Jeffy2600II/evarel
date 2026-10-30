// พิสูจน์ F6 (11-popover): ตำแหน่งเมนูที่คำนวณโดยโค้ดใหม่ (popPlace จาก core) ตรงโค้ดเดิม (คำนวณในไฟล์ m เอง) ทุกกรณี
// ใช้: node tests/popover_equiv.test.mjs <11-ui__popover.js เดิม>   (ไฟล์ใหม่อ่านจาก app/web/js/m/11-ui__popover.js)
// เปิดเบราว์เซอร์จริง โหลดไฟล์ทั้งสองเป็นโมดูลในหน้าว่าง ใช้ pop/ST/closePop/esc/icon จำลอง แล้วเทียบ left/top/transformOrigin ที่เขียนลง pop.style
import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEWP = 'app/web/js/m/11-ui__popover.js', NEW = fs.readFileSync(NEWP, 'utf8');
const CORE = fs.readFileSync('app/web/js/m/core/popover.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ viewport: { width: 412, height: 915 } });
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body><div id="pop" hidden></div></body>');
/* โหลดแต่ละเวอร์ชันเป็นโมดูลแยก (blob) พร้อมโมดูล core ถ้ามี import './core/popover.js' ให้แมปเป็น blob ของ core */
const run = await p.evaluate(async ({ OLD, NEW, CORE }) => {
  const mk = (src) => URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  const coreUrl = mk(CORE);
  const load = async (src) => {
    const w = window; w.ST = { popBtn: null }; w.esc = s => String(s ?? ''); w.icon = () => ''; w.closePop = () => { const p = document.getElementById('pop'); p.hidden = true; p.dataset.open = 'false'; };
    w.pop = document.getElementById('pop'); delete w.openPop;
    const code = src.replace(/(from\s+['"])\.\/core\/popover\.js(['"])/g, `$1${coreUrl}$2`);
    await import(mk(code)); return w.openPop;
  };
  const CASES = [];
  const rects = [{ left: 20, right: 60, top: 100, bottom: 140, width: 40 }, { left: 360, right: 400, top: 100, bottom: 140, width: 40 }, { left: 190, right: 230, top: 100, bottom: 140, width: 40 }, { left: 2, right: 42, top: 880, bottom: 915, width: 40 }, { left: 370, right: 410, top: 5, bottom: 45, width: 40 }, { left: 0, right: 412, top: 400, bottom: 440, width: 412 }];
  const sizes = [{ w: 200, h: 100 }, { w: 380, h: 300 }, { w: 220, h: 700 }];
  for (const r of rects) for (const sz of sizes) for (const o of [{}, { align: 'left' }, { align: 'right' }, { align: 'center' }, { prefer: 'up' }, { prefer: 'up', align: 'right' }, { align: 'center', prefer: 'up' }]) CASES.push({ r, sz, o });
  const results = {};
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    const openPop = await load(src); results[name] = [];
    for (const c of CASES) {
      const pop = document.getElementById('pop'); pop.hidden = true; pop.dataset.open = ''; window.ST.popBtn = null; pop.style.cssText = '';
      Object.defineProperty(pop, 'offsetWidth', { configurable: true, get: () => c.sz.w }); Object.defineProperty(pop, 'offsetHeight', { configurable: true, get: () => c.sz.h });
      const anchor = { setAttribute() {}, getBoundingClientRect: () => c.r, contains: () => false };
      openPop(anchor, [{ act: 'x', id: 1, icon: 'e', label: 'L' }], c.o);
      results[name].push({ left: pop.style.left, top: pop.style.top, to: pop.style.transformOrigin, open: pop.dataset.open, hidden: pop.hidden, html: pop.innerHTML });
    }
  }
  return { n: CASES.length, old: results.old, new: results.new, cases: CASES };
}, { OLD, NEW, CORE });
let diff = 0, first = null;
for (let i = 0; i < run.n; i++) { if (JSON.stringify(run.old[i]) !== JSON.stringify(run.new[i])) { diff++; first ??= { i, c: run.cases[i], o: run.old[i], n: run.new[i] }; } }
console.log(`เทียบ ${run.n} กรณี | ตรงทุกฟิลด์ ${run.n - diff} | ต่าง ${diff}`);
if (first) console.log('ต่างครั้งแรก:', JSON.stringify(first).slice(0, 400));
const distinct = new Set(run.new.map(x => x.left + '|' + x.top + '|' + x.to)).size;
console.log(`ตำแหน่งที่ต่างกันจริงในชุดทดสอบ ${distinct} แบบ (ต้องหลากหลาย ไม่ใช่ค่าเดียว) | pageerror: ${errs.length}`);
await b.close(); process.exit(diff || errs.length || distinct < 8 ? 1 : 0);

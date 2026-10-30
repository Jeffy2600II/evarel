/* เทียบ HTML ที่หน้าสถิติผลิต: ฉบับก่อนหน้า (React รับ props ที่โค้ดเดิมคำนวณ, จาก git BASE) กับฉบับปัจจุบัน (React คำนวณเองจากข้อมูลดิบ) ต้องตรงทุกไบต์
   ใช้: node tests/stats_html_equiv.test.mjs   (BASE = STATS_HTML_BASE หรือ 49236dd, BASE_ALL = ALL_HTML_BASE หรือ d3b113b)  ผล: exit 1 ถ้าต่างแม้ไบต์เดียว */
import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'); const BASE = process.env.STATS_HTML_BASE || '49236dd', BASE_ALL = process.env.ALL_HTML_BASE || 'd3b113b'; /* สองหน้ามีฐานต่างกัน: แต่ละหน้าเทียบกับ commit ก่อนที่หน้านั้นจะคำนวณเอง */
const FIXED = new Date('2026-10-17T05:30:00Z'); const RD = Date;
globalThis.Date = class extends RD { constructor(...a){ if(a.length===0) super(FIXED.getTime()); else super(...a); } static now(){ return FIXED.getTime(); } };
globalThis.window = globalThis; globalThis.document = {}; globalThis.navigator = {};
const rt = fs.readFileSync(root + '/app/web/js/react/runtime.js', 'utf8'); (0, eval)(rt);
if (!window.EvarelReact) { console.log('FAIL: runtime ไม่ตั้ง EvarelReact'); process.exit(1); }
const load = (src) => { window.EvarelPages = {}; (0, eval)(src); return window.EvarelPages.stats; };
/* v24 (Master สั่งทำตามเดโมเต็มที่): ข้อความสรุป "ทำแล้ว X จาก Y ครั้ง" ลดจาก 18px เป็น 16px ฐานเก่าจึงปรับ 18→16 จุดเดียวในหน่วยความจำ ที่เหลือยังต้องตรงทุกไบต์ */
const OLDJS = execFileSync('git', ['show', BASE + ':app/web/js/react/stats.js'], { cwd: root, encoding: 'utf8' }).replace('fontSize:"18px",fontWeight:600,lineHeight:1.35', 'fontSize:"16px",fontWeight:600,lineHeight:1.35');
const NEWJS = fs.readFileSync(root + '/app/web/js/react/stats.js', 'utf8');
const oldR = load(OLDJS), newR = load(NEWJS);
// ข้อมูล: ใช้ชุดเดียวกับ core_equiv (รวมกิจวัตรขอบเกณฑ์) แล้วให้ฝั่งเดิมคำนวณ props ด้วยชั้นฐานที่ตรวจเทียบต้นฉบับแล้ว
const src = fs.readFileSync(root + '/tests/core_equiv.test.mjs', 'utf8');
const m = src.match(/const mk = [\s\S]*?const DATES/); if (!m) { console.log('FAIL: ดึงชุดข้อมูลจาก core_equiv ไม่ได้'); process.exit(1); }
const FIX = new RD('2026-10-17T05:30:00Z'); const FIXED_ = FIX;
const body = m[0].replace(/const DATES$/, '').replace(/FIXED/g, 'FIXED_').replace(/RealDate/g, 'RD');
const ITEMS = new Function('FIXED_', 'RD', body + '; return ITEMS;')(FIXED_, RD);
const tmp = fs.mkdtempSync((process.env.TMPDIR || '/tmp') + '/hq-'); execFileSync(process.execPath, [root + '/node_modules/typescript/bin/tsc', '--ignoreConfig', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--lib', 'dom,esnext', '--outDir', tmp, root + '/app/src/core/stats.ts']);
fs.writeFileSync(tmp + '/package.json', '{"type":"module"}');
for (const f of ['dates', 'schedule', 'stats']) { const p = tmp + '/' + f + '.js'; fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.js'")); }
const T = await import(tmp + '/stats.js'); const TODAY = T && (await import(tmp + '/dates.js')).ymd(new Date());
let n = 0, fail = 0;
for (const per of ['week', 'month']) {
  const props = T.buildStatsProps(ITEMS, per, TODAY);
  const a = oldR(props), b = newR({ items: ITEMS, period: per, today: TODAY });
  n++; if (a !== b) { fail++; let i = 0; while (a[i] === b[i]) i++; console.log('FAIL', per, 'ต่างที่ตำแหน่ง', i, '\n old:', a.slice(Math.max(0,i-60), i+80), '\n new:', b.slice(Math.max(0,i-60), i+80)); }
  else console.log('ตรงทุกไบต์', per, a.length, 'อักษร');
}
// หน้ารายการ: ฉบับก่อนหน้า (รับ sections สำเร็จรูป) กับฉบับปัจจุบัน (คำนวณเองจาก items/type/iconOf) ใช้ icon จากตาราง ICONS จริงของ 01-constants
{
  const consts = fs.readFileSync(root + '/app/web/js/m/core/constants.js', 'utf8'); const im = consts.match(/const ICONS\s*=\s*(\{[^\n]*?\});/) || consts.match(/const ICONS\s*=\s*(\{[\s\S]*?\n\})/) || consts.match(/const ICONS\s*=\s*(\{[\s\S]*?\});/);
  if (!im) { n++; fail++; console.log('FAIL: ดึงตาราง ICONS ไม่ได้'); }
  else {
    const ICONS = new Function('return ' + im[1])(); const icon = (nm) => `<svg class="ev-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[nm]}"/></svg>`;
    const OLDALL = execFileSync('git', ['show', BASE_ALL + ':app/web/js/react/all.js'], { cwd: root, encoding: 'utf8' });
    const NEWALL = fs.readFileSync(root + '/app/web/js/react/all.js', 'utf8');
    const loadAll = (src) => { window.EvarelPages = {}; (0, eval)(src); return window.EvarelPages.all; };
    const oldA = loadAll(OLDALL), newA = loadAll(NEWALL);
    for (const type of ['all', 'habit', 'task', 'class']) {
      const sections = T.buildAllProps(ITEMS, type, icon).sections;
      const a = oldA({ sections }), b = newA({ items: ITEMS, type, iconOf: icon });
      n++; if (a !== b) { fail++; let i = 0; while (a[i] === b[i]) i++; console.log('FAIL all', type, 'ต่างที่', i, '\n old:', a.slice(Math.max(0,i-60), i+80), '\n new:', b.slice(Math.max(0,i-60), i+80)); }
      else console.log('ตรงทุกไบต์ all', type, a.length, 'อักษร');
    }
  }
}
console.log(`เทียบ HTML ${n} กรณี | ต่างกัน ${fail}`); process.exit(fail ? 1 : 0);

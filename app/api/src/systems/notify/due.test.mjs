// เทสต์ due.ts: รอยต่อ (seam) = occursOnStr(item, 'YYYY-MM-DD') เท่านั้น
// แหล่งความจริงอิสระ: occursOn ตัวจริงของแอป (app/web/js/m/06-services__schedule.js) ที่ผ่านประตูภาพ 0 พิกเซลมาแล้ว
// เทสต์ดึงฟังก์ชันนั้นมารันจริง ไม่คำนวณค่าคาดหวังซ้ำด้วยตรรกะของ due.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, '../../../../web/js/m/06-services__schedule.js'), 'utf8');
const datesSrc = readFileSync(join(here, '../../../../web/js/m/02-core__dates.js'), 'utf8');
const constSrc = readFileSync(join(here, '../../../../web/js/m/01-core__constants.js'), 'utf8');

// ดึง occursOn ตัวจริงของแอปด้วยการนับวงเล็บปีกกา (ทนต่อการ format ไฟล์ ไม่ผูกกับรูปแบบช่องว่าง)
// และประกอบตัวช่วยวันที่ที่มันใช้ (pad, ymd, parse, addDays, DAY_MS) จากค่านิยามเดียวกับแอป
const grabFn = (src, name) => {
  const i = src.indexOf(`function ${name}(`); if (i < 0) throw new Error('ไม่พบฟังก์ชัน ' + name);
  const open = src.indexOf('{', src.indexOf(')', i)); let depth = 0, j = open;
  for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break; }
  return src.slice(i, j + 1);
};
const grabConst = (src, name) => {
  const m = src.match(new RegExp(`export const ${name}\\s*=\\s*([^\\n]+)`)); if (!m) throw new Error('ไม่พบค่า ' + name);
  return `const ${name} = ${m[1].replace(/;\\s*$/, '')};`;
};
const code = [
  grabConst(datesSrc, 'pad'), grabConst(constSrc, 'DAY_MS'), grabConst(datesSrc, 'ymd'),
  grabConst(datesSrc, 'parse'), grabConst(datesSrc, 'addDays'), grabFn(appSrc, 'occursOn'),
].join('\n');
const sandbox = { out: null }; vm.createContext(sandbox);
vm.runInContext(code + '\nout={occursOn};', sandbox);
export const appOccursOn = sandbox.out.occursOn;

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${join(here, 'due.ts')} --bundle --format=esm --outfile=/tmp/notify-due-bundle.mjs --log-level=error`);
const { occursOnStr } = await import(pathToFileURL('/tmp/notify-due-bundle.mjs').href + '?v=' + Date.now());
let pass = 0, fail = 0; const bad = [];
const ok = (name, c, v = '') => { if (c) { pass++; console.log('PASS ' + name); } else { fail++; bad.push(name); console.log('FAIL ' + name + (v !== '' ? ' | ' + v : '')); } };

if (!occursOnStr) { ok('T0 due.ts ส่งออก occursOnStr', false, 'ยังไม่มีโมดูล (red ตามที่คาด)'); }
else {
  // T1: ชิ้นแรก (tracer bullet) รายการวันเดียว
  ok('T1 repeat none: ตรงวันเริ่มเท่านั้น', occursOnStr({ start: '2026-10-13', end: '', repeat: { unit: 'none', every: 1, days: [] } }, '2026-10-13') === true
    && occursOnStr({ start: '2026-10-13', end: '', repeat: { unit: 'none', every: 1, days: [] } }, '2026-10-14') === false);

  // T2: เทียบสุ่มกับ occursOn ตัวจริงของแอป (ตัวสร้างสุ่มแบบกำหนดเมล็ด ทำซ้ำได้)
  let seed = 20261013; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmt = (dn) => { const d = new Date(dn * 86400000); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };
  const base = Math.round(Date.UTC(2025, 0, 1) / 86400000);
  let n = 0, mism = [];
  for (let i = 0; i < 6000; i++) {
    const unit = ['none', 'day', 'week', 'month'][ri(0, 3)];
    const start = fmt(base + ri(0, 900));
    const end = rnd() < 0.3 ? fmt(base + ri(0, 1100)) : '';
    const days = unit === 'week' ? [...new Set(Array.from({ length: ri(1, 4) }, () => ri(0, 6)))] : [];
    const it = { start, end, repeat: { unit, every: ri(1, 5), days } };
    const ds = fmt(base + ri(0, 1100));
    n++;
    if (occursOnStr(it, ds) !== appOccursOn(it, ds)) { if (mism.length < 3) mism.push({ it, ds, app: appOccursOn(it, ds), worker: occursOnStr(it, ds) }); }
  }
  ok(`T2 ตรงกับ occursOn ของแอป ${n} กรณีสุ่ม (ต้องไม่มีต่าง)`, mism.length === 0, JSON.stringify(mism[0] || ''));

  // T3: เจาะขอบเขต วันทดสอบสร้างจากตัวรายการ (วันเริ่ม/สิ้นสุด ±1 และวันที่ตรงรอบ) เพื่อให้ผลจริงมีสัดส่วนพอและโดนขอบ
  let n3 = 0, t3 = 0, mism3 = []; const byU = { none: [0, 0], day: [0, 0], week: [0, 0], month: [0, 0] };
  for (let i = 0; i < 4000; i++) {
    const unit = ['none', 'day', 'week', 'month'][ri(0, 3)];
    const s = base + ri(0, 700);
    const days = unit === 'week' ? [...new Set(Array.from({ length: ri(1, 4) }, () => ri(0, 6)))] : [];
    const every = ri(1, 4);
    const e = rnd() < 0.6 ? s + ri(0, 400) : null;
    const it = { start: fmt(s), end: e === null ? '' : fmt(e), repeat: { unit, every, days } };
    const cand = new Set([s - 1, s, s + 1, s + every, s + 7 * every, s + 28 * every, s + 30 * every, s + 31 * every, s + 365]);
    if (e !== null) { cand.add(e - 1); cand.add(e); cand.add(e + 1); }
    for (let k = 0; k < 6; k++) cand.add(s + ri(0, 500));
    for (const dn of cand) {
      const ds = fmt(dn); const a = appOccursOn(it, ds), w = occursOnStr(it, ds); n3++; byU[unit][1]++;
      if (a) { t3++; byU[unit][0]++; }
      if (a !== w && mism3.length < 3) mism3.push({ it, ds, app: a, worker: w });
    }
  }
  ok(`T3 ขอบเขตและรอบเกิดซ้ำ ${n3} กรณี (true ${t3}) ตรงแอปทุกกรณี`, mism3.length === 0, JSON.stringify(mism3[0] || ''));
  ok('T3b สัดส่วนผลจริงพอพิสูจน์ได้ (ทุก unit ที่ซ้ำ true >= 200)', ['day', 'week', 'month'].every((u) => byU[u][0] >= 200), JSON.stringify(byU));
}
console.log(`\nผ่าน ${pass} | ตก ${fail}`);
process.exit(fail ? 1 : 0);

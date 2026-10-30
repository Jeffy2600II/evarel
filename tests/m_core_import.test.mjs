// F6: ชั้น m/ import ตรรกะจาก core/ ผ่านไฟล์ app/web/js/m/core/*.js (compile-ts.mjs สร้างจาก app/src/core/*.ts) สถิต ไม่เปิดเบราว์เซอร์
// จับ 4 อย่าง: (1) ทุก import ./core/X.js ใน js/m/*.js มีไฟล์จริง (2) อยู่ใน CORE ของ app/web/sw.js (ไม่งั้นออฟไลน์พังเงียบ) (3) import ภายใน core/*.js มีนามสกุล .js และไฟล์จริง
// (4) ไฟล์ใน js/m/core/ ทุกตัวมีต้นทาง app/src/core/<ชื่อ>.ts (กันไฟล์ผีค้างหลัง core ถูกลบ)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mDir = path.join(root, 'app/web/js/m'), cDir = path.join(mDir, 'core'), srcCore = path.join(root, 'app/src/core');
let pass = 0, fail = 0; const t = (name, ok, detail = '') => { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + detail)); };
const sw = fs.readFileSync(path.join(root, 'app/web/sw.js'), 'utf8'); const cm = /const CORE = \[([\s\S]*?)\n\s*\];/.exec(sw);
const core = cm ? [...cm[1].matchAll(/'(\.\/[^']+)'/g)].map((x) => x[1]) : []; t('อ่าน CORE ของ sw.js ได้', core.length >= 20, 'ได้ ' + core.length);
const imports = []; /* [ไฟล์ m, ชื่อ core] */
for (const f of fs.readdirSync(mDir).filter((x) => x.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(mDir, f), 'utf8');
  for (const m of s.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;\n]*?from\s+['"]\.\/core\/([A-Za-z0-9_-]+)\.js['"]/g)) imports.push([f, m[1]]);
}
t('มี import ./core/ ใน m/ อย่างน้อย 1 จุด (ไม่งั้นเทสต์นี้ว่างเปล่า)', imports.length >= 1, 'พบ ' + imports.length);
for (const [f, n] of imports) {
  t(`${f} -> core/${n}.js มีไฟล์จริง`, fs.existsSync(path.join(cDir, n + '.js')));
  t(`${f} -> core/${n}.js อยู่ใน CORE ของ sw.js`, core.includes(`./js/m/core/${n}.js`), 'ขาด ./js/m/core/' + n + '.js');
}
for (const f of fs.existsSync(cDir) ? fs.readdirSync(cDir).filter((x) => x.endsWith('.js')) : []) {
  const s = fs.readFileSync(path.join(cDir, f), 'utf8');
  t(`core/${f} มีต้นทาง app/src/core/${f.replace(/\.js$/, '.ts')}`, fs.existsSync(path.join(srcCore, f.replace(/\.js$/, '.ts'))));
  for (const m of s.matchAll(/from\s+["'](\.[^"']+)["']/g)) t(`core/${f} import ${m[1]} มี .js และไฟล์จริง`, /\.js$/.test(m[1]) && fs.existsSync(path.join(cDir, m[1])), m[1]);
}
for (const c of core.filter((x) => x.startsWith('./js/m/core/'))) t(`CORE ${c} มีไฟล์จริง`, fs.existsSync(path.join(root, 'app/web', c.slice(2))));
console.log(`\nผล: ${pass} ผ่าน ${fail} ตก`); process.exit(fail ? 1 : 0);

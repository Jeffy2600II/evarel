// คอมไพล์ app/src/m/*.ts -> app/web/js/m/*.js ด้วย tsc (ไม่ bundle คงชื่อและลำดับไฟล์เดิม)
// tsc คืน exit 2 เมื่อมี error ชนิด (ราว 300 จุดที่ตรวจแล้วว่าไม่ส่งผลตอนรัน) แต่ยังปล่อยไฟล์ครบ (noEmitOnError=false)
// จึงตัดสินจากสิ่งที่ตรวจได้จริง: ไฟล์ออกครบ 26 ไฟล์, ไม่มี error ไวยากรณ์ (TS1xxx), และทุกไฟล์ผ่าน node --check
// ใช้: node scripts/compile-ts.mjs
import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = join(root, 'node_modules/typescript/bin/tsc');
if (!existsSync(tsc)) { console.error('ยังไม่ได้ติดตั้ง typescript: รัน npm install'); process.exit(2); }
const srcs = readdirSync(join(root, 'app/src/m')).filter((f) => f.endsWith('.ts'));
const r = spawnSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.json')], { cwd: root, encoding: 'utf8' });
const out = (r.stdout || '') + (r.stderr || '');
const syntax = out.split('\n').filter((l) => /error TS1\d{3}:/.test(l));
if (r.status !== 0 && r.status !== 2) { console.error('tsc ล้มเหลวผิดปกติ exit=' + r.status + '\n' + out.slice(0, 600)); process.exit(1); }
if (syntax.length) { console.error('พบ error ไวยากรณ์ ' + syntax.length + ' จุด:\n' + syntax.slice(0, 5).join('\n')); process.exit(1); }
const missing = srcs.filter((f) => !existsSync(join(root, 'app/web/js/m', f.replace(/\.ts$/, '.js'))));
if (missing.length) { console.error('ไฟล์ผลหาย: ' + missing.join(', ')); process.exit(1); }
for (const f of srcs) {
  const c = spawnSync(process.execPath, ['--check', join(root, 'app/web/js/m', f.replace(/\.ts$/, '.js'))], { encoding: 'utf8' });
  if (c.status !== 0) { console.error('node --check ไม่ผ่าน: ' + f + '\n' + c.stderr.slice(0, 300)); process.exit(1); }
}
const n = (out.match(/error TS\d+/g) || []).length;
console.log(`คอมไพล์ ${srcs.length} ไฟล์แล้ว (error ชนิด ${n} จุด ไม่ส่งผลตอนรัน)`);

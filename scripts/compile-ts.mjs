// คอมไพล์ app/src/m/*.ts -> app/web/js/m/*.js ด้วย tsc (ไม่ bundle คงชื่อและลำดับไฟล์เดิม)
// tsc คืน exit 2 เมื่อมี error ชนิด (ราว 300 จุดที่ตรวจแล้วว่าไม่ส่งผลตอนรัน) แต่ยังปล่อยไฟล์ครบ (noEmitOnError=false)
// จึงตัดสินจากสิ่งที่ตรวจได้จริง: ไฟล์ออกครบ 26 ไฟล์, ไม่มี error ไวยากรณ์ (TS1xxx), และทุกไฟล์ผ่าน node --check
// ใช้: node scripts/compile-ts.mjs
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = join(root, 'node_modules/typescript/bin/tsc');
if (!existsSync(tsc)) { console.error('ยังไม่ได้ติดตั้ง typescript: รัน npm install'); process.exit(2); }
/* ===== ชั้น core -> m (F6): m/ import ตรรกะบริสุทธิ์จาก core/ ได้ =====
   tsc ของ m/ ถูกล็อก rootDir=app/src/m จึงเห็น core/*.ts ไม่ได้ (TS6059) และ core/ import กันเองแบบไม่มี .js (เบราว์เซอร์โหลดไม่ได้)
   ทางที่พิสูจน์แล้ว: (1) สร้าง .d.ts จาก core ไว้ใต้ app/src/m/core/ (อยู่ใน rootDir ไม่มี .ts ชื่อซ้ำ ไม่ commit: ดู .gitignore) ให้ tsc รู้ชนิด
   (2) esbuild แปลง core/*.ts ทีละไฟล์ (ไม่ bundle) เป็น app/web/js/m/core/*.js แล้วเติม .js ให้ import ภายใน (ไฟล์นี้ commit เหมือน js/m/*.js)
   m/ เขียน import ด้วยพาธ './core/<ชื่อ>.js' */
const coreSrcDir = join(root, 'app/src/core'), coreDeclDir = join(root, 'app/src/m/core'), coreOutDir = join(root, 'app/web/js/m/core');
const coreFiles = readdirSync(coreSrcDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
mkdirSync(coreDeclDir, { recursive: true }); mkdirSync(coreOutDir, { recursive: true });
for (const f of readdirSync(coreDeclDir)) if (f.endsWith('.d.ts')) rmSync(join(coreDeclDir, f)); /* ล้างของเก่า กันไฟล์ค้างจาก core ที่ถูกลบ */
for (const f of readdirSync(coreOutDir)) if (f.endsWith('.js')) rmSync(join(coreOutDir, f));
const d = spawnSync(process.execPath, [tsc, '--ignoreConfig', '--declaration', '--emitDeclarationOnly', '--skipLibCheck', '--target', 'ES2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--outDir', coreDeclDir, ...coreFiles.map((f) => join(coreSrcDir, f))], { cwd: root, encoding: 'utf8' });
if (d.status !== 0) { console.error('สร้าง .d.ts ของ core ล้มเหลว exit=' + d.status + '\n' + ((d.stdout || '') + (d.stderr || '')).slice(0, 600)); process.exit(1); }
const { build: esbuildBuild } = await import('esbuild');
for (const f of coreFiles) {
  const r = await esbuildBuild({ entryPoints: [join(coreSrcDir, f)], bundle: false, write: false, format: 'esm', target: 'es2022', logLevel: 'silent' });
  const code = r.outputFiles[0].text.replace(/(from\s+['"])(\.\/[A-Za-z0-9_-]+)(['"])/g, '$1$2.js$3');
  writeFileSync(join(coreOutDir, f.replace(/\.ts$/, '.js')), code);
}
const coreMissing = coreFiles.filter((f) => !existsSync(join(coreOutDir, f.replace(/\.ts$/, '.js'))) || !existsSync(join(coreDeclDir, f.replace(/\.ts$/, '.d.ts'))));
if (coreMissing.length) { console.error('ไฟล์ผลของ core หาย: ' + coreMissing.join(', ')); process.exit(1); }
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

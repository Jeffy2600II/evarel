// สร้าง build/web จาก Next จริง (S4 next-pages ไบต์ N4 — สลับจากโหมดปล่อยผ่านของ S3)
// หน้าสร้างโดย Next (web-next/src/app: layout.tsx+page.tsx) เครื่องยนต์ 26 โมดูลอยู่ในบันเดิลของ Next
// ผลลัพธ์ไม่มี js/m ในเส้นทางเสิร์ฟอีกต่อไป (ตัวตรวจในสคริปต์นี้) และ EVAREL_API อบตอน build ผ่าน NEXT_PUBLIC_EVAREL_API
// ใช้: node scripts/build-web.mjs <forge|production>
import { cpSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// คอมไพล์ app.css จาก design.css ด้วย Tailwind CLI ก่อนทุก build กันเสิร์ฟ CSS ค้าง
execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'build-css.mjs')], { stdio: 'inherit' });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = {
  forge: 'https://evarel-api-forge.nontakorn2600.workers.dev',
  production: 'https://evarel-api.nontakorn2600.workers.dev',
};
const env = process.argv[2];
if (!Object.hasOwn(API, env)) { console.error('ระบุสภาพแวดล้อม: forge หรือ production'); process.exit(2); }

const OUT = join(root, 'build/web');
const NEXT_OUT = join(root, 'web-next/out');

execFileSync(process.execPath, [join(root, 'scripts/build-next.mjs'), env], { cwd: root, stdio: 'inherit' });
if (!existsSync(join(NEXT_OUT, 'index.html'))) { console.error('next build ไม่สร้าง out/index.html'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
cpSync(NEXT_OUT, OUT, { recursive: true });

/* ตัวตรวจข้อ 6 ของเป้าหมาย: ห้ามมีโมดูลแอปแบบ window หรือ index.html เดิมในเส้นทางเสิร์ฟ */
if (existsSync(join(OUT, 'js/m'))) { console.error('build/web มี js/m — ห้ามเสิร์ฟโมดูล window เดิม'); process.exit(1); }
const idx = join(OUT, 'index.html');
if (!readFileSync(idx, 'utf8').includes(API[env])) { console.error('EVAREL_API ไม่ถูกอบลง index.html ตามสภาพแวดล้อม'); process.exit(1); }

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const total = walk(OUT).length;
if (total < 10) { console.error(`build ผิดปกติ: มีเพียง ${total} ไฟล์`); process.exit(1); }
console.log(`สร้าง ${OUT} (${total} ไฟล์) จาก Next สำหรับ ${env} แล้ว (API = ${API[env]})`);

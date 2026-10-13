// สร้าง build/web จาก app/web สำหรับ deploy (ผลลัพธ์อยู่นอกซอร์ส ไม่ปนกัน)
// ฉีดที่อยู่ API ของชุดนั้นลงใน index.html (บรรทัดเดียว) แล้วคัดลอกไฟล์ที่เหลือตามเดิมทุกไบต์
// ใช้: node scripts/build-web.mjs <forge|production>
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = {
  forge: 'https://evarel-api-forge.nontakorn2600.workers.dev',
  production: 'https://evarel-api.nontakorn2600.workers.dev',
};
const env = process.argv[2];
if (!API[env]) { console.error('ระบุสภาพแวดล้อม: forge หรือ production'); process.exit(2); }

const src = join(root, 'app/web');
const out = join(root, 'build/web');
if (!existsSync(join(src, 'index.html'))) { console.error('ไม่พบ app/web/index.html'); process.exit(2); }

rmSync(out, { recursive: true, force: true });
cpSync(src, out, {
  recursive: true,
  filter: (p) => !/(^|[\\/])(node_modules|wrangler\.toml|\.wrangler)([\\/]|$)/.test(p) && !/\.bak/.test(p),
});

const marker = "<script>window.EVAREL_API = window.EVAREL_API || '';</script>";
const idx = join(out, 'index.html');
const html = readFileSync(idx, 'utf8');
if (html.split(marker).length !== 2) { console.error('ไม่พบบรรทัดฉีด EVAREL_API ที่คาดไว้ใน index.html (ต้องมี 1 จุดพอดี)'); process.exit(1); }
writeFileSync(idx, html.replace(marker, `<script>window.EVAREL_API=${JSON.stringify(API[env])};</script>` + marker));
const walk = (d) => readdirSync(d).reduce((n, f) => n + (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : 1), 0);
const total = walk(out);
if (total < 10) { console.error(`build ผิดปกติ: มีเพียง ${total} ไฟล์`); process.exit(1); }
console.log(`สร้าง ${out} (${total} ไฟล์) สำหรับ ${env} แล้ว (API = ${API[env]})`);

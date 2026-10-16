// สร้าง build/web จาก app/web สำหรับ deploy (ผลลัพธ์อยู่นอกซอร์ส ไม่ปนกัน)
// ขั้น S3: ครอบด้วย Next.js แบบปล่อยไฟล์ผ่านตรงๆ (output export) ไฟล์แอปคงอยู่ที่ app/web ที่เดียว
//   1) คัดลอก app/web เข้า public ชั่วคราว (Next ไม่มีตัวเลือกตั้งพาธ public) 2) next build 3) ตรวจว่า out/ มีไฟล์แอปตรงทุกไบต์
//   4) ฉีดที่อยู่ API ของชุดนั้นลงใน index.html (บรรทัดเดียว) 5) ส่งต่อไป build/web  public ถูกลบเสมอแม้ล้มกลางทาง
// ใช้: node scripts/build-web.mjs <forge|production>
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = {
  forge: 'https://evarel-api-forge.nontakorn2600.workers.dev',
  production: 'https://evarel-api.nontakorn2600.workers.dev',
};
const env = process.argv[2];
if (!API[env]) { console.error('ระบุสภาพแวดล้อม: forge หรือ production'); process.exit(2); }

const SRC = join(root, 'app/web');
const SHELL = join(root, 'web-shell');   // โครง Next แยกจากราก (Next เลือก ./app ที่รากก่อน ./src/app และรากมี app/ ของโปรเจกต์อยู่แล้ว)
const PUB = join(SHELL, 'public');       // ชั่วคราว: อยู่ใน .gitignore ลบทิ้งท้ายงานเสมอ
const NEXT_OUT = join(SHELL, 'out');
const OUT = join(root, 'build/web');
const IGNORE = /(^|[\\/])(node_modules|wrangler\.toml|\.wrangler)([\\/]|$)|\.bak/;
if (!existsSync(join(SRC, 'index.html'))) { console.error('ไม่พบ app/web/index.html'); process.exit(2); }

const walk = (d, base = d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name), base) : [relative(base, join(d, e.name))]);
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

// กันพลาดเงียบ: ถ้ามีหน้าของ Next (page) ปรากฏ index.html ของแอปจะถูกเขียนทับ
for (const f of ['app/page.js', 'app/page.jsx', 'app/page.tsx', 'src/app/page.js', 'src/app/page.jsx', 'src/app/page.tsx', 'pages/index.js', 'pages/index.jsx']) {
  if (existsSync(join(SHELL, f))) { console.error(`พบ web-shell/${f}: ห้ามมีหน้าของ Next เพราะจะเขียนทับ index.html ของแอป`); process.exit(1); }
}
if (!existsSync(join(SHELL, 'node_modules/next/dist/bin/next'))) { console.error('ยังไม่ได้ติดตั้งแพ็กเกจของ web-shell: รัน  npm install --prefix web-shell'); process.exit(2); }

try {
  rmSync(PUB, { recursive: true, force: true }); rmSync(NEXT_OUT, { recursive: true, force: true });
  cpSync(SRC, PUB, { recursive: true, filter: (p) => !IGNORE.test(p) });
  execFileSync(process.execPath, [join(SHELL, 'node_modules/next/dist/bin/next'), 'build'], { cwd: SHELL, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
  if (!existsSync(join(NEXT_OUT, 'index.html'))) { console.error('next build ไม่สร้าง out/index.html'); process.exit(1); }
  // ทุกไฟล์ของแอปต้องออกมาตรงทุกไบต์ ไม่งั้นหยุด ไม่ deploy ของที่ Next แก้ไป
  const bad = [];
  for (const rel of walk(PUB)) { const q = join(NEXT_OUT, rel); if (!existsSync(q)) bad.push(`หาย ${rel}`); else if (sha(join(PUB, rel)) !== sha(q)) bad.push(`ต่าง ${rel}`); }
  if (bad.length) { console.error(`ผลของ Next ไม่ตรงไฟล์แอป ${bad.length} ไฟล์: ${bad.slice(0, 5).join(', ')}`); process.exit(1); }

  rmSync(OUT, { recursive: true, force: true });
  cpSync(NEXT_OUT, OUT, { recursive: true });
} finally {
  rmSync(PUB, { recursive: true, force: true });
}


const marker = "<script>window.EVAREL_API = window.EVAREL_API || '';</script>";
const idx = join(OUT, 'index.html');
const html = readFileSync(idx, 'utf8');
if (html.split(marker).length !== 2) { console.error('ไม่พบบรรทัดฉีด EVAREL_API ที่คาดไว้ใน index.html (ต้องมี 1 จุดพอดี)'); process.exit(1); }
writeFileSync(idx, html.replace(marker, `<script>window.EVAREL_API=${JSON.stringify(API[env])};</script>` + marker));
const total = walk(OUT).length;
if (total < 10) { console.error(`build ผิดปกติ: มีเพียง ${total} ไฟล์`); process.exit(1); }
console.log(`สร้าง ${OUT} (${total} ไฟล์) สำหรับ ${env} แล้ว (API = ${API[env]})`);

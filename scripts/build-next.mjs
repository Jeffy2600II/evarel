// S4 next-pages ไบต์ N1: build ขนาน — Next สร้างหน้าจริง (src/app มี layout.tsx/page.tsx) บันเดิลเครื่องยนต์ทั้งหมด
// ผลลัพธ์ที่ web-next/out แยกจาก build/web เดิม (S3 passthrough) — ทั้งสองอยู่ร่วมกันจนกว่า parity ของของใหม่ผ่านครบจึงสลับ
// ใช้: node scripts/build-next.mjs <forge|production|local>
import { cpSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = {
  local: '',
  forge: 'https://evarel-api-forge.nontakorn2600.workers.dev',
  production: 'https://evarel-api.nontakorn2600.workers.dev',
};
const env = process.argv[2] || 'forge';
if (!Object.hasOwn(API, env)) { console.error('ระบุสภาพแวดล้อม: local | forge | production'); process.exit(2); }

const SRC = join(root, 'app/web');
const NEXT_DIR = join(root, 'web-next');
const PUB = join(NEXT_DIR, 'public');
const OUT = join(NEXT_DIR, 'out');

if (!existsSync(join(NEXT_DIR, 'node_modules/next/dist/bin/next'))) { console.error('ยังไม่ได้ติดตั้งแพ็กเกจของ web-next (symlink จาก web-shell หรือ npm install)'); process.exit(2); }

// คอมไพล์ .ts เป็น .js ก่อนเสมอ (บันเดิลอ่าน js/m/*.js)
execFileSync(process.execPath, [join(root, 'scripts/compile-ts.mjs')], { cwd: root, stdio: 'inherit' });

try {
  // public: เฉพาะสินทรัพย์ที่โหลดผ่าน URL จริง — ไม่มี js/m (อยู่ในบันเดิล) ไม่มี index.html (Next สร้าง) ไม่มี sw.js (ขั้น N3)
  rmSync(PUB, { recursive: true, force: true });
  for (const a of ['styles', 'icons', 'fonts', 'vendor', 'js/react']) cpSync(join(SRC, a), join(PUB, a), { recursive: true });
  cpSync(join(SRC, 'manifest.webmanifest'), join(PUB, 'manifest.webmanifest'));

  rmSync(OUT, { recursive: true, force: true });
  execFileSync(process.execPath, [join(NEXT_DIR, 'node_modules/next/dist/bin/next'), 'build'], {
    cwd: NEXT_DIR, stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_EVAREL_API: API[env] },
  });
  if (!existsSync(join(OUT, 'index.html'))) { console.error('next build ไม่สร้าง out/index.html'); process.exit(1); }
  // ตัวตรวจข้อ 6: ห้ามมีโมดูลแอปแบบ window ในเส้นทางเสิร์ฟ
  if (existsSync(join(OUT, 'js/m'))) { console.error('out/js/m หลุดเข้าเส้นทางเสิร์ฟ — ตรวจ build'); process.exit(1); }

  // N3: เจน sw.js ของ build นี้จากตรรกะเดิมของ app/web/sw.js — เปลี่ยนเฉพาะ VERSION (แฮชของ build) กับ CORE (ไฟล์จริงใน out/)
  // รายการแคชสแกนจากดิสก์จริงทุกครั้ง กัน drift รายการแคชกับไฟล์ที่เสิร์ฟ (ชื่อ chunk ของ Next เปลี่ยนทุก build)
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  const rel = (f) => './' + f.slice(OUT.length + 1).split('\\').join('/');
  const files = walk(OUT)
    .filter(f => !/\.(txt|html)$|(^|\/)sw\.js$|(^|\/)404\.html$/.test(f) || f.endsWith('index.html'))
    .map(rel);
  const CORE = ['./', './index.html', ...files.filter(f => f !== './index.html')];
  const digest = createHash('sha256').update(CORE.join('\n')).digest('hex').slice(0, 12);
  const swSrc = readFileSync(join(root, 'app/web/sw.js'), 'utf8');
  const sw = swSrc
    .replace(/const VERSION = '[^']*';/, `const VERSION = 'evarel-next-${digest}';`)
    .replace(/const CORE = \[[\s\S]*?\];/, 'const CORE = ' + JSON.stringify(CORE, null, 2).replace(/\n/g, '\n  ') + ';');
  if (!sw.includes('evarel-next-')) { console.error('เจน sw.js ไม่สำเร็จ (VERSION ไม่ถูกแทน)'); process.exit(1); }
  writeFileSync(join(OUT, 'sw.js'), sw);
  console.log(`NEXT-BUILD OK (${env}) -> ${OUT} | sw evarel-next-${digest} | แคช ${CORE.length} ไฟล์`);
} finally {
  rmSync(PUB, { recursive: true, force: true });
}

// S4 next-pages ไบต์ N1: build ขนาน — Next สร้างหน้าจริง (src/app มี layout.tsx/page.tsx) บันเดิลเครื่องยนต์ทั้งหมด
// ผลลัพธ์ที่ web-next/out แยกจาก build/web เดิม (S3 passthrough) — ทั้งสองอยู่ร่วมกันจนกว่า parity ของของใหม่ผ่านครบจึงสลับ
// ใช้: node scripts/build-next.mjs <forge|production|local>
import { parseVersion } from './version-rules.mjs';
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

  /* รหัสเนื้อหาไฟล์ชื่อคงที่ (styles/fonts/vendor/js/react) รู้ได้ก่อน next build จึงส่งให้ layout ใส่ ?v= ตั้งแต่ต้นทาง
     (ถ้าแก้ HTML ทีหลัง React จะ hydrate ด้วยค่าคนละตัว = error #418) */
  const walkFiles = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkFiles(join(d, e.name)) : [join(d, e.name)]);
  const fixedHash = createHash('sha256');
  for (const a of ['styles', 'fonts', 'vendor', 'js/react']) for (const f of walkFiles(join(PUB, a)).sort()) fixedHash.update(f.slice(PUB.length) + ':').update(readFileSync(f));
  const ASSET_V = fixedHash.digest('hex').slice(0, 12);
  /* เลขเวอร์ชันที่ผู้ใช้เห็น (รวมช่อง) รู้ได้ก่อน next build จึงส่งให้ layout ฝังใน HTML: หน้าบอกได้เองว่ากำลังรันเวอร์ชันไหน ไม่ต้องพึ่ง SW */
  const REL_VERSION = JSON.parse(readFileSync(join(root, 'releases/current.json'), 'utf8')).version + (env === 'production' ? '' : '-' + env);
  rmSync(OUT, { recursive: true, force: true });
  execFileSync(process.execPath, [join(NEXT_DIR, 'node_modules/next/dist/bin/next'), 'build'], {
    cwd: NEXT_DIR, stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_EVAREL_API: API[env], NEXT_PUBLIC_EVAREL_ASSET_V: ASSET_V, NEXT_PUBLIC_EVAREL_VERSION: REL_VERSION },
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
  /* digest = รายชื่อไฟล์ + เนื้อโน้ตรุ่น: เปลี่ยนโน้ตเมื่อไรก็ได้ build ใหม่เสมอ ผู้ใช้เก่าจึงเห็นรุ่นใหม่แน่นอน (ไม่พึ่งแฮชชื่อ chunk ของ Next) */
  const relFile = join(root, 'releases/current.json');
  const relRaw = existsSync(relFile) ? readFileSync(relFile, 'utf8') : '';
  /* ไฟล์ชื่อคงที่ (นอก _next/) ต้องนับ "เนื้อหา" เข้า digest ด้วย: ไม่งั้นแก้ app.css แล้ว digest เท่าเดิม ?v= ไม่เปลี่ยน ผู้ใช้ไม่ได้ของใหม่ */
  const fixedBody = files.filter(f => !f.startsWith('./_next/') && f !== './index.html' && f !== './release.json')
    .map(f => f + ':' + createHash('sha256').update(readFileSync(join(OUT, f.slice(2)))).digest('hex')).join('\n');
  const digest = createHash('sha256').update(CORE.join('\n') + '\n--fixed--\n' + fixedBody + '\n--asset--\n' + ASSET_V + '\n--release--\n' + relRaw).digest('hex').slice(0, 12);
  const swSrc = readFileSync(join(root, 'app/web/sw.js'), 'utf8');
  const sw = swSrc
    .replace(/const VERSION = '[^']*';/, `const VERSION = 'evarel-next-${digest}';`)
    .replace(/const CORE = \[[\s\S]*?\];/, 'const CORE = ' + JSON.stringify(CORE, null, 2).replace(/\n/g, '\n  ') + ';');
  if (!sw.includes('evarel-next-')) { console.error('เจน sw.js ไม่สำเร็จ (VERSION ไม่ถูกแทน)'); process.exit(1); }
  writeFileSync(join(OUT, 'sw.js'), sw);

  // ระบบอัปเดต: release.json = แหล่งความจริงของรุ่น build ตรงกับ VERSION ของ sw.js เสมอ (digest เดียวกัน)
  // การบังคับ "ทุกอัปเดตต้องมีโน้ตใหม่" อยู่ที่ scripts/check-release-notes.mjs (เทียบกับ git) ไม่ผูกกับ build เพื่อให้ build ซ้ำทดสอบได้
  const relSrc = JSON.parse(readFileSync(join(root, 'releases/current.json'), 'utf8'));
  if (!relSrc.version || !Array.isArray(relSrc.notes) || !relSrc.notes.length) { console.error('releases/current.json ต้องมี version และ notes อย่างน้อย 1 ข้อ'); process.exit(1); }
  if (relSrc.notes.some(n => !['new', 'improve', 'fix'].includes(n.type) || !String(n.text || '').trim())) { console.error('notes แต่ละข้อต้องมี type = new|improve|fix และ text'); process.exit(1); }
  if (!parseVersion(relSrc.version)) { console.error(`releases/current.json: version "${relSrc.version}" ต้องเป็น ปี.รอบ.แพตช์ เช่น 2026.1.0 (ดู docs/versioning.md)`); process.exit(1); }
  /* ช่อง (channel): production = ไม่มีต่อท้าย | forge = -forge ใส่ตอน build เท่านั้น ห้ามเขียนใน current.json */
  const channel = env === 'production' ? '' : env;
  const displayVersion = relSrc.version + (channel ? '-' + channel : '');
  /* ฝังเลขรุ่นที่ "รันอยู่จริง" ลงใน sw.js เพื่อให้หน้าตั้งค่าอ่านจากตัวที่คุมหน้าอยู่ ไม่ใช่รุ่นล่าสุดบนเซิร์ฟเวอร์ */
  writeFileSync(join(OUT, 'sw.js'), readFileSync(join(OUT, 'sw.js'), 'utf8').replace(/const APP_VERSION = '[^']*';/, `const APP_VERSION = '${displayVersion}';`));
  writeFileSync(join(OUT, 'sw.js'), readFileSync(join(OUT, 'sw.js'), 'utf8').replace(/const ASSET_V = '[^']*';/, `const ASSET_V = '${ASSET_V}';`));
  if (!readFileSync(join(OUT, 'sw.js'), 'utf8').includes(`const ASSET_V = '${ASSET_V}';`)) { console.error('ฝังรหัสไฟล์ชื่อคงที่ลง sw.js ไม่สำเร็จ'); process.exit(1); }
  if (!readFileSync(join(OUT, 'sw.js'), 'utf8').includes(`const APP_VERSION = '${displayVersion}';`)) { console.error('ฝังเลขรุ่นลง sw.js ไม่สำเร็จ'); process.exit(1); }
  writeFileSync(join(OUT, 'release.json'), JSON.stringify({ build: digest, assets: ASSET_V, version: displayVersion, date: relSrc.date, title: relSrc.title || '', notes: relSrc.notes }, null, 2));
  /* ตรวจว่าต้นทาง (layout) ใส่ ?v= และประกาศ __EV_BUILD__ ครบ: ไม่แก้ HTML ทีหลัง (กัน hydration mismatch) */
  const idx = readFileSync(join(OUT, 'index.html'), 'utf8');
  if (!idx.includes('styles/app.css?v=' + ASSET_V) || !idx.includes('__EV_BUILD__') || !idx.includes(JSON.stringify(REL_VERSION))) { console.error('layout ไม่ได้ใส่ ?v= / __EV_BUILD__ ตามรหัสไฟล์ชื่อคงที่'); process.exit(1); }
  console.log(`NEXT-BUILD OK (${env}) -> ${OUT} | sw evarel-next-${digest} | แคช ${CORE.length} ไฟล์`);
} finally {
  rmSync(PUB, { recursive: true, force: true });
}

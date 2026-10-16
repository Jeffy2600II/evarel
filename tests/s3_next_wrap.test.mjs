/* ตรวจขั้น S3 (ครอบด้วย Next.js แบบปล่อยไฟล์ผ่านตรงๆ)
   รัน: node tests/s3_next_wrap.test.mjs   (ต้อง build ก่อน: npm run build:web:forge)
   กติกา: ไฟล์ทุกไฟล์ใน app/web ต้องไปถึง build/web ตรงทุกไบต์ ยกเว้น index.html ที่ต่างได้เฉพาะบรรทัดฉีด EVAREL_API บรรทัดเดียว */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'app/web'), OUT = path.join(root, 'build/web');
let pass = 0, fail = 0; const t = (n, fn) => { try { fn(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + ' :: ' + String(e.message).slice(0, 220)); } };
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name))]);
const IGN = /(^|[\\/])(node_modules|wrangler\.toml|\.wrangler)([\\/]|$)|\.bak/;
const MARK = "<script>window.EVAREL_API = window.EVAREL_API || '';</script>";

t('S1 มี build/web (ต้อง build ก่อน)', () => { if (!fs.existsSync(path.join(OUT, 'index.html'))) throw new Error('ไม่พบ build/web/index.html'); });
t('S2 ไม่มีหน้าของ Next ที่รากรีโป (รากมี app/ ของโปรเจกต์ ห้ามให้ Next เห็น)', () => {
  for (const f of ['app/page.js', 'app/page.jsx', 'app/page.tsx', 'src/app/page.js', 'pages/index.js', 'next.config.mjs', 'next.config.js']) if (fs.existsSync(path.join(root, f))) throw new Error('พบ ' + f + ' ที่ราก (ต้องอยู่ใน web-shell เท่านั้น)');
});
t('S3 ไฟล์ทุกไฟล์ใน app/web ไปถึง build/web ตรงทุกไบต์ (ยกเว้น index.html และไฟล์ที่ตั้งใจกรอง)', () => {
  const bad = [];
  for (const rel of walk(SRC)) { if (IGN.test(rel) || rel === 'index.html') continue; const q = path.join(OUT, rel); if (!fs.existsSync(q)) bad.push('หาย ' + rel); else if (sha(path.join(SRC, rel)) !== sha(q)) bad.push('ต่าง ' + rel); }
  if (bad.length) throw new Error(bad.length + ' ไฟล์: ' + bad.slice(0, 4).join(', '));
});
t('S4 index.html ต่างจากต้นทางเฉพาะบรรทัดฉีด EVAREL_API บรรทัดเดียว', () => {
  const a = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'), b = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  if (a.split(MARK).length !== 2) throw new Error('ต้นทางไม่มีบรรทัดฉีดที่คาดไว้');
  const m = b.match(/<script>window\.EVAREL_API=("[^"]+");<\/script>/); if (!m) throw new Error('ปลายทางไม่มีบรรทัดฉีด');
  const expect = a.replace(MARK, `<script>window.EVAREL_API=${m[1]};</script>` + MARK);
  if (b !== expect) throw new Error('index.html ต่างจากที่คาดมากกว่าบรรทัดฉีด (อาจถูก Next เขียนทับ)');
});
t('S5 ลำดับโมดูลใน index.html และ sw.js ตรง _order.json', () => {
  const ord = JSON.parse(fs.readFileSync(path.join(OUT, 'js/m/_order.json'), 'utf8')).order.map((o) => o.file);
  const idx = [...fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').matchAll(/src="js\/m\/([^"]+)"/g)].map((m) => m[1]);
  const sw = [...fs.readFileSync(path.join(OUT, 'sw.js'), 'utf8').matchAll(/'\.\/js\/m\/([^']+)'/g)].map((m) => m[1]);
  if (JSON.stringify(idx) !== JSON.stringify(ord)) throw new Error('index ไม่ตรง'); if (JSON.stringify(sw) !== JSON.stringify(ord)) throw new Error('sw ไม่ตรง');
});
t('S6 ไฟล์ชั่วคราวของ web-shell ถูก git ละเว้นจริง (public, out, .next, node_modules) และไม่มีหน้าของ Next', () => {
  for (const p of ['web-shell/public/index.html', 'web-shell/out/index.html', 'web-shell/.next/x', 'web-shell/node_modules/x']) {
    let ignored = true; try { execFileSync('git', ['check-ignore', '-q', p], { cwd: root }); } catch { ignored = false; }
    if (!ignored) throw new Error('git ไม่ละเว้น ' + p);
  }
  for (const f of ['page.js', 'page.jsx', 'page.tsx']) if (fs.existsSync(path.join(root, 'web-shell/src/app', f))) throw new Error('พบ web-shell/src/app/' + f);
});
t('S7 ไฟล์ของ Next อยู่ใต้ _next เท่านั้น ไม่ชนไฟล์แอป', () => {
  const extra = walk(OUT).filter((rel) => !fs.existsSync(path.join(SRC, rel)) && !IGN.test(rel)); const out = extra.filter((e) => !/^_next[\\/]/.test(e) && !/^(404\.html|__next\.|_not-found|index\.txt)/.test(e));
  if (out.length) throw new Error('ไฟล์นอก _next: ' + out.slice(0, 4).join(', '));
});
t('S8 สคริปต์ build ปฏิเสธชื่อสภาพแวดล้อมที่ไม่ใช่ forge/production (รวมชื่อพิเศษของ object)', () => {
  for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'FORGE', '', '../x']) {
    let code = 0; try { execFileSync(process.execPath, [path.join(root, 'scripts/build-web.mjs'), bad], { stdio: 'ignore' }); } catch (e) { code = e.status; }
    if (code !== 2) throw new Error(`"${bad}" ไม่ถูกปฏิเสธ (exit=${code})`);
  }
});
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

/* ปลดระวางแล้ว (S4 ไบต์ N4): เทสต์นี้ล็อกพฤติกรรมโหมดปล่อยผ่านของ S3 ซึ่งถูกแทนที่แล้ว
   build/web ตอนนี้คือผล Next จริง (ไม่มี js/m ไม่มี index.html เดิม) ผลตกของเทสต์นี้จึงไม่ใช่ระบบพัง
   ตัวตรวจปัจจุบันของ build/web คือ tests/next_boot.test.mjs และประตู 9 ชุด | ไม่มีสคริปต์หรือ CI เรียกไฟล์นี้ */
/* ตรวจขั้น S3 (ครอบด้วย Next.js แบบปล่อยไฟล์ผ่านตรงๆ)
   รัน: node tests/s3_next_wrap.test.mjs   (ต้อง build ก่อน: npm run build:web:forge)
   กติกา: ไฟล์ทุกไฟล์ใน web/classic ต้องไปถึง build/web ตรงทุกไบต์ ยกเว้น index.html ที่ต่างได้เฉพาะบรรทัดฉีด EVAREL_API บรรทัดเดียว */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'web/classic'), OUT = path.join(root, 'build/web');
let pass = 0, fail = 0; const t = (n, fn) => { try { fn(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + ' :: ' + String(e.message).slice(0, 220)); } };
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name))]);
const IGN = /(^|[\\/])(node_modules|wrangler\.toml|\.wrangler)([\\/]|$)|\.bak/;
const skip = (n, why) => console.log('SKIP ' + n + ' :: ' + why);
const MARK = "<script>window.EVAREL_API = window.EVAREL_API || '';</script>";

t('S1 มี build/web (ต้อง build ก่อน)', () => { if (!fs.existsSync(path.join(OUT, 'index.html'))) throw new Error('ไม่พบ build/web/index.html'); });
t('S2 ไม่มีหน้าของ Next ที่รากรีโป (รากมี app/ ของโปรเจกต์ ห้ามให้ Next เห็น)', () => {
  for (const f of ['app/page.js', 'app/page.jsx', 'app/page.tsx', 'src/app/page.js', 'pages/index.js', 'next.config.mjs', 'next.config.js']) if (fs.existsSync(path.join(root, f))) throw new Error('พบ ' + f + ' ที่ราก (ต้องอยู่ใน web/shell เท่านั้น)');
});
skip('S3 ไฟล์ทุกไฟล์ใน web/classic ไปถึง build/web ตรงทุกไบต์ (ยกเว้น index.html)', 'โหมดปล่อยผ่านของ S3 ถูกแทนที่ด้วย Next จริง (S4 ไบต์ N4) โมดูลอยู่ในบันเดิล _next');
skip('S4 index.html ต่างจากต้นทางเฉพาะบรรทัดฉีด EVAREL_API', 'Next สร้าง index.html เองแล้ว (S4)');
skip('S5 ลำดับโมดูลใน index.html และ sw.js ตรง _order.json', '_order.json เลิกใช้ตั้งแต่ F6 ย้าย js/m');
t('S6 ไฟล์ชั่วคราวของ web/shell ถูก git ละเว้นจริง (public, out, .next, node_modules) และไม่มีหน้าของ Next', () => {
  for (const p of ['web/shell/public/index.html', 'web/shell/out/index.html', 'web/shell/.next/x', 'web/shell/node_modules/x']) {
    let ignored = true; try { execFileSync('git', ['check-ignore', '-q', p], { cwd: root }); } catch { ignored = false; }
    if (!ignored) throw new Error('git ไม่ละเว้น ' + p);
  }
  for (const f of ['page.js', 'page.jsx', 'page.tsx']) if (fs.existsSync(path.join(root, 'web/shell/src/app', f))) throw new Error('พบ web/shell/src/app/' + f);
});
skip('S7 ไฟล์ของ Next อยู่ใต้ _next เท่านั้น ไม่ชนไฟล์แอป', 'sw.js กับ release.json ที่รากของ build เป็นของระบบอัปเดตตั้งแต่ S4');
t('S8 สคริปต์ build ปฏิเสธชื่อสภาพแวดล้อมที่ไม่ใช่ forge/production (รวมชื่อพิเศษของ object)', () => {
  for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'FORGE', '', '../x']) {
    let code = 0; try { execFileSync(process.execPath, [path.join(root, 'scripts/build-web.mjs'), bad], { stdio: 'ignore' }); } catch (e) { code = e.status; }
    if (code !== 2) throw new Error(`"${bad}" ไม่ถูกปฏิเสธ (exit=${code})`);
  }
});
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

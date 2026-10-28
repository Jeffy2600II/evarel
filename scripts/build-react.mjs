// สร้าง React bundle ของ Evarel ด้วย esbuild (ชั้น 4): runtime ร่วม 1 ไฟล์ + หน้าละ 1 ไฟล์เล็ก
//   app/src/react/runtime.js        -> app/web/js/react/runtime.js   (มี React ทั้งก้อน เปิดเป็น window.EvarelReact)
//   app/src/react/<ชื่อ>.jsx        -> app/web/js/react/<ชื่อ>.js    (ไม่มี React ในไฟล์ ใช้ของ runtime ร่วม ลงทะเบียน window.EvarelPages.<ชื่อ>)
// ผลลัพธ์ commit ไว้ใน app/web (เหมือน js/m) เพื่อให้ build ปกติและประตูเห็นไฟล์เดียวกัน | ทำซ้ำได้ไบต์เดิม
// ใช้: node scripts/build-react.mjs         (สร้างทั้งหมด)   node scripts/build-react.mjs --check  (ไม่เขียน เทียบกับที่ commit ไว้ ต่างก็ exit 1)
import { readdirSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const esbuild = require('esbuild');
const SRC = join(root, 'app/src/react'), OUT = join(root, 'app/web/js/react');
const check = process.argv.includes('--check');
// platform: 'browser' จำเป็น: ไม่งั้น esbuild เลือก react-dom-server.node (ใช้ util/stream ของ Node) ที่รันในเบราว์เซอร์ไม่ได้
const common = { absWorkingDir: root, bundle: true, format: 'iife', platform: 'browser', minify: true, target: 'es2020', write: false, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' } };
// alias ต้องเป็นพาธสัมพัทธ์จากราก (ไม่ใช่สัมบูรณ์) ไม่งั้น esbuild ข้ามการเลือก exports ของ react-dom ไปใช้ server.node.js (ใช้ util/stream ของ Node รันในเบราว์เซอร์ไม่ได้)
const alias = { react: './web-shell/node_modules/react', 'react-dom': './web-shell/node_modules/react-dom' };

// F3.3-g13: ไฟล์หน้าไม่บันเดิล shared/tray.js ของตัวเอง ให้อ่านจาก window.EvarelTray ที่ runtime เปิดไว้ (รัน runtime ก่อนเสมอ)
// ชื่อ export ต้องตรงกับ tray.js ทุกตัว ไม่งั้นบิลด์ล้มทันที (ไม่ปล่อยให้ undefined ไปพังตอนรัน)
// ข้อความผิดพลาดตอนรันเป็นอังกฤษสั้นๆ โดยตั้งใจ: ไทยจะถูกฝังซ้ำทุกไฟล์หน้า (วัดแล้วโต ~2.2 KB) | ความหมาย: runtime.js ต้องโหลดก่อนไฟล์หน้า
const TRAY_EXPORTS = ['TrayError', 'T', 'tray'];
const trayShare = { name: 'tray-share', setup(b) {
  b.onResolve({ filter: /shared\/tray\.js$/ }, (a) => ({ path: a.path, namespace: 'tray-share' }));
  b.onLoad({ filter: /.*/, namespace: 'tray-share' }, () => ({ loader: 'js', contents: `const L = window.EvarelTray; if (!L) throw new Error('EvarelTray missing: load runtime.js first');\n` + TRAY_EXPORTS.map((n) => `export const ${n} = L.${n};`).join('\n') }));
} };
const jobs = [{ name: 'runtime', entry: join(SRC, 'runtime.js'), opts: { alias } }];
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.jsx')).sort())
  jobs.push({ name: f.replace(/\.jsx$/, ''), entry: join(SRC, f), opts: { external: ['react', 'react-dom'], plugins: [trayShare] } });

mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const j of jobs) {
  const r = await esbuild.build({ ...common, ...j.opts, entryPoints: [j.entry] });
  const text = r.outputFiles[0].text, dest = join(OUT, j.name + '.js');
  if (check) { const same = existsSync(dest) && readFileSync(dest, 'utf8') === text; if (!same) { bad++; console.error('ต่างจากที่ commit: ' + dest); } }
  else { writeFileSync(dest, text); console.log('สร้าง ' + j.name + '.js (' + text.length + ' ไบต์)'); }
}
if (check) { console.log(bad ? 'ไม่ตรง ' + bad + ' ไฟล์' : 'ตรงทุกไฟล์ (' + jobs.length + ')'); process.exit(bad ? 1 : 0); }

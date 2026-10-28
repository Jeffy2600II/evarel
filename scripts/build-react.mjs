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

// F3.3-g13/g14: โมดูลร่วมที่ไฟล์หน้าไม่บันเดิลสำเนาของตัวเอง แต่อ่านจาก global ที่ runtime เปิดไว้ (runtime โหลดก่อนไฟล์หน้าเสมอ)
//   shared/tray.js -> window.EvarelTray | core/dates + core/schedule -> window.EvarelCore (g14)
// รายชื่อ export อ่านจากไฟล์ต้นทางเองด้วย esbuild (ไม่ฮาร์ดโค้ด) กันตกหล่นเงียบ ๆ เมื่อมีคนเพิ่มฟังก์ชัน | อ่านไม่ได้หรือว่าง = บิลด์ล้มทันที
// ข้อความผิดพลาดตอนรันเป็นอังกฤษสั้น ๆ โดยตั้งใจ: ไทยจะถูกฝังซ้ำทุกไฟล์หน้า | ความหมาย: runtime.js ต้องโหลดก่อนไฟล์หน้า
const SHARED = [
  { re: /shared\/tray\.js$/, file: 'app/shared/tray.js', global: 'EvarelTray', ns: 'tray-share' },
  { re: /src\/core\/dates(\.ts)?$/, file: 'app/src/core/dates.ts', global: 'EvarelCore', ns: 'core-share-dates', key: 'dates' },
  { re: /src\/core\/schedule(\.ts)?$/, file: 'app/src/core/schedule.ts', global: 'EvarelCore', ns: 'core-share-schedule', key: 'schedule' },
];
export async function exportsOf(rel) {
  const r = await esbuild.build({ absWorkingDir: root, entryPoints: [rel], bundle: false, write: false, metafile: true, logLevel: 'silent', format: 'esm' });
  const out = Object.values(r.metafile.outputs)[0].exports.filter((n) => n !== 'default');
  if (!out.length) throw new Error('อ่านรายชื่อ export ของ ' + rel + ' ไม่ได้ (ว่าง)');
  return out;
}
const sharedNames = Object.fromEntries(await Promise.all(SHARED.map(async (x) => [x.file, await exportsOf(x.file)])));
const sharePlugin = { name: 'shared-via-runtime', setup(b) {
  for (const x of SHARED) {
    // จับด้วยพาธที่ resolve แล้ว ไม่ใช่ข้อความ import: core/*.ts import กันเองเป็น './dates' ซึ่งไม่ตรง regex พาธ จึงต้อง resolve ก่อนแล้วค่อยเทียบ (ไม่งั้นสำเนาหลุดเข้าไฟล์หน้าอีกชุด)
    b.onResolve({ filter: /^\.{0,2}\/?[\w./-]*$/ }, async (a) => {
      if (a.pluginData && a.pluginData.sharedProbe) return null;
      const r = await b.resolve(a.path, { resolveDir: a.resolveDir, kind: a.kind, importer: a.importer, pluginData: { sharedProbe: true } });
      if (r.errors.length || !x.re.test(r.path)) return null;
      return { path: r.path, namespace: x.ns };
    });
    b.onLoad({ filter: /.*/, namespace: x.ns }, () => {
      const L = x.key ? `window.${x.global}.${x.key}` : `window.${x.global}`;
      return { loader: 'js', contents: `const L = ${L}; if (!L) throw new Error('${x.global} missing: load runtime.js first');\n` + sharedNames[x.file].map((n) => `export const ${n} = L.${n};`).join('\n') };
    });
  }
} };
const trayShare = sharePlugin;
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

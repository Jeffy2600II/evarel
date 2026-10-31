// สร้าง React bundle ของ Evarel ด้วย esbuild (ชั้น 4): runtime ร่วม 1 ไฟล์ + หน้าละ 1 ไฟล์เล็ก
//   app/src/react/runtime.js        -> app/web/js/react/runtime.js   (มี React ทั้งก้อน เปิดเป็น window.EvarelReact)
//   app/src/react/<ชื่อ>.jsx        -> app/web/js/react/<ชื่อ>.js    (ไม่มี React ในไฟล์ ใช้ของ runtime ร่วม ลงทะเบียน window.EvarelPages.<ชื่อ>)
// ผลลัพธ์ commit ไว้ใน app/web (เหมือน js/m) เพื่อให้ build ปกติและประตูเห็นไฟล์เดียวกัน | ทำซ้ำได้ไบต์เดิม
// ใช้: node scripts/build-react.mjs         (สร้างทั้งหมด)   node scripts/build-react.mjs --check  (ไม่เขียน เทียบกับที่ commit ไว้ ต่างก็ exit 1)
import { readdirSync, mkdirSync, readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const esbuild = require('esbuild');
const SRC = join(root, 'app/src/react'), OUT = join(root, 'app/web/js/react');
const PAGES = join(root, 'app/pages'); /* F4-A: กล่อง 3 ชั้น (app/pages/<ชื่อ>/<Pascal>Page.jsx) */
/* F6: โซนที่มีกล่อง = pages/ (หน้า) และ shared/ (ชิ้นร่วม: nav sheet dialog item-row) | กล่องหน้าตาเหมือนกันทุกโซน ผลบิลด์ชื่อ <ชื่อ>.js เหมือนเดิม
   shared/ มีไฟล์เดี่ยว (tray.js, README.md) ที่ไม่ใช่กล่อง จึงนับเป็นกล่องเฉพาะโฟลเดอร์ที่มี BOX.md */
const SHARED_DIR = join(root, 'app/shared');
const BOX_ZONES = [{ name: 'pages', dir: PAGES, needCard: false }, { name: 'shared', dir: SHARED_DIR, needCard: true }];
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
/* กล่องจากเบ้าจูนเขียน import React from 'react' (ตามแม่พิมพ์) | ไม่บันเดิล React ชุดสอง: 'react' ในกล่องคือ shim บางๆ ที่ชี้ไป window.EvarelReact ของ runtime | ฉีดโดยบิลด์ ไม่ใช่โค้ดของกล่อง */
const boxReactShim = { name: 'box-react-shim', setup(b) {
  b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'box-react' }));
  b.onLoad({ filter: /.*/, namespace: 'box-react' }, () => ({ loader: 'js', contents: 'const R = window.EvarelReact; export default { createElement: R.h, Fragment: R.Fragment }; export const createElement = R.h, Fragment = R.Fragment;' }));
  /* h/Fragment ให้ทุกไฟล์ในกล่อง: กล่องเขียน h(...) ตรงๆ ได้โดยไม่ต้องรับจาก window เอง (BOX-05) | ฉีดผ่าน inject ของ esbuild ชื่อไม่ชนถ้ากล่องประกาศ h เอง */
  b.onResolve({ filter: /^box-inject:h$/ }, () => ({ path: 'box-inject-h', namespace: 'box-inject' }));
  b.onLoad({ filter: /.*/, namespace: 'box-inject' }, () => ({ loader: 'js', contents: 'const R = window.EvarelReact; export const h = R.h; export const Fragment = R.Fragment;' }));
} };
const jobs = [{ name: 'runtime', entry: join(SRC, 'runtime.js'), opts: { alias } }];
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.jsx')).sort())
  jobs.push({ name: f.replace(/\.jsx$/, ''), entry: join(SRC, f), opts: { external: ['react', 'react-dom'], plugins: [trayShare] } });

/* F4-A/B: งานบิลด์ของกล่องใน app/pages/ | แยกจากลูปเดิมของ app/src/react (ไม่แตะ) | app/pages/ ว่าง = ไม่มีงานเพิ่ม ผลบิลด์เดิมเท่าเดิมทุกไบต์
   สัญญากล่อง: export default = ฟังก์ชันหน้า, export const prepare = (raw) => props (ไม่บังคับ ไม่มี = ส่ง raw ตรง) | กล่องห้ามแตะ window (BOX-05)
   บิลด์ฉีดแทนกล่อง: (ก) รับ h/Fragment จาก window.EvarelReact (ข) ลงทะเบียน window.EvarelPages.<ชื่อ> ด้วยรูปเดียวกับ stats/all เดิม
   ชื่อหน้า = ชื่อโฟลเดอร์กล่อง ชื่อไฟล์ผลลัพธ์ = <ชื่อ>.js เหมือนเดิม (REACT_PAGES, sw.js และเทสต์อ้างชื่อนี้) | ชื่อชนกับหน้าเดิมใน app/src/react = บิลด์ล้ม กันสองชุดค้าง */
/* F4-ลงทะเบียนเอง: อ่านมานิเฟสต์ "register" จากส่วน JSON ของ BOX.md (บัตรเครื่องอ่านได้) แทนการเดาจากชื่อโฟลเดอร์
   register = { pages: [{ name, export?, prepare? }], components: [{ name, export? }], after?: [ชื่อหน้าที่ต้องโหลดก่อน] }
   ไม่ประกาศ register = pages [{ name: ชื่อโฟลเดอร์ }] (stats/all เดิมใช้ค่านี้) | components ไม่ประกาศ = ไม่ลงทะเบียน (บิลด์ไม่เดา) */
const CARD_RE = /<!-- MACHINE-READABLE-CARD-START -->\s*```json\s*([\s\S]*?)```\s*<!-- MACHINE-READABLE-CARD-END -->/;
export function readBoxCard(dir, name) {
  const f = join(dir, 'BOX.md');
  if (!existsSync(f)) throw new Error('กล่อง ' + name + ' ไม่มีบัตร BOX.md');
  const m = CARD_RE.exec(readFileSync(f, 'utf8'));
  if (!m) throw new Error('กล่อง ' + name + ': BOX.md ไม่มีส่วน JSON ที่เครื่องอ่านได้');
  try { return JSON.parse(m[1]); } catch (e) { throw new Error('กล่อง ' + name + ': JSON ในบัตรอ่านไม่ได้ (' + e.message + ')'); }
}
export function boxRegister(card, name) {
  const r = card.register || {};
  const pages = (r.pages || [{ name }]).map((p) => ({ name: p.name, export: p.export || 'default', prepare: p.prepare || 'prepare' }));
  const components = (r.components || []).map((c) => ({ name: c.name, export: c.export || 'default' }));
  for (const x of [...pages, ...components]) if (!/^[A-Za-z_$][\w$]*$/.test(x.name || '')) throw new Error('กล่อง ' + name + ': ชื่อลงทะเบียนไม่ถูกต้อง ' + JSON.stringify(x.name));
  return { pages, components, after: r.after || [] };
}
export function boxEntry(name, pageRel, reg, exportsOfPage) {
  /* ทางเข้าเสมือน: นำเข้าครั้งเดียว แล้วลงทะเบียนตามมานิเฟสต์ | prepare ไม่ถูก export = ส่ง raw ตรง */
  let s = `import * as P from ${JSON.stringify(pageRel)};\n`;
  s += `window.EvarelPages = window.EvarelPages || {};\n`;
  for (const p of reg.pages) {
    const prep = exportsOfPage.includes(p.prepare) ? `P[${JSON.stringify(p.prepare)}](raw)` : 'raw';
    s += `window.EvarelPages[${JSON.stringify(p.name)}] = (raw) => window.EvarelReact.renderToStaticMarkup(window.EvarelReact.h(P[${JSON.stringify(p.export)}], ${prep}));\n`;
  }
  if (reg.components.length) s += `window.EvarelComponents = window.EvarelComponents || {};\n`;
  for (const c of reg.components) s += `window.EvarelComponents[${JSON.stringify(c.name)}] = P[${JSON.stringify(c.export)}];\n`;
  return s;
}
/* เรียงลำดับโหลดของกล่อง: เรียงตามชื่อ แล้วเลื่อนให้กล่องที่มี after ตามหลังเป้าหมาย | after ชี้ชื่อที่ไม่มี (ไม่ใช่หน้าเดิมหรือกล่อง) หรือเป็นวงวน = ล้มพร้อมเหตุผล ไม่ปล่อยลำดับเงียบพัง */
export function orderBoxes(boxes, baseNames) {
  const known = new Set([...baseNames, ...boxes.map((b) => b.name)]);
  for (const b of boxes) for (const a of b.reg.after) if (!known.has(a)) throw new Error('กล่อง ' + b.name + ': after ชี้ ' + a + ' ซึ่งไม่ใช่หน้าเดิมหรือกล่องใด');
  const out = [], done = new Set(baseNames), left = [...boxes].sort((x, y) => x.name.localeCompare(y.name));
  while (left.length) {
    const i = left.findIndex((b) => b.reg.after.every((a) => done.has(a)));
    if (i < 0) throw new Error('ลำดับโหลดของกล่องเป็นวงวน: ' + left.map((b) => b.name).join(', '));
    const [b] = left.splice(i, 1); out.push(b); done.add(b.name);
  }
  return out;
}
const boxJobs = [];
const BASE_PAGES = ['settings', 'stats', 'all', 'item-row', 'today', 'calendar', 'ai', 'nav', 'dialog', 'sheet', 'form', 'detail', 'auth', 'quota', 'aiShell', 'focus']; /* ลำดับโหลดเดิมของหน้าเดิม (ต้องตรง REACT_PAGES_BASE ใน 19-views__settings.ts: บิลด์ตรวจ) */
const seenBoxZone = new Map(); /* ชื่อกล่อง -> โซน: ชื่อซ้ำข้ามโซนต้องล้ม (ผลบิลด์ชื่อเดียวกันเขียนทับกัน) */
for (const zone of BOX_ZONES) if (existsSync(zone.dir)) {
  const legacy = new Set(readdirSync(SRC).filter((x) => x.endsWith('.jsx')).map((x) => x.replace(/\.jsx$/, '')));
  const dirs = readdirSync(zone.dir, { withFileTypes: true }).filter((x) => x.isDirectory() && !x.name.startsWith('.') && !x.name.startsWith('_')).map((x) => x.name).sort()
    .filter((d) => !zone.needCard || existsSync(join(zone.dir, d, 'BOX.md')));
  for (const d of dirs) {
    if (seenBoxZone.has(d)) throw new Error('กล่อง ' + d + ' ซ้ำข้ามโซน: ' + seenBoxZone.get(d) + ' และ ' + zone.name);
    seenBoxZone.set(d, zone.name);
    if (legacy.has(d)) throw new Error('กล่อง ' + d + ' ชื่อชนกับหน้าเดิม app/src/react/' + d + '.jsx (ห้ามค้างสองชุด)');
    const page = join(zone.dir, d, d.replace(/(^|[-_])([a-z0-9])/g, (_, __, c) => c.toUpperCase()) + 'Page.jsx');
    if (!existsSync(page)) throw new Error('กล่อง ' + d + ' ไม่มีไฟล์หน้า ' + page);
    const reg = boxRegister(readBoxCard(join(zone.dir, d), d), d);
    const mod = await esbuild.build({ absWorkingDir: root, entryPoints: [page], bundle: false, write: false, metafile: true, logLevel: 'silent', format: 'esm', loader: { '.jsx': 'jsx' } });
    const exps = Object.values(mod.metafile.outputs)[0].exports; /* export จริงของไฟล์หน้า (รวม default) */
    for (const x of [...reg.pages.map((p) => p.export), ...reg.components.map((c) => c.export)]) if (!exps.includes(x)) throw new Error('กล่อง ' + d + ': register อ้าง export "' + x + '" ที่ไฟล์หน้าไม่มี (มี: ' + exps.join(', ') + ')');
    boxJobs.push({ name: d, entry: page, reg, exps, zoneDir: zone.dir });
  }
}
const orderedBoxes = orderBoxes(boxJobs, BASE_PAGES);
{ /* ชื่อที่ลงทะเบียน (EvarelPages / EvarelComponents) ต้องไม่ซ้ำกันข้ามกล่อง: ซ้ำ = กล่องหลังทับกล่องก่อนเงียบๆ จึงล้มพร้อมบอกว่าชนกับใคร */
  const seenP = new Map(), seenC = new Map();
  for (const b of orderedBoxes) {
    for (const p of b.reg.pages) { if (seenP.has(p.name)) throw new Error('ชื่อหน้า "' + p.name + '" ลงทะเบียนซ้ำ: กล่อง ' + seenP.get(p.name) + ' และ ' + b.name); seenP.set(p.name, b.name); }
    for (const c of b.reg.components) { if (seenC.has(c.name)) throw new Error('ชื่อ component "' + c.name + '" ลงทะเบียนซ้ำ: กล่อง ' + seenC.get(c.name) + ' และ ' + b.name); seenC.set(c.name, b.name); }
  }
}
/* ชื่อไฟล์ผลลัพธ์ต่อกล่อง: กล่องหนึ่งใบเขียนไฟล์เดียว ชื่อ = ชื่อโฟลเดอร์ (loadReactFile โหลดตามชื่อนี้) ไม่ชนชื่อหน้าเดิมอยู่แล้วจากข้างบน */
mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const j of jobs) {
  const r = await esbuild.build({ ...common, ...j.opts, entryPoints: [j.entry] });
  const text = r.outputFiles[0].text, dest = join(OUT, j.name + '.js');
  if (check) { const same = existsSync(dest) && readFileSync(dest, 'utf8') === text; if (!same) { bad++; console.error('ต่างจากที่ commit: ' + dest); } }
  else { writeFileSync(dest, text); console.log('สร้าง ' + j.name + '.js (' + text.length + ' ไบต์)'); }
}
for (const j of boxJobs) {
  /* stdin ให้ esbuild: ไฟล์ทางเข้าเสมือนฉีดบรรทัด window แทนกล่อง | JSX ของกล่องใช้ React ที่ import เอง จึงแปลงเป็น h ของ runtime ผ่าน jsxFactory */
  const r = await esbuild.build({ ...common, external: ['react', 'react-dom'], plugins: [trayShare, boxReactShim],
    jsx: 'transform', jsxFactory: 'window.EvarelReact.h', jsxFragment: 'window.EvarelReact.Fragment', inject: ['box-inject:h'],
    stdin: { contents: boxEntry(j.name, './' + j.name + '/' + j.entry.split('/').pop(), j.reg, j.exps), resolveDir: j.zoneDir, sourcefile: 'box-entry-' + j.name + '.js', loader: 'js' },
    entryPoints: undefined });
  const text = r.outputFiles[0].text, dest = join(OUT, j.name + '.js');
  if (check) { const same = existsSync(dest) && readFileSync(dest, 'utf8') === text; if (!same) { bad++; console.error('ต่างจากที่ commit: ' + dest); } }
  else { writeFileSync(dest, text); console.log('สร้างกล่อง ' + j.name + '.js (' + text.length + ' ไบต์)'); }
}

/* ===== F4-ลงทะเบียนเอง: บิลด์เป็นเจ้าของบล็อกลงทะเบียนใน 2 ไฟล์ (ห้ามแก้มือ) =====
   (1) app/src/app/19-views__settings.ts  -> REACT_BOX_PAGES   (ลำดับโหลด: หน้าเดิมคงเดิมเป๊ะ แล้วตามด้วยกล่องที่เรียงตาม after)
   (2) app/web/sw.js                    -> รายการแคชของกล่อง
   ผลคอมไพล์ app/web/js/app/19-views__settings.js ถูก commit ด้วย จึงคอมไพล์คู่ด้วย tsc ตัวเดียวกับ evarel_gate_group.sh (ไม่ให้ผลล้าหลังเงียบๆ)
   โหมด --check: เทียบอย่างเดียว ไม่เขียนอะไร */
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
const SETTINGS_TS = join(root, 'app/src/app/19-views__settings.ts'), SETTINGS_JS = join(root, 'app/web/js/app/19-views__settings.js'), SW = join(root, 'app/web/sw.js');
const BLOCK = (file, txt) => { const m = /(\/\* BOXES:START[^*]*\*\/)([\s\S]*?)(\/\* BOXES:END \*\/)/.exec(txt); if (!m) throw new Error(file + ': ไม่มีเครื่องหมายบล็อก BOXES:START/END (ห้ามลบ)'); return m; };
export function renderSettingsBlock(names) { return `const REACT_BOX_PAGES:string[]=${JSON.stringify(names)};`; }
export function renderSwBlock(names) { return names.length ? '\n' + names.map((n) => `  './js/react/${n}.js',`).join('\n') + '\n  ' : '\n  '; }
function compileSettings(tsText) {
  const d = mkdtempSync(join(tmpdir(), 'reg-tsc-')); mkdirSync(join(d, 'in')); mkdirSync(join(d, 'out'));
  writeFileSync(join(d, 'in/19-views__settings.ts'), tsText);
  try { execFileSync(join(root, 'node_modules/.bin/tsc'), ['--ignoreConfig', '--target', 'ES2022', '--module', 'ESNext', '--skipLibCheck', '--strict', 'false', '--noImplicitAny', 'false', '--noEmitOnError', 'false', '--outDir', join(d, 'out'), join(d, 'in/19-views__settings.ts')], { stdio: 'ignore' }); } catch { /* tsc คืน exit 2 เมื่อมี error ของ global ที่ไม่ได้ประกาศ (โมดูล window เดิม) ซึ่งเป็นปกติของไฟล์นี้ ผลยังถูกเขียน (noEmitOnError=false) */ }
  const out = readFileSync(join(d, 'out/19-views__settings.js'), 'utf8'); rmSync(d, { recursive: true, force: true }); return out;
}
{
  /* กล่องที่ย้ายมาจากหน้าเดิม (stats, all) คงตำแหน่งเดิมใน REACT_PAGES_BASE ไม่ใส่ซ้ำในบล็อก (ไม่งั้นโหลดไฟล์เดียวกันสองรอบและแคชซ้ำ) | บล็อก = เฉพาะชื่อที่ยังไม่อยู่ใน BASE */
  const names = orderedBoxes.map((b) => b.name).filter((n) => !BASE_PAGES.includes(n)); /* ชื่อไฟล์ = ชื่อโฟลเดอร์กล่อง (loadReactFile โหลด js/react/<ชื่อ>.js) ไม่ใช่ชื่อที่ลงทะเบียนใน EvarelPages */
  /* ตรวจ BASE ในไฟล์ TS ตรงกับ BASE_PAGES ของบิลด์ (สองที่ต้องไม่เพี้ยนจากกัน) */
  const tsText = readFileSync(SETTINGS_TS, 'utf8');
  const bm = /const REACT_PAGES_BASE=\[([^\]]*)\]/.exec(tsText); if (!bm) throw new Error('19-views__settings.ts: ไม่พบ REACT_PAGES_BASE');
  const baseInTs = bm[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
  if (JSON.stringify(baseInTs) !== JSON.stringify(BASE_PAGES)) throw new Error('REACT_PAGES_BASE ใน 19-views__settings.ts ไม่ตรง BASE_PAGES ของบิลด์: ' + baseInTs.join(',') + ' != ' + BASE_PAGES.join(','));
  const m1 = BLOCK('19-views__settings.ts', tsText);
  const newTs = tsText.replace(m1[0], m1[1] + renderSettingsBlock(names) + m1[3]);
  const swText = readFileSync(SW, 'utf8'); const m2 = BLOCK('sw.js', swText);
  const newSw = swText.replace(m2[0], m2[1] + renderSwBlock(names) + m2[3]);
  const newJs = compileSettings(newTs);
  const cur = [[SETTINGS_TS, tsText, newTs], [SW, swText, newSw], [SETTINGS_JS, existsSync(SETTINGS_JS) ? readFileSync(SETTINGS_JS, 'utf8') : '', newJs]];
  for (const [f, a, b] of cur) {
    if (a === b) continue;
    if (check) { bad++; console.error('บล็อกลงทะเบียนไม่ตรงกับกล่อง: ' + f + ' (รัน node scripts/build-react.mjs)'); }
    else { writeFileSync(f, b); console.log('อัปเดตบล็อกลงทะเบียน ' + f.replace(root + '/', '')); }
  }
}
if (check) { console.log(bad ? 'ไม่ตรง ' + bad + ' ไฟล์' : 'ตรงทุกไฟล์ (' + (jobs.length + boxJobs.length) + ')'); process.exit(bad ? 1 : 0); }

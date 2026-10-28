/* ทดสอบท่อบิลด์ของกล่องใน app/pages/ (F4 ขั้น A/B) | ไม่แตะ app/pages จริง: สร้างสำเนา worktree ชั่วคราวใต้ TMPDIR แล้วเก็บกวาดเอง
   ครอบ: (1) app/pages ว่าง = ผลบิลด์เดิมตรงทุกไบต์ (2) กล่องชื่อชนหน้าเดิม ล้มบิลด์พร้อมเหตุผล (3) กล่องรูป React/JSX จากเบ้าจูนบิลด์ได้ ไม่บันเดิล React ซ้ำ เรนเดอร์ใน Chromium ได้
   (4) กล่องรูป h(...) ตรงๆ (แบบ stats.jsx) บิลด์และเรนเดอร์ได้ (5) กล่องที่เขียน window ตก BOX-05 (ยืนยันกติกายังจับ)
   ใช้: node tests/box_build_pipeline.test.mjs   ผล: exit 1 ถ้าข้อใดไม่ผ่าน */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { chromium } from 'playwright'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0; const t = (n, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${ok ? '' : extra}`); if (!ok) fails++; };
const run = (cwd, args) => { try { return { ok: true, out: execFileSync(process.execPath, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') }; } };
/* (1) ใช้รีโปจริงตรวจว่าไม่มีกล่อง = เดิมทุกไบต์ */
const real = run(root, ['scripts/build-react.mjs', '--check']);
t('ผลบิลด์ที่ commit ตรงทุกไบต์ (หน้าเดิมและกล่องจริงใน app/pages)', real.ok && /ตรงทุกไฟล์/.test(real.out), real.out.slice(-120));
/* สำเนาชั่วคราว: คัดลอกเฉพาะที่บิลด์ต้องใช้ (ไม่ใช้ git worktree เพื่อไม่แตะประวัติ) */
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'boxpipe-'));
const cp = (rel) => fs.cpSync(path.join(root, rel), path.join(tmp, rel), { recursive: true });
for (const r of ['scripts/build-react.mjs', 'app/src', 'app/shared', 'app/data', 'app/tools', 'app/web/js/react', 'package.json']) cp(r);
fs.rmSync(path.join(tmp, 'app/pages'), { recursive: true, force: true }); fs.mkdirSync(path.join(tmp, 'app/pages'), { recursive: true }); /* สำเนาเริ่มจาก pages ว่าง: ทดสอบเฉพาะกล่องของตัวทดสอบเอง */
fs.mkdirSync(path.join(tmp, 'web-shell/node_modules'), { recursive: true });
for (const m of ['react', 'react-dom', 'scheduler']) fs.cpSync(path.join(root, 'web-shell/node_modules', m), path.join(tmp, 'web-shell/node_modules', m), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'));
try {
  /* (2) ชื่อชน */
  const legacyName = fs.readdirSync(path.join(tmp, 'app/src/react')).find((x) => x.endsWith('.jsx')).replace(/\.jsx$/, ''); /* หน้าเดิมที่ยังอยู่ใน src/react ตอนนี้ (เลือกตอนรัน ไม่ฮาร์ดโค้ด) */
  const Pas = legacyName.replace(/(^|[-_])([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  fs.mkdirSync(path.join(tmp, 'app/pages/' + legacyName), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'app/pages/' + legacyName + '/' + Pas + 'Page.jsx'), 'export default function P(){ return null; }\n');
  const clash = run(tmp, ['scripts/build-react.mjs']);
  t('กล่องชื่อชนหน้าเดิม (' + legacyName + '): บิลด์ล้มพร้อมเหตุผล', !clash.ok && /ชื่อชนกับหน้าเดิม/.test(clash.out), clash.out.slice(-160));
  fs.rmSync(path.join(tmp, 'app/pages/' + legacyName), { recursive: true });
  /* (3) กล่องรูปเบ้าจูน */
  const tun = run(tmp, ['app/tools/tuner.mjs', 'demobox']);
  t('เบ้าจูนสร้างกล่อง', tun.ok, tun.out.slice(-120));
  /* (4) กล่องรูป h ตรงๆ พร้อม prepare */
  fs.mkdirSync(path.join(tmp, 'app/pages/hdirect'));
  fs.writeFileSync(path.join(tmp, 'app/pages/hdirect/HdirectPage.jsx'), "export default function HdirectPage(p){ return h('div', {className:'hd'}, h(Fragment, null, p.msg)); }\nexport const prepare = (raw) => ({ msg: 'x' + raw.n });\n");
  const bld = run(tmp, ['scripts/build-react.mjs']);
  t('บิลด์กล่องทั้งสองรูปผ่าน', bld.ok && /demobox\.js/.test(bld.out) && /hdirect\.js/.test(bld.out), bld.out.slice(-200));
  const demoSize = fs.statSync(path.join(tmp, 'app/web/js/react/demobox.js')).size;
  t('ผลลัพธ์กล่องเล็ก ไม่บันเดิล React ซ้ำ (< 4000 ไบต์)', demoSize < 4000, String(demoSize));
  /* เรนเดอร์ใน Chromium */
  const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
  const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
  const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] }); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.setContent('<!doctype html><body></body>');
  for (const f of ['runtime', 'demobox', 'hdirect']) await p.evaluate(fs.readFileSync(path.join(tmp, 'app/web/js/react', f + '.js'), 'utf8'));
  const r = await p.evaluate(() => ({ demo: window.EvarelPages.demobox({}), hd: window.EvarelPages.hdirect({ n: 7 }) }));
  await b.close();
  t('กล่องรูปเบ้าจูนเรนเดอร์ถูกต้อง', r.demo.includes('class="box-demobox"') && r.demo.includes('Demobox Page'), r.demo.slice(0, 100));
  t('กล่องรูป h ตรงๆ + prepare เรนเดอร์ถูกต้อง', r.hd === '<div class="hd">x7</div>', r.hd);
  t('ไม่มี pageerror', errs.length === 0, JSON.stringify(errs));
  /* (5) กล่องที่เขียน window ตก BOX-05 */
  fs.appendFileSync(path.join(tmp, 'app/pages/hdirect/HdirectPage.jsx'), "window.EvarelPages = {};\n");
  const chk = run(tmp, ['app/tools/checker.mjs']);
  t('กล่องที่เขียน window ตก BOX-05', /BOX-05/.test(chk.out), chk.out.slice(-160));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\nผล: ${fails ? 'มีข้อตก ' + fails : 'ผ่านทุกข้อ'}`); process.exit(fails ? 1 : 0);

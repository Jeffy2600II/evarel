/* ทดสอบท่อบิลด์ของกล่องใน app/pages/ (F4 ขั้น A/B) | ไม่แตะ app/pages จริง: สร้างสำเนา worktree ชั่วคราวใต้ TMPDIR แล้วเก็บกวาดเอง
   ครอบ: (1) app/pages ว่าง = ผลบิลด์เดิมตรงทุกไบต์ (2) กล่องชื่อชนหน้าเดิม ล้มบิลด์พร้อมเหตุผล (3) กล่องรูป React/JSX จากเบ้าจูนบิลด์ได้ ไม่บันเดิล React ซ้ำ เรนเดอร์ใน Chromium ได้
   (4) กล่องรูป h(...) ตรงๆ (แบบ stats.jsx) บิลด์และเรนเดอร์ได้ (5) กล่องที่เขียน window ตก BOX-05 (ยืนยันกติกายังจับ)
   (6) ลงทะเบียนเอง: มานิเฟสต์หลายหน้า+component, บล็อกใน 19-views__settings.ts/sw.js เติมเอง, ลำดับ after, ชื่อซ้ำ/after ผี/export ผี/วงวน ล้มพร้อมเหตุผล, ไฟล์ใน CORE ของ sw.js มีจริงทุกไฟล์
   (7) เครื่องตรวจอ่านบัตรจริง: บัตรอ้างไฟล์ผี/ไฟล์แอบใน parts/JSON ผิด/ชื่อลงทะเบียนผิด ตก BOX-02, เบ้าจูนสร้างกล่องที่ผ่านเองและแผ่นตรวจรับไม่ติ๊กล่วงหน้า
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
for (const r of ['scripts/build-react.mjs', 'app/src', 'app/shared', 'app/data', 'app/tools', 'app/web/js/react', 'app/web/js/m/19-views__settings.js', 'app/web/sw.js', 'package.json']) { fs.mkdirSync(path.dirname(path.join(tmp, r)), { recursive: true }); cp(r); }
fs.rmSync(path.join(tmp, 'app/pages'), { recursive: true, force: true }); fs.mkdirSync(path.join(tmp, 'app/pages'), { recursive: true }); /* สำเนาเริ่มจาก pages ว่าง: ทดสอบเฉพาะกล่องของตัวทดสอบเอง */
fs.mkdirSync(path.join(tmp, 'web-shell/node_modules'), { recursive: true });
for (const m of ['react', 'react-dom', 'scheduler']) fs.cpSync(path.join(root, 'web-shell/node_modules', m), path.join(tmp, 'web-shell/node_modules', m), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'));
try {
  /* บัตรขั้นต่ำของกล่องทดสอบ: บิลด์อ่านมานิเฟสต์จากบัตร จึงทุกกล่องต้องมี BOX.md (ตรงกติกา BOX-02) */
  const miniCard = (name, reg) => '# บัตร\n\n<!-- MACHINE-READABLE-CARD-START -->\n```json\n' + JSON.stringify({ name, layers: { page: 'x', parts: [], tray: 'x', style: 'x' }, register: reg, rules: {} }, null, 2) + '\n```\n<!-- MACHINE-READABLE-CARD-END -->\n\n## แผ่นตรวจรับประจำกล่อง (Acceptance Checklist)\n- [ ] x\n';
  /* (2) ชื่อชน */
  /* กฎ "ชื่อชนกับหน้าเดิม" (build-react.mjs) ตรวจกับ app/src/react/*.jsx | F6 ย้ายหน้าเดิมออกครบแล้ว (เหลือแค่ runtime.js/store.js) จึงไม่มีหน้าเดิมให้ชน
     ข้อนี้ทดสอบเมื่อยังมีหน้าเดิมเหลืออยู่เท่านั้น และถ้าไม่เหลือจะแสดงว่าข้าม (ไม่นับเป็นผ่าน ไม่นับเป็นตก) เพื่อไม่ปลอมผล */
  const legacyFiles = fs.readdirSync(path.join(tmp, 'app/src/react')).filter((x) => x.endsWith('.jsx'));
  if (!legacyFiles.length) {
    console.log('SKIP กล่องชื่อชนหน้าเดิม: ไม่มีหน้าเดิมเหลือใน app/src/react แล้ว (F6 ย้ายครบ) กฎนี้หมดหน้าที่');
  } else {
    const legacyName = legacyFiles[0].replace(/\.jsx$/, ''); /* หน้าเดิมที่ยังอยู่ใน src/react ตอนนี้ (เลือกตอนรัน ไม่ฮาร์ดโค้ด) */
    const Pas = legacyName.replace(/(^|[-_])([a-z0-9])/g, (_, __, c) => c.toUpperCase());
    fs.mkdirSync(path.join(tmp, 'app/pages/' + legacyName), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'app/pages/' + legacyName + '/' + Pas + 'Page.jsx'), 'export default function P(){ return null; }\n');
    const clash = run(tmp, ['scripts/build-react.mjs']);
    t('กล่องชื่อชนหน้าเดิม (' + legacyName + '): บิลด์ล้มพร้อมเหตุผล', !clash.ok && /ชื่อชนกับหน้าเดิม/.test(clash.out), clash.out.slice(-160));
    fs.rmSync(path.join(tmp, 'app/pages/' + legacyName), { recursive: true });
  }
  /* (3) กล่องรูปเบ้าจูน */
  const tun = run(tmp, ['app/tools/tuner.mjs', 'demobox']);
  t('เบ้าจูนสร้างกล่อง', tun.ok, tun.out.slice(-120));
  /* (4) กล่องรูป h ตรงๆ พร้อม prepare */
  fs.mkdirSync(path.join(tmp, 'app/pages/hdirect'));
  fs.writeFileSync(path.join(tmp, 'app/pages/hdirect/HdirectPage.jsx'), "export default function HdirectPage(p){ return h('div', {className:'hd'}, h(Fragment, null, p.msg)); }\nexport const prepare = (raw) => ({ msg: 'x' + raw.n });\n");
  fs.writeFileSync(path.join(tmp, 'app/pages/hdirect/BOX.md'), miniCard('hdirect'));
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
  const hdFile = path.join(tmp, 'app/pages/hdirect/HdirectPage.jsx'), hdKeep = fs.readFileSync(hdFile, 'utf8');
  fs.appendFileSync(hdFile, "window.EvarelPages = {};\n");
  const chk = run(tmp, ['app/tools/checker.mjs']);
  t('กล่องที่เขียน window ตก BOX-05', /BOX-05/.test(chk.out), chk.out.slice(-160));
  fs.writeFileSync(hdFile, hdKeep); /* คืนไฟล์ ไม่ให้ข้อถัดไปบิลด์ไฟล์ที่มี window ค้าง */
  /* (6) ลงทะเบียนเอง: กล่องหลายหน้า+component+after, บล็อกเติมเอง */
  fs.mkdirSync(path.join(tmp, 'app/pages/multi'), { recursive: true });
  const cardOf = (reg) => '# บัตร\n\n<!-- MACHINE-READABLE-CARD-START -->\n```json\n' + JSON.stringify({ name: 'multi', pascalName: 'Multi', layers: { page: 'MultiPage.jsx', parts: ['parts/MultiPart.jsx'], tray: 'multi.tray.js', style: 'multi.style.css' }, register: reg, rules: {} }, null, 2) + '\n```\n<!-- MACHINE-READABLE-CARD-END -->\n\n## แผ่นตรวจรับประจำกล่อง (Acceptance Checklist)\n- [ ] x\n';
  fs.mkdirSync(path.join(tmp, 'app/pages/multi/parts'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'app/pages/multi/MultiPage.jsx'), "export function MultiA(p){ return h('b', { className: 'ma' }, p.t); }\nexport function MultiB(p){ return h(Fragment, null, h('i', null, p.u)); }\nexport const prepB = (raw) => ({ u: 'B' + raw.n });\nexport function MultiCard(p){ return h('s', null, p.t); }\nexport default MultiA;\n");
  fs.writeFileSync(path.join(tmp, 'app/pages/multi/parts/MultiPart.jsx'), 'export const x = 1;\n');
  fs.writeFileSync(path.join(tmp, 'app/pages/multi/multi.tray.js'), 'export const t = 1;\n'); fs.writeFileSync(path.join(tmp, 'app/pages/multi/multi.style.css'), '.m{}\n');
  const setReg = (reg) => fs.writeFileSync(path.join(tmp, 'app/pages/multi/BOX.md'), cardOf(reg));
  const blockTs = () => /REACT_BOX_PAGES:string\[\]=(\[[^\]]*\])/.exec(fs.readFileSync(path.join(tmp, 'app/src/m/19-views__settings.ts'), 'utf8'))[1];
  setReg({ pages: [{ name: 'multiA', export: 'MultiA' }, { name: 'multiB', export: 'MultiB', prepare: 'prepB' }], components: [{ name: 'multiCard', export: 'MultiCard' }], after: ['item-row'] });
  const reg1 = run(tmp, ['scripts/build-react.mjs']);
  t('บิลด์กล่องหลายหน้า+component ผ่านและเติมบล็อกเอง', reg1.ok && /อัปเดตบล็อกลงทะเบียน/.test(reg1.out), reg1.out.slice(-200));
  t('บล็อกใน 19-views__settings.ts ใช้ชื่อไฟล์ ไม่ใช่ชื่อที่ลงทะเบียน', /"hdirect"/.test(blockTs()) && /"multi"/.test(blockTs()) && !/multiA/.test(blockTs()), blockTs());
  const swTxt = fs.readFileSync(path.join(tmp, 'app/web/sw.js'), 'utf8');
  const core = new Function(swTxt.slice(swTxt.indexOf('const CORE'), swTxt.indexOf('];', swTxt.indexOf('const CORE')) + 2) + ';return CORE')();
  t('sw.js CORE ได้ไฟล์กล่องทั้งสองและไม่ซ้ำ', core.includes('./js/react/multi.js') && core.includes('./js/react/hdirect.js') && new Set(core).size === core.length, core.filter((u) => /multi|hdirect/.test(u)).join(','));
  t('ทุกไฟล์ react ใน CORE มีอยู่จริง (กัน addAll ล้ม)', core.filter((u) => u.includes('/react/')).every((u) => fs.existsSync(path.join(tmp, 'app/web', u.replace('./', '')))), 'มีไฟล์หาย');
  const compiled = fs.readFileSync(path.join(tmp, 'app/web/js/m/19-views__settings.js'), 'utf8');
  t('ผลคอมไพล์ .js สะท้อนบล็อกเดียวกับ .ts', JSON.stringify(JSON.parse(blockTs())) === JSON.stringify(eval((/REACT_BOX_PAGES = (\[[^\]]*\])/.exec(compiled) || [0, 'null'])[1])), (/REACT_BOX_PAGES = [^;]*/.exec(compiled) || [''])[0] + ' vs ' + blockTs());
  const chk2 = run(tmp, ['scripts/build-react.mjs', '--check']);
  t('--check ตรงหลังบิลด์ (idempotent)', chk2.ok && /ตรงทุกไฟล์/.test(chk2.out), chk2.out.slice(-160));
  /* ลำดับ: หน้าเดิมต้องมาก่อนกล่องเสมอ และ REACT_PAGES รวม = BASE + กล่อง ตามลำดับ */
  const tsTxt = fs.readFileSync(path.join(tmp, 'app/src/m/19-views__settings.ts'), 'utf8');
  t('REACT_PAGES = BASE ต่อด้วยกล่อง (หน้าเดิมคงลำดับ)', /const REACT_PAGES=REACT_PAGES_BASE\.concat\(REACT_BOX_PAGES\)/.test(tsTxt) && /REACT_PAGES_BASE=\['settings','stats','all','item-row'/.test(tsTxt));
  /* after บังคับลำดับ */
  { const mk = run(tmp, ['app/tools/tuner.mjs', 'aearly']); t('เบ้าจูนสร้างกล่องที่ใช้ทดสอบลำดับได้', mk.ok && fs.existsSync(path.join(tmp, 'app/pages/aearly/BOX.md')), mk.out.slice(-150)); } /* ชื่อมาก่อนตามตัวอักษร แต่ตั้ง after ให้ตามหลัง multi */
  let aMd = fs.readFileSync(path.join(tmp, 'app/pages/aearly/BOX.md'), 'utf8').replace('"register": {', '"register": { "after": ["multi"],');
  fs.writeFileSync(path.join(tmp, 'app/pages/aearly/BOX.md'), aMd);
  const ord = run(tmp, ['scripts/build-react.mjs']);
  const names = JSON.parse(blockTs());
  t('after บังคับลำดับ (aearly ตามหลัง multi ทั้งที่ตัวอักษรมาก่อน)', ord.ok && names.indexOf('multi') < names.indexOf('aearly'), blockTs() + ' ' + ord.out.slice(-150));
  fs.rmSync(path.join(tmp, 'app/pages/aearly'), { recursive: true });
  /* กรณีผิดต้องล้มพร้อมเหตุผล */
  const bad = (label, reg, rx) => { setReg(reg); const r = run(tmp, ['scripts/build-react.mjs']); t(label, !r.ok && rx.test(r.out), r.out.split('\n').filter((l) => /Error:/.test(l))[0] || r.out.slice(-120)); };
  bad('after ชี้ชื่อผี ล้มพร้อมเหตุผล', { pages: [{ name: 'multiA', export: 'MultiA' }], after: ['ghost'] }, /after ชี้ ghost/);
  bad('ชื่อหน้าซ้ำกับกล่องอื่น ล้มพร้อมเหตุผล', { pages: [{ name: 'hdirect', export: 'MultiA' }] }, /ลงทะเบียนซ้ำ/);
  bad('register อ้าง export ที่ไม่มี ล้มพร้อมเหตุผล', { pages: [{ name: 'multiA', export: 'NoSuch' }] }, /ที่ไฟล์หน้าไม่มี/);
  /* วงวน: multi after cyclic, cyclic after multi */
  { const mk = run(tmp, ['app/tools/tuner.mjs', 'cyclic']); t('เบ้าจูนสร้างกล่องที่ใช้ทดสอบวงวนได้', mk.ok && fs.existsSync(path.join(tmp, 'app/pages/cyclic/BOX.md')), mk.out.slice(-150)); }
  { const f = path.join(tmp, 'app/pages/cyclic/BOX.md'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('"register": {', '"register": { "after": ["multi"],')); }
  setReg({ pages: [{ name: 'multiA', export: 'MultiA' }], after: ['cyclic'] });
  const cyc = run(tmp, ['scripts/build-react.mjs']);
  fs.rmSync(path.join(tmp, 'app/pages/cyclic'), { recursive: true, force: true });
  t('after วงวน ล้มพร้อมเหตุผล', !cyc.ok && /เป็นวงวน/.test(cyc.out), (cyc.out.split('\n').filter((l) => /Error:/.test(l))[0]) || cyc.out.slice(-120));
  /* (7) เครื่องตรวจอ่านบัตรจริง */
  const { checkBox } = await import(path.join(tmp, 'app/tools/checker.mjs'));
  setReg({ pages: [{ name: 'multiA', export: 'MultiA' }] });
  const okc = checkBox(path.join(tmp, 'app/pages/multi'));
  t('บัตรที่ตรงไฟล์จริงผ่านเครื่องตรวจ', okc.passed, okc.errors.join(' | '));
  const badCard = (label, mutate, rx) => { const b = path.join(tmp, 'app/pages/multi/BOX.md'); const keep = fs.readFileSync(b, 'utf8'); mutate(); const r = checkBox(path.join(tmp, 'app/pages/multi')); t(label, !r.passed && r.errors.some((e) => rx.test(e)), r.errors.join(' | ')); fs.writeFileSync(b, keep); };
  badCard('บัตรอ้างไฟล์ parts ผี ตก BOX-02', () => fs.writeFileSync(path.join(tmp, 'app/pages/multi/BOX.md'), cardOf({}).replace('parts/MultiPart.jsx', 'parts/Ghost.jsx')), /BOX-02.*Ghost/);
  badCard('ไฟล์แอบใน parts/ ตก BOX-02', () => fs.writeFileSync(path.join(tmp, 'app/pages/multi/parts/Sneak.jsx'), 'export const s = 1;\n'), /ไฟล์แอบ/);
  fs.rmSync(path.join(tmp, 'app/pages/multi/parts/Sneak.jsx'), { force: true });
  badCard('JSON ผิดรูป ตก BOX-02', () => fs.writeFileSync(path.join(tmp, 'app/pages/multi/BOX.md'), cardOf({}).replace('"rules": {}', '"rules": {},')), /JSON ผิดรูป/);
  badCard('register ชื่อผิด ตก BOX-02', () => fs.writeFileSync(path.join(tmp, 'app/pages/multi/BOX.md'), cardOf({ pages: [{ name: '9bad name' }] })), /ชื่อลงทะเบียนที่ไม่ถูกต้อง/);
  /* เบ้าจูนสร้างกล่องที่ผ่านเองและไม่ติ๊กล่วงหน้า */
  fs.rmSync(path.join(tmp, 'app/pages/multi'), { recursive: true }); fs.rmSync(path.join(tmp, 'app/pages/hdirect'), { recursive: true });
  const tn = run(tmp, ['app/tools/tuner.mjs', 'fresh']);
  const fc = checkBox(path.join(tmp, 'app/pages/fresh'));
  const md = fs.readFileSync(path.join(tmp, 'app/pages/fresh/BOX.md'), 'utf8');
  t('เบ้าจูนสร้างกล่องที่ผ่านเครื่องตรวจเองและมี register', tn.ok && fc.passed && /"register"/.test(md), fc.errors.join(' | '));
  t('เบ้าจูนไม่ติ๊กแผ่นตรวจรับล่วงหน้า', !/- \[x\]/i.test(md) && /- \[ \]/.test(md));
  /* กล่องตัวอย่างอ้างอิง (parts เป็นสตริง) ยังผ่าน */
  const ex = checkBox(path.join(tmp, 'app/tools/example_box')); t('example_box (parts สตริง) ผ่านเครื่องตรวจใหม่', ex.passed, ex.errors.join(' | '));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\nผล: ${fails ? 'มีข้อตก ' + fails : 'ผ่านทุกข้อ'}`); process.exit(fails ? 1 : 0);

// เสริม prove_aishell_tray (ซึ่งครอบเฉพาะเส้นทางสตริง Pages.aiShell): ตัวนี้ครอบ Components.aiShell (เส้นทาง mount) และ avatarBg ที่ prove_aishell_tray ไม่ส่ง
// เรนเดอร์ HTML เท่า bundle เดิมทุกไบต์ ทุกทางของ userName (ส่งมา/โปรไฟล์/ไม่มีผู้ใช้/profileOf ไม่มี) ทั้งสองเส้นทาง
// ใช้: node tests/aishell_bundle_equiv.test.mjs <aiShell.js เดิม>   (ไฟล์ใหม่อ่านจาก app/web/js/react/aiShell.js)
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/aiShell.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('aishellprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const W = window, R = W.EvarelReact, r = {}; delete W.EvarelPages.aiShell; (0, eval)(code);
    const keep = W.profileOf, keepUser = W.ST.USER;
    const both = (k, props) => {
      try { r['สตริง ' + k] = W.EvarelPages.aiShell(props); } catch (e) { r['สตริง ' + k] = 'ERR:' + e.message; }
      try { r['คอมโพเนนต์ ' + k] = R.renderToStaticMarkup(R.h(W.EvarelComponents.aiShell, props)); } catch (e) { r['คอมโพเนนต์ ' + k] = 'ERR:' + e.message; }
    };
    both('ส่งชื่อ+สีอวตาร', { placeholder: 'ถาม AI', avatarText: 'ส', avatarBg: '#7a5af8', userName: 'สมชาย' });
    both('ชื่ออักขระพิเศษ', { placeholder: 'ถาม <AI> "x"', avatarText: 'A', avatarBg: 'oklch(0.7 0.1 200)', userName: 'a<b>&"c' });
    W.ST.USER = { name: 'มาลี ใจดี', email: 'm@x.y', id: 'u2' };
    both('ไม่ส่งชื่อ ใช้โปรไฟล์', { placeholder: 'ถาม AI', avatarText: 'ม', avatarBg: '#12b76a' });
    W.ST.USER = null; both('ไม่ส่งชื่อ ไม่มีผู้ใช้', { placeholder: 'ถาม AI', avatarText: '?' });
    W.ST.USER = keepUser; W.profileOf = undefined;
    both('ไม่ส่งชื่อ profileOf ไม่มี', { placeholder: 'ถาม AI', avatarText: 'ส' });
    both('ส่งชื่อ profileOf ไม่มี', { placeholder: 'ถาม AI', avatarText: 'ส', userName: 'ก' });
    W.profileOf = keep;
    both('ว่างหมด', { placeholder: '', avatarText: '' });
    return r;
  }, bundle);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = [];
for (const k of Object.keys(a.out)) { const x = a.out[k], y = c.out[k]; const same = x === y && typeof x === 'string' && !x.startsWith('ERR') && x.length > 500; same ? ok++ : bad.push(k + ' | เดิม ' + String(x).slice(0, 45) + ' | ใหม่ ' + String(y).slice(0, 45)); }
console.log('เทียบ', Object.keys(a.out).length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.length ? bad.slice(0, 6) : '');
const S = (k) => c.out[k] || '';
const g = { 'สีอวตาร(--av)': /--av:\s*#7a5af8/.test(S('สตริง ส่งชื่อ+สีอวตาร')) ? 1 : 0, 'ชื่อจากโปรไฟล์': /มาลี ใจดี/.test(S('คอมโพเนนต์ ไม่ส่งชื่อ ใช้โปรไฟล์')) ? 1 : 0, 'ชื่อที่ส่งมา': /สมชาย/.test(S('คอมโพเนนต์ ส่งชื่อ+สีอวตาร')) ? 1 : 0, 'ชื่อว่าง(guard)': /ev-foot-name"><\/span>/.test(S('สตริง ไม่ส่งชื่อ profileOf ไม่มี')) ? 1 : 0, 'ปุ่ม plus aria-expanded': /ev-plus[^>]*aria-expanded="false"/.test(S('สตริง ว่างหมด')) ? 1 : 0 };
console.log('สาขาถูกเรนเดอร์จริง:', JSON.stringify(g)); for (const [n, v] of Object.entries(g)) if (!v) bad.push('สาขาไม่ถูกทดสอบ: ' + n);
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

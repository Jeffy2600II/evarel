// พิสูจน์ F3.3-g11: เปลือกผู้ช่วย AI ที่รับ icon/profileOf ผ่านถาด ai.tray.js เรนเดอร์ HTML เท่าไฟล์เดิมทุกไบต์
// รวมทางที่ guard เดิมทำงาน (profileOf ไม่มี) และทางที่ถาด AI ต้องไม่พังแม้ชั้น m ยังไม่ตั้งค่าบางตัว | ใช้: node tests/prove_aishell_tray.mjs <aiShell.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/aiShell.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('aishellp'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const W = window, r = {}; delete W.EvarelPages.aiShell; (0, eval)(code);
    const put = (k, fn) => { try { r[k] = fn(); } catch (e) { r[k] = 'ERR:' + e.message; } };
    const shell = (props) => W.EvarelPages.aiShell(props);
    const keep = W.profileOf, keepUser = W.ST.USER;
    put('ส่งชื่อมา', () => shell({ placeholder: 'ถาม AI', avatarText: 'ส', userName: 'สมชาย' }));
    put('ส่งชื่อ+อักขระพิเศษ', () => shell({ placeholder: 'ถาม <AI> "x"', avatarText: 'A', userName: 'a<b>&"c' }));
    W.ST.USER = { name: 'มาลี ใจดี', email: 'm@x.y', id: 'u2' };
    put('ไม่ส่งชื่อ ใช้โปรไฟล์', () => shell({ placeholder: 'ถาม AI', avatarText: 'ม' }));
    W.ST.USER = null; put('ไม่ส่งชื่อ ไม่มีผู้ใช้', () => shell({ placeholder: 'ถาม AI', avatarText: '?' }));
    W.ST.USER = keepUser;
    W.profileOf = undefined; put('ไม่ส่งชื่อ profileOf ไม่มี (ทาง guard)', () => shell({ placeholder: 'ถาม AI', avatarText: 'ส' }));
    put('ส่งชื่อ profileOf ไม่มี', () => shell({ placeholder: 'ถาม AI', avatarText: 'ส', userName: 'ก' }));
    W.profileOf = keep;
    put('placeholder ว่าง', () => shell({ placeholder: '', avatarText: '' }));
    return r;
  }, bundle);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
const keys = Object.keys(a.out); let ok = 0; const bad = [];
for (const k of keys) { const x = a.out[k], y = c.out[k]; const real = typeof x === 'string' && !x.startsWith('ERR') && x.length > 500; (x === y && real) ? ok++ : bad.push(k + ' | ' + String(x).slice(0, 60) + ' | ' + String(y).slice(0, 60)); }
const guard = (c.out['ไม่ส่งชื่อ profileOf ไม่มี (ทาง guard)'] || '').includes('ev-foot-name');
console.log('เทียบ', keys.length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.slice(0, 5));
console.log('ทาง guard (profileOf ไม่มี) เรนเดอร์ผ่าน:', guard, '| pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length || !guard ? 1 : 0);

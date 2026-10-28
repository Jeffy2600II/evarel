// พิสูจน์ F6 หน้าตั้งค่า: Pages.settings (ผลบิลด์ใหม่จากกล่อง shared/settings) เรนเดอร์ HTML เท่าไฟล์เดิมทุกไบต์ ทุกสาขาของ props
// ใช้: node tests/settings_equiv.test.mjs <settings.js เดิม>   (ไฟล์ใหม่อ่านจาก app/web/js/react/settings.js)
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/settings.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const base = {
  user: { name: 'ทดสอบ ผู้ใช้', email: 'a@example.com', provider: 'email' }, notif: { note: 'เปิดอยู่', state: 'เปิด' }, total: 3,
  themeSegHTML: '<div data-t="seg">ธีม</div>', perfSegHTML: '<div data-t="perf">perf</div>', backIconHTML: '<svg data-i="back"></svg>',
  avatarText: 'ท', avatarBg: '#abc123', avatarName: 'ทดสอบ ผู้ใช้', showNotifyBtn: true, notifyBtnLabel: 'เปิดแจ้งเตือน',
  googleChipInner: '<i>G</i>Google', usageHTML: '<p>usage</p>', versionHTML: '<p>v1</p>',
};
const CASES = {
  อีเมล_มีปุ่ม: base,
  google_ไม่มีปุ่ม: { ...base, user: { ...base.user, provider: 'google' }, showNotifyBtn: false },
  ชื่อและอีเมลยาว: { ...base, user: { name: 'ก'.repeat(80), email: 'x'.repeat(90) + '@example.com', provider: 'email' } },
  รายการศูนย์: { ...base, total: 0, notif: { note: 'ปิดอยู่ <b>ไม่ใช่แท็ก</b>', state: 'ปิด' } },
  สัญลักษณ์พิเศษ: { ...base, avatarName: 'a"b&c<d>', notifyBtnLabel: 'ปุ่ม "พิเศษ" & <x>', usageHTML: '', versionHTML: '' },
};
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('setprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
  const out = await p.evaluate(({ code, cases }) => {
    delete window.EvarelPages.settings; (0, eval)(code);
    const r = {}; for (const [k, q] of Object.entries(cases)) { try { r[k] = window.EvarelPages.settings(q); } catch (e) { r[k] = 'ERR:' + e.message; } }
    return r;
  }, { code: bundle, cases: CASES });
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = [];
for (const k of Object.keys(CASES)) { const same = a.out[k] === c.out[k] && !String(a.out[k]).startsWith('ERR'); same ? ok++ : bad.push(k + ' เดิม=' + String(a.out[k]).slice(0, 60) + ' ใหม่=' + String(c.out[k]).slice(0, 60)); }
console.log('เทียบ', Object.keys(CASES).length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง', bad.length, bad.length ? bad : '');
console.log('ความยาว HTML (กรณีแรก):', (c.out['อีเมล_มีปุ่ม'] || '').length, '| มีหัวข้อ ตั้งค่า:', /<h2>ตั้งค่า<\/h2>/.test(c.out['อีเมล_มีปุ่ม'] || ''), '| google มี chip-g:', /ev-chip-g/.test(c.out['google_ไม่มีปุ่ม'] || ''), '| ไม่มีปุ่มเมื่อ showNotifyBtn=false:', !/data-act="notify"/.test(c.out['google_ไม่มีปุ่ม'] || ''));
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

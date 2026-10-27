// พิสูจน์ F3.3-g4: การ์ดโควตาที่รับ resetClock/resetIn ผ่านถาด เรนเดอร์ HTML เท่ากับไฟล์เดิมทุกไบต์ (ตรึงเวลาให้เท่ากันทั้งสองฝั่ง)
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/quota.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const NOW = Date.UTC(2026, 9, 27, 8, 0, 0);
const CASES = {
  ปกติ: { calls: { used: 3, limit: 20 }, tokens: { used: 12345, limit: 100000 }, blocked: false, resetAt: new Date(NOW + 5 * 3600e3 + 25 * 60e3).toISOString() },
  ใช้ครบ: { calls: { used: 20, limit: 20 }, tokens: { used: 100000, limit: 100000 }, blocked: true, resetAt: new Date(NOW + 90 * 60e3).toISOString() },
  เหลือน้อยกว่าชั่วโมง: { calls: { used: 10, limit: 20 }, tokens: { used: 500, limit: 100000 }, blocked: false, resetAt: new Date(NOW + 17 * 60e3).toISOString() },
  เลยเวลาแล้ว: { calls: { used: 1, limit: 20 }, tokens: { used: 1, limit: 100000 }, blocked: false, resetAt: new Date(NOW - 60e3).toISOString() },
  resetAtผิดรูป: { calls: { used: 1, limit: 20 }, tokens: { used: 1, limit: 100000 }, blocked: false, resetAt: 'not-a-date' },
  ขอบเที่ยงคืนไทย: { calls: { used: 0, limit: 5 }, tokens: { used: 0, limit: 1000 }, blocked: false, resetAt: '2026-10-27T16:59:00.000Z' },
};
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('quotaprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
  const out = await p.evaluate(({ code, cases, now }) => {
    const realNow = Date.now; Date.now = () => now;
    delete window.EvarelPages.quotaBody; (0, eval)(code);
    const r = {}; for (const [k, q] of Object.entries(cases)) { try { r[k] = window.EvarelPages.quotaBody({ quota: q }); } catch (e) { r[k] = 'ERR:' + e.message; } }
    Date.now = realNow; return r;
  }, { code: bundle, cases: CASES, now: NOW });
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = [];
for (const k of Object.keys(CASES)) { const same = a.out[k] === c.out[k] && !String(a.out[k]).startsWith('ERR'); same ? ok++ : bad.push(k + ' เดิม=' + String(a.out[k]).slice(0, 70) + ' ใหม่=' + String(c.out[k]).slice(0, 70)); }
console.log('เทียบ', Object.keys(CASES).length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง', bad.length, bad.length ? bad : '');
console.log('ตัวอย่าง HTML (ใช้ครบ):', (c.out['ใช้ครบ'] || '').replace(/\s+/g, ' ').slice(-150));
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

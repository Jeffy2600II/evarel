// ยิงจริงในหน้าแอป (เสิร์ฟจากเครื่อง): กดส่งฟอร์มล็อกอิน/สมัครด้วยค่าผิด ดูข้อความตรวจฟอร์มที่ขึ้นบนหน้า เทียบกับฐาน (เส้นทาง authSubmit -> window.authValidate -> core/authform)
import { chromium } from 'playwright'; import fs from 'fs';
import { serveLocalAs, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } }); await serveLocalAs(ctx, process.env.EVAREL_WEB_DIR);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate(async () => {
  const out = {}; out.fn = typeof window.authValidate; out.re = String(window.EMAIL_RE); out.pw = window.PW_MIN;
  out.cases = [['login', { email: '', password: '' }], ['login', { email: 'bad', password: 'x' }], ['signup', { name: '', email: 'a@b.cc', password: '123', terms: false }], ['signup', { name: 'ก', email: 'a@b.cc', password: '12345678', terms: true }], ['code', { code: '12345' }], ['newpw', { password: '1' }]].map(([k, v]) => JSON.stringify(window.authValidate(k, v)));
  return out;
});
console.log(JSON.stringify(r).slice(0, 700)); console.log('pageerror', errs.length, JSON.stringify(errs.slice(0,6)));
await b.close();
// เกณฑ์: ฟังก์ชันต้องใช้ได้ ค่าตรง และผลทั้งหกกรณีมี 5 ผลไม่ว่าง | pageerror ไม่ใช่เกณฑ์ล้ม (โหลดโดยไม่มี API จริงมี error ที่ฐานก็มี) ให้เทียบ stdout บรรทัด pageerror กับฐานด้วย diff แทน
process.exit(r.fn !== 'function' || r.pw !== 8 || r.cases.filter(c => c !== '{}').length !== 5 ? 1 : 0);

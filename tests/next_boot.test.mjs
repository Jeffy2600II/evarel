/* S4 next-pages ไบต์ N1: พิสูจน์ว่า build ของ Next (web-next/out) บูตแอปจริงได้
   — โหลดหน้า รอบันเดิล+เครื่องยนต์ แล้วเช็คว่าแอปวิ่ง (ST, render แล้ว, ทำงานเป็น React ครบ, pageerror 0)
   รัน: node tests/next_boot.test.mjs (ต้องมี 8791 เสิร์ฟ web-next/out) */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, API } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('nextboot');
try {
  const ctx = await b.newContext(); await ctx.addInitScript(a => { window.EVAREL_API = a; }, API); const p = await ctx.newPage(); // ฉีด API แบบเดียวกับทุกเทสของเส้นทางเดิม (live_user.mjs)
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8779/index.html');
  const st = await (async () => { let r = { ready: false, nav: false, auth: false }; for (let i = 0; i < 40; i++) { r = await p.evaluate(() => ({ ready: typeof window.ST === 'object' && !!window.UI, nav: !!document.querySelector('#nav li'), auth: !document.getElementById('auth').hidden || window.UI?.auth?.status === 'in' })); if (r.ready && (r.nav || r.auth)) return r; await p.waitForTimeout(250); } return r; })();
  ok('เครื่องยนต์บูตครบ (ST+UI มาจากบันเดิล)', st.ready, JSON.stringify(st));
  ok('หน้าแรกเรนเดอร์ (nav หรือ auth แสดง)', st.nav || st.auth, JSON.stringify(st));
  ok('ไม่มี js/m ใน DOM (โหลดเป็นบันเดิลแทน)', await p.evaluate(() => ![...document.querySelectorAll('script[src]')].some(s => s.src.includes('/js/app/'))));
  ok('ไม่มี pageerror ตลอดบูต', errs.length === 0, errs.join('; ').slice(0, 300));
  /* ล็อกอินจริง (session จาก API ทดสอบ): แอปเต็มต้องวิ่ง — nav + หน้าวันนี้ + React mount */
  {
    const ctx2 = await b.newContext();
    await ctx2.addInitScript(([a, s]) => { window.EVAREL_API = a; localStorage.setItem('evarel-session-v2', JSON.stringify(s)); }, [API, user.session]);
    const p2 = await ctx2.newPage();
    const errs2 = []; p2.on('pageerror', e => errs2.push(String(e)));
    await p2.goto('http://localhost:8779/index.html');
    const st2 = await (async () => { let r = { nav: false, app: false, mount: false }; for (let i = 0; i < 40; i++) { r = await p2.evaluate(() => ({ nav: !!document.querySelector('#nav li'), app: !!document.querySelector('#app .ev-main, #app .ev-page-bar, #app section'), mount: !!window.EvarelMount?.roots && Object.keys(window.EvarelMount.roots).length > 0 })); if (r.nav && r.app) return r; await p2.waitForTimeout(250); } return r; })();
    ok('ล็อกอินแล้วแอปเต็มวิ่ง (nav+หน้าแรก)', st2.nav && st2.app, JSON.stringify(st2));
    ok('React mount ใช้งานบนบันเดิล Next', st2.mount, JSON.stringify(st2));
    ok('ไม่มี pageerror หลังล็อกอิน', errs2.length === 0, errs2.join('; ').slice(0, 250));
    await ctx2.close();
  }
  await ctx.close();
} catch (e) { ok('ไม่มี exception', false, String(e).slice(0, 300)); }
await b.close();
console.log(`\nผล: ${pass} ผ่าน ${fail} ตก`);
if (fail) process.exit(1);

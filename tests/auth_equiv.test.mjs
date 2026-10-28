/* เทียบหน้าล็อกอิน: ฉบับ string เดิม (22-views__auth AUTH_VIEWS) กับฉบับ React จริง (shared/auth/AuthPage.jsx)
   เกณฑ์: DOM จริงเท่ากันทุกไบต์ (browser-serialized innerHTML) ทั้งสองฝั่ง
   ครอบกรณี: ทุก auth screen (welcome, login, signup, forgot, sent, code, newpw) + loading splash
   รัน: node tests/auth_equiv.test.mjs */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('authequiv');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html');
  const authReady = await (async () => { for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.auth)) return true; await p.waitForTimeout(200); } return false; })();
  if (!authReady) { ok('React auth โหลดแล้ว (EvarelComponents.auth)', false, 'ยังไม่โหลด'); }
  else {
    ok('React auth โหลดแล้ว (EvarelComponents.auth)', true);
    const screens = ['welcome', 'login', 'signup', 'forgot', 'sent', 'code', 'newpw', 'loading'];
    for (const sc of screens) {
      const r = await p.evaluate((sc) => {
        const w = window;
        w.UI.auth.email = 'test@example.com';
        w.UI.auth.codeType = 'recovery';
        const html = sc === 'loading' ? w.AUTH_SPLASH : w.AUTH_VIEWS[sc]();
        const a = document.createElement('div'); a.innerHTML = `<div class="ev-auth-in">${html}</div>`; document.body.appendChild(a);
        const bEl = document.createElement('div'); document.body.appendChild(bEl);
        const root = w.EvarelReact.createRoot(bEl);
        w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(w.EvarelComponents.auth, { screen: sc })));
        const A = a.innerHTML, B = bEl.innerHTML;
        a.remove(); bEl.remove(); root.unmount();
        return { sc, same: A === B, A: A.slice(0, 300), B: B.slice(0, 300) };
      }, sc);
      ok(`auth_equiv ${sc}`, r.same, r.same ? '' : `\n A=${r.A}\n B=${r.B}`);
    }
  }
  /* วงจรจริงบนหน้าจริง: สลับหน้า auth ผ่าน au-go */
  if (authReady) {
    await p.evaluate(() => { window.UI.auth.status = 'out'; window.$('auth').dataset.screen = ''; window.renderAuthRoot(); });
    const screens2 = [
      { from: 'welcome', to: 'login', label: 'welcome→login' },
      { from: 'login', to: 'signup', label: 'login→signup' },
      { from: 'signup', to: 'forgot', label: 'signup→forgot' },
      { from: 'forgot', to: 'welcome', label: 'forgot→welcome' },
    ];
    for (const t of screens2) {
      const r = await p.evaluate((t) => {
        const w = window;
        window.UI.auth.screen = t.from; window.$('auth').dataset.screen = ''; window.renderAuthRoot();
        const before = window.$('auth').dataset.screen;
        window.UI.auth.screen = t.to; window.renderAuthRoot();
        const after = window.$('auth').dataset.screen;
        const hasRoot = !!window.EvarelMount?.roots?.auth;
        const hasForm = !!window.$('auth').querySelector('form, .ev-hero, .ev-sent');
        return { label: t.label, before, after, hasRoot, hasForm };
      }, t);
      ok(`วงจร ${t.label}`, r.after === t.to && r.hasRoot && r.hasForm, JSON.stringify(r));
    }
    ok('ไม่มี pageerror ตลอดวงจร', errs.length === 0, errs.join('; '));
  }
} catch (e) { ok('ไม่มี exception', false, String(e)); }
await b.close();
console.log(`\nผล: ${pass} ผ่าน ${fail} ตก`);
if (fail) process.exit(1);

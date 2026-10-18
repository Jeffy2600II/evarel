/* เทียบแถบนำทางล่าง: ฉบับ string เดิม (23-render tabs.join) กับฉบับ React จริง (react/nav.jsx NavTabs)
   เกณฑ์: DOM จริงเท่ากันทุกไบต์ ครอบทุกแท็บเป็นแท็บปัจจุบัน + ปุ่ม + ตรงกลาง
   รัน: node tests/nav_equiv.test.mjs  (ต้องมีเซิร์ฟเวอร์ 8779 เสิร์ฟ app/web) */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('navequiv');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html');
  for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.nav)) break; await p.waitForTimeout(200); }
  const ready = await p.evaluate(() => !!window.EvarelComponents?.nav);
  ok('React nav โหลดแล้ว', ready);
  if (ready) {
    const out = [];
    const run = async (name, tab) => {
      const r = await p.evaluate(({ name, tab }) => {
        const w = window;
        /* classic: template เดิมจาก render() */
        const tabs = w.TABS.map(([id, l, ic]) => `<li><button data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}><span class="pill">${w.icon(ic)}</span>${l}</button></li>`);
        tabs.splice(2, 0, `<li><button class="add" data-act="add" aria-label="เพิ่มรายการ">${w.icon('plus')}</button></li>`);
        const a = document.createElement('nav'); a.innerHTML = tabs.join(''); document.body.appendChild(a);
        const bEl = document.createElement('nav'); document.body.appendChild(bEl);
        const root = w.EvarelReact.createRoot(bEl);
        w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(w.EvarelComponents.nav, { tab })));
        const A = a.innerHTML, B = bEl.innerHTML;
        a.remove(); bEl.remove(); root.unmount();
        return { name, same: A === B, A: A.slice(0, 300), B: B.slice(0, 300) };
      }, { name, tab });
      ok(r.name, r.same, r.same ? '' : `\n A=${r.A}\n B=${r.B}`);
      if (!r.same) out.push(r);
    };
    for (const t of ['today', 'all', 'calendar', 'stats']) await run('แท็บปัจจุบัน ' + t, t);
    /* ตรวจ mount จริงบนแอป: nav ที่แสดงอยู่เป็น React root + กดสลับแท็บได้ */
    const live = await p.evaluate(() => ({ roots: Object.keys(window.EvarelMount.roots), navLi: document.querySelectorAll('nav li').length, cur: document.querySelector('nav [aria-current="page"]')?.dataset?.tab }));
    ok('แอปจริง: nav เป็น React root + 5 li (4 แท็บ + ปุ่ม +)', live.roots.includes('nav') && live.navLi === 5, JSON.stringify(live));
    ok('แอปจริง: aria-current ตรงแท็บ today', live.cur === 'today');
    await p.click('nav [data-tab="calendar"]'); await p.waitForTimeout(400);
    const after = await p.evaluate(() => ({ cur: document.querySelector('nav [aria-current="page"]')?.dataset?.tab, tab: window.UI.tab, roots: Object.keys(window.EvarelMount.roots) }));
    ok('กดสลับแท็บได้ (today→calendar) พร้อม React remount', after.cur === 'calendar' && after.tab === 'calendar' && after.roots.includes('nav'), JSON.stringify(after));
    await p.click('nav [data-tab="today"]'); await p.waitForTimeout(400);
    ok('กดกลับ today ได้', (await p.evaluate(() => window.UI.tab)) === 'today');
    ok('ไม่มี pageerror ระหว่างทดสอบ', errs.length === 0, errs.join(' | ').slice(0, 200));
  }
} finally { await b.close(); }
console.log(`เทียบ nav ${pass} ผ่าน | ${fail} ตก`);
process.exit(fail ? 1 : 0);

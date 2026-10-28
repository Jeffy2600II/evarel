/* เทียบเนื้อ sheet โควตา + หน้าตั้งค่า: ฉบับ string เดิม (16/19) กับฉบับ React จริง (shared/quota/QuotaPage.jsx + settings.jsx SettingsPage)
   เกณฑ์: DOM จริงเท่ากัน (normalize style ตามแพทเทิร์น ai_equiv) + วงจรเปิดจริงบนหน้าเว็บ (mountAt ที่ #sheetBody/#page)
   รัน: node tests/quota_settings_equiv.test.mjs */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('qs_equiv');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html');
  const ready = await (async () => { for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.quotaBody && !!window.EvarelComponents?.settings)) return true; await p.waitForTimeout(200); } return false; })();
  if (!ready) { ok('React quotaBody+settings โหลดแล้ว', false, 'ยังไม่โหลด'); }
  else {
    ok('React quotaBody+settings โหลดแล้ว', true);
    const normStyle = (h) => h.replace(/style="([^"]*)"/g, (m, v) => 'style="' + v.split(';').map(x => x.trim()).filter(Boolean).map(x => x.replace(/:\s+/, ':')).sort().join(';') + '"');

    /* === QUOTA parity: 4 สถานะโควตา === */
    const states = [
      { name: 'ปกติ', q: { blocked: false, resetAt: new Date(Date.now() + 3600000).toISOString(), calls: { used: 5, limit: 60, remaining: 55 }, tokens: { used: 12345, limit: 60000, remaining: 47655 } } },
      { name: 'ตัน', q: { blocked: true, reason: 'calls', resetAt: new Date(Date.now() + 7200000).toISOString(), calls: { used: 60, limit: 60, remaining: 0 }, tokens: { used: 59000, limit: 60000, remaining: 1000 } } },
      { name: 'โควต้าสูง', q: { blocked: false, resetAt: new Date(Date.now() + 60000).toISOString(), calls: { used: 0, limit: 200, remaining: 200 }, tokens: { used: 0, limit: 200000, remaining: 200000 } } },
      { name: 'เกินครึ่ง', q: { blocked: false, resetAt: new Date(Date.now() + 30000).toISOString(), calls: { used: 31, limit: 60, remaining: 29 }, tokens: { used: 30000, limit: 60000, remaining: 30000 } } },
    ];
    for (const st of states) {
      const r = await p.evaluate((q) => {
        const w = window;
        w.ST.QUOTA = q;
        const html = w.quotaSheetHTML();
        const a = document.createElement('div'); a.innerHTML = html; document.body.appendChild(a);
        const bEl = document.createElement('div'); document.body.appendChild(bEl);
        const root = w.EvarelReact.createRoot(bEl);
        w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(w.EvarelComponents.quotaBody, { quota: q })));
        const normStyle = (h) => h.replace(/style="([^"]*)"/g, (m, v) => 'style="' + v.split(';').map(x => x.trim()).filter(Boolean).map(x => x.replace(/:\s+/, ':')).sort().join(';') + '"');
        const A = normStyle(a.innerHTML), B = normStyle(bEl.innerHTML);
        a.remove(); bEl.remove(); root.unmount();
        return { same: A === B, A: A.slice(0, 250), B: B.slice(0, 250) };
      }, st.q);
      ok(`quota_equiv ${st.name}`, r.same, r.same ? '' : `\n A=${r.A}\n B=${r.B}`);
    }

    /* === QUOTA วงจรจริง: เปิด sheet โควตาบนหน้าเว็บ === */
    const cyc = await p.evaluate(() => {
      const w = window;
      w.ST.QUOTA = { blocked: false, resetAt: new Date(Date.now() + 3600000).toISOString(), calls: { used: 5, limit: 60, remaining: 55 }, tokens: { used: 12345, limit: 60000, remaining: 47655 } };
      w.quotaSheet();
      const body = document.getElementById('sheetBody');
      return { hasRoot: !!w.EvarelMount?.roots?.sheet, hasBody: !!body, hasBar: !!body?.querySelector('.ev-qbar'), rows: body?.querySelectorAll('.ev-qrow').length };
    });
    ok('วงจรเปิด sheet โควตา (React mount ที่ #sheetBody)', cyc.hasRoot && cyc.hasBody && cyc.hasBar && cyc.rows === 2, JSON.stringify(cyc));

    /* === SETTINGS parity: React mount ที่ #page === */
    const sp = await p.evaluate(() => {
      const w = window;
      const html = w.settingsHTML();
      const a = document.createElement('div'); a.innerHTML = html; document.body.appendChild(a);
      const bEl = document.createElement('div'); document.body.appendChild(bEl);
      const root = w.EvarelReact.createRoot(bEl);
      const props = w.settingsProps();
      w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(w.EvarelComponents.settings, props)));
      const normStyle = (h) => h.replace(/style="([^"]*)"/g, (m, v) => 'style="' + v.split(';').map(x => x.trim()).filter(Boolean).map(x => x.replace(/:\s+/, ':')).sort().join(';') + '"');
      const A = normStyle(a.innerHTML), B = normStyle(bEl.innerHTML);
      a.remove(); bEl.remove(); root.unmount();
      return { same: A === B, A: A.slice(0, 250), B: B.slice(0, 250) };
    });
    ok('settings_equiv (classic string vs React mount)', sp.same, sp.same ? '' : `\n A=${sp.A}\n B=${sp.B}`);

    /* === SETTINGS วงจรจริง: เปิด/ปิดหน้าตั้งค่า + สลับธีม + unmount สะอาด === */
    const c1 = await p.evaluate(() => { window.settingsOpen(); const pg = document.getElementById('page'); return { hasRoot: !!window.EvarelMount?.roots?.settings, hasBar: !!pg?.querySelector('.ev-page-bar'), hasScroll: !!pg?.querySelector('.ev-page-scroll') }; });
    ok('วงจรเปิดหน้าตั้งค่า (mountAt ที่ #page)', c1.hasRoot && c1.hasBar && c1.hasScroll, JSON.stringify(c1));
    const c2 = await p.evaluate(() => { window.applyTheme('dark'); window.settingsRepaint(); return { hasRoot: !!window.EvarelMount?.roots?.settings, theme: document.documentElement.dataset.theme || document.body.dataset.theme || '' }; });
    ok('วงจรสลับธีม + repaint ผ่าน React', c2.hasRoot, JSON.stringify(c2));
    const c3 = await p.evaluate(() => { const n = window.LAYERS.length; for (let i = 0; i < n; i++) window.popLayer(); return { layersEmpty: window.LAYERS.length === 0 }; });
    ok('วงจรปิดหน้าตั้งค่า (popLayer สะอาด)', c3.layersEmpty, JSON.stringify(c3));
    const c4 = await p.evaluate(() => { window.settingsOpen(); return { reopened: !!window.EvarelMount?.roots?.settings }; });
    ok('วงจรเปิดซ้ำหลังปิด (remount)', c4.reopened, JSON.stringify(c4));
    ok('ไม่มี pageerror ตลอดวงจร', errs.length === 0, errs.join('; ').slice(0, 200));
  }
} catch (e) { ok('ไม่มี exception', false, String(e).slice(0, 300)); }
await b.close();
console.log(`\nผล: ${pass} ผ่าน ${fail} ตก`);
if (fail) process.exit(1);

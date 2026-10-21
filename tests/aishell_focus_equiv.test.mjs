/* เทียบเปลือกหน้า AI (aiShellHTML) กับหน้าจับเวลา (focusBody): string เดิม vs React mount จริง
   + วงจรจริงบนหน้าเว็บ: เปิด AI/เปิดโฟกัส/อัปเดต tick ผ่าน rerender/ปิดสะอาด
   รัน: node tests/aishell_focus_equiv.test.mjs */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('af_equiv');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html');
  const ready = await (async () => { for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.aiShell && !!window.EvarelComponents?.focus)) return true; await p.waitForTimeout(200); } return false; })();
  if (!ready) { ok('React aiShell+focus โหลดแล้ว', false, 'ยังไม่โหลด'); }
  else {
    ok('React aiShell+focus โหลดแล้ว', true);

    /* AI shell parity */
    const r1 = await p.evaluate(() => {
      const w = window;
      const html = w.aiShellHTML(w.AI_PLACEHOLDER, w.initial());
      const a = document.createElement('div'); a.innerHTML = html; document.body.appendChild(a);
      const bEl = document.createElement('div'); document.body.appendChild(bEl);
      const root = w.EvarelReact.createRoot(bEl);
      w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(w.EvarelComponents.aiShell, { placeholder: w.AI_PLACEHOLDER, avatarText: w.initial(), avatarBg: w.profileOf().bg })));
      const A = a.innerHTML, B = bEl.innerHTML;
      a.remove(); bEl.remove(); root.unmount();
      return { same: A === B, i: A === B ? -1 : A.split('').findIndex((c, i) => c !== B[i]), lenA: A.length, lenB: B.length };
    });
    ok('aishell_equiv (string vs React mount)', r1.same, r1.same ? '' : `diff@${r1.i} lenA=${r1.lenA} lenB=${r1.lenB}`);

    /* AI วงจรจริง: เปิดหน้า AI → เช็คโครงครบ → ปิดสะอาด */
    const c1 = await p.evaluate(() => {
      const w = window; w.openAI();
      return { shellRoot: !!w.EvarelMount?.roots?.aiShell, aiRoot: !!w.EvarelMount?.roots?.ai, hasComposer: !!document.getElementById('aiForm'), hasDrawer: !!document.getElementById('drawer'), hasAibar: !!document.querySelector('.ev-aibar'), hasScroll: !!document.getElementById('aiScroll') };
    });
    ok('วงจรเปิดหน้า AI (aiShell mount ที่ #page + ai ที่ #aiBody)', c1.shellRoot && c1.aiRoot && c1.hasComposer && c1.hasDrawer && c1.hasAibar && c1.hasScroll, JSON.stringify(c1));
    const c2 = await p.evaluate(() => { const n = window.LAYERS.length; for (let i = 0; i < n; i++) window.popLayer(); return { empty: window.LAYERS.length === 0, shellGone: !window.EvarelMount?.roots?.aiShell, aiGone: !window.EvarelMount?.roots?.ai }; });
    ok('วงจรปิดหน้า AI (unmount ทั้งสอง root สะอาด)', c2.empty && c2.shellGone && c2.aiGone, JSON.stringify(c2));

    /* Focus parity: 3 สถานะ (ยังไม่เริ่ม/กำลังวิ่ง/หยุดชั่วคราว) */
    const seeded = await p.evaluate(() => {
      const w = window;
      const it = { id: Date.now(), title: 'อ่านหนังสือ', subject: '', start: w.TODAY, end: '', time: '', timeEnd: '', type: 'task', track: 'timer', target: 30, unitName: 'นาที', repeat: { unit: 'day', every: 1, days: [] }, skip: {}, rem: [], log: {} };
      w.S.items.push(it); return it.id;
    });
    const states = [
      { name: 'พร้อมเริ่ม', tm: null },
      { name: 'กำลังจับเวลา', tm: { startedAt: Date.now() - 65000, acc: 0 } },
      { name: 'หยุดชั่วคราว', tm: { startedAt: null, acc: 123000 } },
    ];
    for (const st of states) {
      const r = await p.evaluate(({ id, tm }) => {
        const w = window;
        const it = w.S.items.find(x => x.id === id);
        if (!it) return { skip: true };
        const tmSave = w.ST.TM; w.ST.TM = tm ? { id, date: w.UI.fdate, ...tm } : null;
        const origNow = Date.now, fixedNow = origNow(); Date.now = () => fixedNow; /* แข็งเวลา: fmtClock อ่าน Date.now สองรอบ — ปล่อยไว้จะต่างกัน 1 วินาทีตอนข้ามเส้น */
        try {
        const html = w.focusBody(it);
        const a = document.createElement('div'); a.innerHTML = html; document.body.appendChild(a);
        const bEl = document.createElement('div'); document.body.appendChild(bEl);
        const root = w.EvarelReact.createRoot(bEl);
        w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(w.EvarelComponents.focus, { id })));
        const normStyle = (h) => h.replace(/style="([^"]*)"/g, (m, v) => 'style="' + v.split(';').map(x => x.trim()).filter(Boolean).map(x => x.replace(/:\s+/, ':')).sort().join(';') + '"');
        const A = normStyle(a.innerHTML), B = normStyle(bEl.innerHTML);
        a.remove(); bEl.remove(); root.unmount(); w.ST.TM = tmSave;
        return { skip: false, same: A === B, i: A === B ? -1 : A.split('').findIndex((c, i) => c !== B[i]), A: A.slice(0, 200), B: B.slice(0, 200) };
        } finally { Date.now = origNow; }
      }, { id: seeded, tm: st.tm });
      if (r.skip) { ok(`focus_equiv ${st.name}`, false, 'ไม่มี item ทดสอบ'); continue; }
      ok(`focus_equiv ${st.name}`, r.same, r.same ? '' : `diff@${r.i} A=${r.A} B=${r.B}`);
    }

    /* Focus วงจรจริง: เปิด → rerender ผ่าน refreshFocus → ปิดสะอาด */
    const c3 = await p.evaluate((id) => {
      const w = window; w.openFocus(id);
      return { root: !!w.EvarelMount?.roots?.focus, dial: !!document.getElementById('dial'), digits: !!document.getElementById('digits') };
    }, seeded);
    if (c3.skip) ok('วงจรเปิดโฟกัส', false, 'ไม่มี item');
    else {
      ok('วงจรเปิดโฟกัส (mountAt ที่ #page)', c3.root && c3.dial && c3.digits, JSON.stringify(c3));
      const c4 = await p.evaluate((id) => {
        const w = window;
        w.ST.TM = { id, date: w.UI.fdate, startedAt: Date.now() - 30000, acc: 0 };
        w.refreshFocus();
        const rootKept = !!w.EvarelMount?.roots?.focus;
        const digits = document.getElementById('digits')?.textContent || '';
        w.ST.TM = null;
        w.refreshFocus();
        return { rootKept, digits };
      }, seeded);
      ok('วงจร rerender ทุก tick (root เดิมไม่ recreate)', c4.rootKept && /^\d{2}:\d{2}/.test(c4.digits), JSON.stringify(c4));
      const c5 = await p.evaluate(() => { const n = window.LAYERS.length; for (let i = 0; i < n; i++) window.popLayer(); return { empty: window.LAYERS.length === 0, rootGone: !window.EvarelMount?.roots?.focus }; });
      ok('วงจรปิดโฟกัส (unmount สะอาด)', c5.empty && c5.rootGone, JSON.stringify(c5));
    }
    ok('ไม่มี pageerror ตลอดวงจร', errs.length === 0, errs.join('; ').slice(0, 200));
  }
} catch (e) { ok('ไม่มี exception', false, String(e).slice(0, 300)); }
await b.close();
console.log(`\nผล: ${pass} ผ่าน ${fail} ตก`);
if (fail) process.exit(1);

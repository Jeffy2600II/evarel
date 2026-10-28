/* เทียบเลเยอร์ sheet/dialog/confirm: ฉบับ string เดิม (09-ui__layers) กับฉบับ React จริง (shared/sheet/SheetPage.jsx, shared/dialog/DialogPage.jsx)
   เกณฑ์: DOM จริงเท่ากันทุกไบต์ (browser-serialized innerHTML) + วงจรจริงบนแอป (เปิด confirm กดยืนยัน fn ทำงาน ปิดได้)
   ครอบกรณี: sheet (back มี/ไม่มี, foot มี/ไม่มี, title อักขระพิเศษ), dialog wrapper, confirm ทุกโทน
   รัน: node tests/layers_equiv.test.mjs  (ต้องมีเซิร์ฟเวอร์ 8779 เสิร์ฟ app/web) */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('layerequiv');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html');
  for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.sheet && !!window.EvarelComponents?.confirmCard)) break; await p.waitForTimeout(200); }
  ok('React sheet/confirm โหลดแล้ว', await p.evaluate(() => !!(window.EvarelComponents?.sheet && window.EvarelComponents?.confirmCard)));
  const out = [];
  const run = async (name, kind, props) => {
    const r = await p.evaluate(({ name, kind, props }) => {
      const w = window;
      let classic, comp, cprops;
      if (kind === 'sheet') {
        const { title, back, foot, html } = props;
        classic = `<div class="ev-grab" data-drag></div><h2 data-drag>${back ? `<button class="ev-icon-btn" data-flat data-act="dback" aria-label="ย้อนกลับ">${w.icon('back')}</button>` : ''}<span id="sheetTitle" class="grow">${w.esc(title)}</span><button class="ev-icon-btn" data-flat data-act="close" aria-label="ปิด">${w.icon('x')}</button></h2><div class="ev-sheet-body" id="sheetBody">${html}</div>${foot ? `<div class="ev-sheet-foot">${foot}</div>` : ''}`;
        comp = w.EvarelComponents.sheet; cprops = props;
      } else if (kind === 'dialogCard') {
        classic = `<div class="ev-dialog-card">${props.html}</div>`;
        comp = w.EvarelComponents.dialogCard; cprops = props;
      } else {
        const { title, msg, keep, ok: okTxt, tone } = props;
        classic = `<div class="ev-dialog-card"><h3>${title}</h3><p class="ev-sub">${msg}</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="close">${keep || 'ยกเลิก'}</button><button class="${tone === 'primary' ? 'ev-btn-primary' : 'ev-btn-solid-danger'}" data-act="cf-ok">${okTxt}</button></div></div>`;
        comp = w.EvarelComponents.confirmCard; cprops = props;
      }
      const a = document.createElement('div'); a.innerHTML = classic; document.body.appendChild(a);
      const bEl = document.createElement('div'); document.body.appendChild(bEl);
      const root = w.EvarelReact.createRoot(bEl);
      w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(comp, cprops)));
      const A = a.innerHTML, B = bEl.innerHTML;
      a.remove(); bEl.remove(); root.unmount();
      return { name, same: A === B, A: A.slice(0, 300), B: B.slice(0, 300) };
    }, { name, kind, props });
    ok(r.name, r.same, r.same ? '' : `\n A=${r.A}\n B=${r.B}`);
    if (!r.same) out.push(r);
  };
  await run('sheet พื้นฐาน (ไม่มี back/foot)', 'sheet', { title: 'เพิ่มรายการ', back: false, foot: '', html: '<p class="ev-sub">เนื้อ sheet</p>' });
  await run('sheet มี back + foot', 'sheet', { title: 'แก้ไข', back: true, foot: '<button class="ev-btn-primary" data-act="save">บันทึก</button>', html: '<div>ฟอร์ม</div>' });
  await run('sheet title อักขระพิเศษ <b>&"ยักษ์"</b>', 'sheet', { title: '<b>&"ยักษ์"</b>', back: false, foot: '', html: '' });
  await run('dialog wrapper เนื้อ raw', 'dialogCard', { html: '<h3>พบข้อมูลเดิม</h3><p class="ev-sub">มี 3 รายการ</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="imp-skip">ไม่นำเข้า</button><button class="ev-btn-primary" data-act="imp-add">นำเข้าเพิ่ม</button></div>' });
  await run('confirm โทนปกติ (ลบ)', 'confirm', { title: 'ลบ “งาน” ?', msg: 'ประวัติจะหายไป', ok: 'ลบ' });
  await run('confirm โทน primary + keep กำหนดเอง', 'confirm', { title: 'ออกจากระบบ?', msg: 'กลับมาได้เสมอ', keep: 'อยู่ต่อ', ok: 'ออกจากระบบ', tone: 'primary' });
  /* วงจรจริงบนแอป: เปิด confirm ผ่านฟังก์ชันจริง กดยืนยันให้ fn ทำงาน แล้วปิด */
  const live1 = await p.evaluate(() => { window.__cfOk = 0; window.confirmDialog({ title: 'ทดสอบจริง?', msg: 'กดยืนยันดู', ok: 'ตกลง', fn: () => { window.__cfOk++ } }); return { open: document.getElementById('dialog').dataset.open, card: !!document.querySelector('#dialog .ev-dialog-card'), roots: Object.keys(window.EvarelMount.roots) }; });
  ok('แอปจริง: confirm เปิดเป็น React', live1.open === 'true' && live1.card === true && live1.roots.includes('confirmCard'), JSON.stringify(live1));
  await p.click('#dialog [data-act="cf-ok"]'); await p.waitForTimeout(300);
  const live2 = await p.evaluate(() => ({ cfOk: window.__cfOk, open: document.getElementById('dialog').dataset.open }));
  ok('แอปจริง: กดยืนยัน fn ทำงาน + dialog ปิด', live2.cfOk === 1 && live2.open === 'false', JSON.stringify(live2));
  /* วงจร sheet จริง: setSheet ผ่านฟังก์ชันจริง แล้วปิดด้วยปุ่มปิด */
  const live3 = await p.evaluate(() => { window.openSheet('เนื้อทดสอบ', '<p>body</p>', {}); return { open: document.getElementById('sheet').dataset.open, title: document.getElementById('sheetTitle').textContent, grab: !!document.querySelector('#sheet .ev-grab'), roots: Object.keys(window.EvarelMount.roots) }; });
  ok('แอปจริง: sheet เปิดเป็น React โครงครบ', live3.open === 'true' && live3.title === 'เนื้อทดสอบ' && live3.grab && live3.roots.includes('sheet'), JSON.stringify(live3));
  await p.click('#sheet [data-act="close"]'); await p.waitForTimeout(300);
  ok('แอปจริง: sheet ปิดได้', (await p.evaluate(() => document.getElementById('sheet').dataset.open)) === 'false');
  ok('ไม่มี pageerror ระหว่างทดสอบ', errs.length === 0, errs.join(' | ').slice(0, 200));
} finally { await b.close(); }
console.log(`เทียบ layers ${pass} ผ่าน | ${fail} ตก`);
process.exit(fail ? 1 : 0);

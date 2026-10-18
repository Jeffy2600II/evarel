/* เทียบเนื้อฟอร์มเพิ่ม/แก้ไข: ฉบับ string เดิม (14-ui__form: typeBody/formBody) กับฉบับ React จริง (react/form.jsx)
   เกณฑ์: DOM จริงเท่ากันทุกไบต์ (browser-serialized innerHTML) + วงจรจริงบนแอป (เปิดฟอร์ม เลือกประเภท พิมพ์ กดปุ่มในพาเนล ส่งฟอร์มได้จริง)
   ครอบกรณี: ขั้นเลือกประเภท, กิจวัตร 4 แบบติดตาม (ติ๊ก/นับเป้า/ระยะเวลา) ทำซ้ำวัน-สัปดาห์, ช่วงเวลามีสิ้นสุด, งาน+วิชา+ข้อผิดพลาด, กิจกรรมไม่ซ้ำ/รายสัปดาห์, คาบเรียน+วันเรียน, แจ้งเตือนล่วงหน้า+ตามเวลา, ชื่ออักขระพิเศษ
   รัน: node tests/form_equiv.test.mjs  (ต้องมีเซิร์ฟเวอร์ 8779 เสิร์ฟ app/web) */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('formequiv');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html');
  for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.formBody && !!window.EvarelComponents?.typeBody && !!window.EvarelComponents?.sheet)) break; await p.waitForTimeout(200); }
  ok('React form/typeBody/sheet โหลดแล้ว', await p.evaluate(() => !!(window.EvarelComponents?.formBody && window.EvarelComponents?.typeBody && window.EvarelComponents?.sheet)));

  const run = async (name, isType, mut) => {
    const r = await p.evaluate(({ isType, mut }) => {
      const w = window;
      const D = isType ? { ...w.newDraft('habit'), step: 'type' } : w.newDraft(mut.__type);
      if (mut.__from) { const it = { id: 1, type: mut.__type, title: '', subject: '', start: D.start, end: '', time: '', timeEnd: '', repeat: { unit: D.unit, every: D.every, days: [...D.days] }, track: D.track, target: D.target, unitName: '', rem: D.rem.map(x => ({ ...x })) }; Object.assign(D, w.draftFrom(it)); }
      delete mut.__type; delete mut.__from;
      Object.assign(D, mut);
      w.ST.D = D;
      const classic = isType ? w.typeBody() : `<form class="ev-form" id="addForm" novalidate>${w.formBody()}</form>`;
      const comp = isType ? w.EvarelComponents.typeBody : w.EvarelComponents.formBody;
      const a = document.createElement('div'); a.innerHTML = classic; document.body.appendChild(a);
      const bEl = document.createElement('div'); document.body.appendChild(bEl);
      const root = w.EvarelReact.createRoot(bEl);
      w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(comp, {})));
      const A = a.innerHTML, B = bEl.innerHTML;
      a.remove(); bEl.remove(); root.unmount();
      return { same: A === B, A: A.slice(0, 400), B: B.slice(0, 400) };
    }, { isType, mut: { ...mut } });
    ok(name, r.same, r.same ? '' : `\n A=${r.A}\n B=${r.B}`);
  };

  await run('ขั้นเลือกประเภท (typeBody)', true, {});
  await run('กิจวัตร ติ๊ก ค่าเริ่มต้น', false, { __type: 'habit' });
  await run('กิจวัตร นับเป้า + ทำซ้ำสัปดาห์ + พาเนลทำซ้ำเปิด', false, { __type: 'habit', track: 'count', target: 8, unitName: 'แก้ว', unit: 'week', every: 2, days: [1, 3], open: 'rep' });
  await run('กิจวัตร ระยะเวลา + มีวันสิ้นสุด + พาเนลช่วงเวลาเปิด', false, { __type: 'habit', track: 'timer', target: 30, unitName: 'นาที', endMode: 'date', end: '2026-11-01', open: 'range' });
  await run('กิจวัตร แจ้งเตือนล่วงหน้า+ตามเวลา + พาเนลแจ้งเตือนเปิด', false, { __type: 'habit', open: 'rem', rem: [{ k: 'before', m: 30 }, { k: 'at', t: '18:30' }] });
  await run('งาน + วิชา + ข้อผิดพลาดแสดง', false, { __type: 'task', subject: 'คณิต', err: 'กรุณาใส่ชื่อรายการ' });
  await run('กิจกรรม ไม่ซ้ำ (ไม่มีช่วงเวลา)', false, { __type: 'event', unit: 'none' });
  await run('กิจกรรม รายสัปดาห์ + เลือกวัน', false, { __type: 'event', unit: 'week', days: [0, 2], every: 1 });
  await run('คาบเรียน + วันที่เรียน + พาเนลภาคเรียนเปิด', false, { __type: 'class', days: [1, 2, 4], open: 'range' });
  await run('ชื่ออักขระพิเศษ <b>&"ยักษ์"</b>', false, { __type: 'habit', title: '<b>&"ยักษ์"</b>' });
  await run('แก้ไขรายการเดิม (draftFrom)', false, { __type: 'habit', __from: true });

  /* วงจรจริงบนแอป: เปิดฟอร์มผ่าน openForm จริง (React sheet+formBody) เลือกประเภท พิมพ์ กดพาเนล ส่งฟอร์ม */
  const l1 = await p.evaluate(() => { window.openForm(null); return { open: document.getElementById('sheet').dataset.open, types: !!document.querySelector('#sheetBody .ev-types'), roots: Object.keys(window.EvarelMount.roots) }; });
  ok('แอปจริง: ฟอร์มขั้นเลือกประเภท mount React', l1.open === 'true' && l1.types && l1.roots.includes('sheet'), JSON.stringify(l1));
  await p.click('#sheetBody .ev-type[data-id="task"]');
  await p.waitForTimeout(150);
  const l2 = await p.evaluate(() => ({ form: !!document.querySelector('#sheetBody form#addForm'), title: !!document.querySelector('#addForm [name=title]'), subject: !!document.querySelector('#addForm [name=subject]'), foot: !!document.querySelector('#sheet .ev-sheet-foot [type=submit]') }));
  ok('แอปจริง: เลือกงานแล้วฟอร์ม React ครบฟิลด์+ปุ่มส่ง', l2.form && l2.title && l2.subject && l2.foot, JSON.stringify(l2));
  const l3 = await p.evaluate(() => { document.querySelector('#addForm [data-act="dopen"][data-id="rem"]').click(); return { exp: document.querySelector('#addForm [data-act="dopen"][data-id="rem"]').getAttribute('aria-expanded'), panel: document.querySelector('#addForm .ev-panel[data-key="rem"]').dataset.open }; });
  ok('แอปจริง: กดแถวแจ้งเตือน พาเนลเปิด (dopen กับ DOM ของ React)', l3.exp === 'true' && l3.panel === 'true', JSON.stringify(l3));
  await p.fill('#addForm [name=title]', 'ทดสอบฟอร์ม React');
  await p.fill('#addForm [name=time]', '14:30'); /* งานค่าเริ่มต้นแจ้งเตือนตรงเวลา ต้องมีเวลาถึง validate ผ่าน (พฤติกรรมเดิม) */
  await p.click('#sheet .ev-sheet-foot [type=submit]');
  await p.waitForTimeout(250);
  const l4 = await p.evaluate(() => ({ sheet: document.getElementById('sheet').dataset.open, saved: (window.S?.items || []).some(x => x.title === 'ทดสอบฟอร์ม React'), type: (window.S?.items || []).find(x => x.title === 'ทดสอบฟอร์ม React')?.type }));
  ok('แอปจริง: ส่งฟอร์มบันทึกรายการจริงและปิด sheet', l4.sheet === 'false' && l4.saved && l4.type === 'task', JSON.stringify(l4));
  ok('ไม่มี pageerror ตลอดวงจร', errs.length === 0, errs.join(' | '));
  console.log(`ผล: ${pass} ผ่าน ${fail} ตก`);
  process.exit(fail ? 1 : 0);
} finally { await b.close(); }

// พิสูจน์ F6 ฟอร์ม: ทั้งสองชื่อ (typeBody, formBody) x ทั้งสองเส้นทาง (Pages สตริง, Components คอมโพเนนต์) จากกล่อง shared/form
// เรนเดอร์ HTML เท่า bundle เดิมทุกไบต์ ทุกสาขาของ props/ร่างฟอร์ม (ST.D) | ใช้ newDraft + Object.assign + ST.D เหมือน form_equiv
// ใช้: node tests/form_bundle_equiv.test.mjs <form.js เดิม>   (ไฟล์ใหม่อ่านจาก app/web/js/react/form.js)
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/form.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const CASES = {
  ขั้นเลือกประเภท: { __type: 'habit', __step: 'type' },
  กิจวัตร_ติ๊ก: { __type: 'habit' },
  กิจวัตร_นับเป้า_ซ้ำสัปดาห์: { __type: 'habit', track: 'count', target: 8, unitName: 'แก้ว', unit: 'week', every: 2, days: [1, 3], open: 'rep' },
  กิจวัตร_นับเป้า_ลดไม่ได้: { __type: 'habit', track: 'count', target: 1, unitName: 'หน้า', unit: 'day', every: 1, open: 'rep' },
  กิจวัตร_ระยะเวลา_สิ้นสุด: { __type: 'habit', track: 'timer', target: 30, unitName: 'นาที', endMode: 'date', end: '2026-11-01', open: 'range' },
  กิจวัตร_เตือนล่วงหน้า_ตามเวลา: { __type: 'habit', open: 'rem', rem: [{ k: 'before', m: 30 }, { k: 'at', t: '18:30' }] },
  กิจวัตร_เตือนแต่ไม่มีเวลา_ขึ้นการ์ดเตือน: { __type: 'habit', open: 'rem', time: '', rem: [{ k: 'before', m: 10 }] },
  กิจวัตร_มีเวลา_ปุ่มล้าง: { __type: 'habit', time: '07:30' },
  งาน_วิชา_ผิดพลาด: { __type: 'task', subject: 'คณิต', err: 'กรุณาใส่ชื่อรายการ' },
  งาน_มีเวลา: { __type: 'task', time: '09:15', title: 'ส่งการบ้าน' },
  กิจกรรม_ไม่ซ้ำ: { __type: 'event', unit: 'none' },
  กิจกรรม_รายสัปดาห์_มีช่วงเวลา: { __type: 'event', unit: 'week', days: [0, 2], every: 1, open: 'range' },
  กิจกรรม_เริ่มจบ: { __type: 'event', unit: 'none', time: '13:00', timeEnd: '14:30' },
  คาบเรียน: { __type: 'class', days: [1, 2, 4], open: 'range' },
  ชื่ออักขระพิเศษ: { __type: 'habit', title: '<b>&"ยักษ์"</b>' },
  แก้ไขรายการเดิม: { __type: 'habit', __from: true },
};
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('formprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate(({ code, cases }) => {
    const w = window, R = w.EvarelReact; delete w.EvarelPages.typeBody; delete w.EvarelPages.formBody; (0, eval)(code);
    const r = {};
    for (const [k, c0] of Object.entries(cases)) {
      const mut = { ...c0 }, type = mut.__type, step = mut.__step, from = mut.__from; delete mut.__type; delete mut.__step; delete mut.__from;
      const D = w.newDraft(type); if (step) D.step = step;
      if (from) { const it = { id: 1, type, title: 'เดิม', subject: '', start: D.start, end: '', time: '08:00', timeEnd: '', repeat: { unit: D.unit, every: D.every, days: [...D.days] }, track: D.track, target: D.target, unitName: '', rem: [], log: {}, skip: {} }; Object.assign(D, w.draftFrom ? w.draftFrom(it) : {}); }
      Object.assign(D, mut); w.ST.D = D;
      for (const name of ['typeBody', 'formBody']) {
        try { r['สตริง ' + name + ' ' + k] = w.EvarelPages[name](); } catch (e) { r['สตริง ' + name + ' ' + k] = 'ERR:' + e.message; }
        try { r['คอมโพเนนต์ ' + name + ' ' + k] = R.renderToStaticMarkup(R.h(w.EvarelComponents[name], {})); } catch (e) { r['คอมโพเนนต์ ' + name + ' ' + k] = 'ERR:' + e.message; }
      }
    }
    return r;
  }, { code: bundle, cases: CASES });
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = [];
for (const k of Object.keys(a.out)) { const same = a.out[k] === c.out[k] && !String(a.out[k]).startsWith('ERR'); same ? ok++ : bad.push(k + ' | เดิม ' + String(a.out[k]).slice(0, 50) + ' | ใหม่ ' + String(c.out[k]).slice(0, 50)); }
console.log('เทียบ', Object.keys(a.out).length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.length ? bad.slice(0, 6) : '');
const S = (k) => c.out[k] || '';
const hit = (re, keys) => keys.filter(k => re.test(S(k))).length;
const fk = Object.keys(c.out).filter(k => k.startsWith('สตริง formBody'));
const g = { 'การ์ดเตือน(ปิดแจ้งเตือน)': hit(/data-act="rem-off"/, fk), 'ปุ่มลดปิด(disabled)': hit(/aria-label="ลด" disabled/, fk), 'แท็กเตือนตามเวลา': hit(/ev-rem-tag/, fk), 'ปุ่มล้างเวลา': hit(/data-tclear/, fk), 'สวิตช์สิ้นสุดเปิด': hit(/aria-checked="true"/, fk), 'ข้อผิดพลาด': hit(/ev-form-err/, fk), 'ขั้นเลือกประเภท': hit(/ev-types/, Object.keys(c.out).filter(k => k.startsWith('สตริง typeBody'))) };
console.log('สาขาถูกเรนเดอร์จริง:', JSON.stringify(g));
for (const [n, v] of Object.entries(g)) if (v < 1) bad.push('สาขาไม่ถูกทดสอบ: ' + n);
console.log('ความยาว HTML ต่ำสุด/สูงสุด:', Math.min(...Object.values(c.out).map(x => x.length)), '/', Math.max(...Object.values(c.out).map(x => x.length)), '| pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

// พิสูจน์ F6 หน้าวันนี้: Pages.today และ Components.today (ผลบิลด์ใหม่จากกล่อง shared/today) เรนเดอร์ HTML เท่า bundle เดิมทุกไบต์ ทุกสาขา
// ใช้: node tests/today_bundle_equiv.test.mjs <today.js เดิม>   (ไฟล์ใหม่อ่านจาก app/web/js/react/today.js)
// สาขาที่ครอบ: ไม่มีรายการ | ไม่มีสิ่งต้องติ๊ก | ยังไม่ครบ | ครบทุกอย่าง | มีค้าง (overdue) | มีถัดไป (next) | ย้อนดู (ds ไม่ใช่วันนี้) | หลายกลุ่มเวลา
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/today.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('todayprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate(({ code, seed }) => {
    delete window.EvarelPages.today; (0, eval)(code);
    const today = window.TODAY, ui0 = Object.assign({}, window.UI || {});
    const clone = (a) => a.map(x => JSON.parse(JSON.stringify(x)));
    const at = (h, m) => { const n = new Date(today + 'T00:00:00'); n.setHours(h, m, 0, 0); return n; };
    const mk = (over) => ({ ...ui0, date: today, weekOff: 0, weekDir: 0, ...over });
    const noTrack = seed.filter(x => x.track === 'none' || x.type === 'event').slice(0, 1);
    const C = {
      ไม่มีรายการ: { items: [], ui: mk({}), today, now: at(9, 0) },
      ไม่มีสิ่งต้องติ๊ก: { items: noTrack.length ? clone(noTrack) : clone(seed.slice(0, 1)), ui: mk({}), today, now: at(9, 0) },
      ยังไม่ครบ_เช้า: { items: clone(seed), ui: mk({}), today, now: at(6, 0) },
      ยังไม่ครบ_เย็น_มีถัดไป: { items: clone(seed), ui: mk({}), today, now: at(17, 0) },
      ดึกแล้ว_ไม่มีถัดไป: { items: clone(seed), ui: mk({}), today, now: at(23, 50) },
      ย้อนดู: { items: clone(seed), ui: mk({ date: '2026-10-08' }), today, now: at(9, 0) },
      สัปดาห์ถัดไป: { items: clone(seed), ui: mk({ weekOff: 1, date: '2026-10-20' }), today, now: at(9, 0) },
    };
    const r = {};
    for (const [k, v] of Object.entries(C)) {
      try { r['สตริง ' + k] = window.EvarelPages.today(v); } catch (e) { r['สตริง ' + k] = 'ERR:' + e.message; }
      try {
        const R = window.EvarelReact, host = document.createElement('div');
        r['คอมโพเนนต์ ' + k] = R.renderToStaticMarkup(R.h(window.EvarelComponents.today, v));
      } catch (e) { r['คอมโพเนนต์ ' + k] = 'ERR:' + e.message; }
    }
    return r;
  }, { code: bundle, seed: SEED_ITEMS });
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
let ok = 0; const bad = [];
for (const k of Object.keys(a.out)) { const same = a.out[k] === c.out[k] && !String(a.out[k]).startsWith('ERR'); same ? ok++ : bad.push(k + ' | เดิม ' + String(a.out[k]).slice(0, 60) + ' | ใหม่ ' + String(c.out[k]).slice(0, 60)); }
console.log('เทียบ', Object.keys(a.out).length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.length ? bad : '');
const S = (k) => c.out[k] || '';
console.log('สาขาถูกเรนเดอร์จริง: มีค้าง', /ค้างอยู่ \d+ งาน/.test(S('สตริง ยังไม่ครบ_เย็น_มีถัดไป')) || /ค้างอยู่ \d+ งาน/.test(S('สตริง ยังไม่ครบ_เช้า')), '| มีถัดไป', /ev-next/.test(S('สตริง ยังไม่ครบ_เย็น_มีถัดไป')), '| ไม่มีถัดไปตอนดึก', !/ev-next/.test(S('สตริง ดึกแล้ว_ไม่มีถัดไป')), '| ว่าง', /วันนี้ยังว่างอยู่/.test(S('สตริง ไม่มีรายการ')), '| ย้อนดูไม่มีค้าง', !/ค้างอยู่/.test(S('สตริง ย้อนดู')));
console.log('ความยาว HTML (ยังไม่ครบ เช้า):', S('สตริง ยังไม่ครบ_เช้า').length, '| pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length ? 1 : 0);

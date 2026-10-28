// พิสูจน์ F6 sheet: setSheet ซ้ำ (rerender ทับ root เดิม) ต้องคงโหนด DOM เดิมของ grab/h2/body (React reconcile) เท่าไฟล์ sheet.js เดิม
// เหตุผล: v24 ให้อนิเมชั่น .ev-in เล่นเฉพาะของใหม่ ถ้าโครงเปลี่ยนจน remount โหนดเดิมจะถูกสร้างใหม่ อนิเมชั่นเพี้ยนทั้งที่ HTML ตรง
// ใช้: node tests/prove_sheet_rerender.mjs <sheet.js เดิม>   (ใช้ sheet.js ใหม่จาก EVAREL_WEB_DIR/js/react/sheet.js) | ออก 0 = ตรงเดิม, 1 = ต่าง
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8');
const NEW = fs.readFileSync((process.env.EVAREL_WEB_DIR || 'app/web') + '/js/react/sheet.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const SEL = { grab: '.ev-grab', h2: 'h2', title: '#sheetTitle', body: '#sheetBody', foot: '.ev-sheet-foot' };
async function probe(code) {
  const ctx = await openAsUser(b, await makeTestUser('shrr'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const r = await p.evaluate(async ({ code, SEL }) => {
    const W = window; delete W.EvarelPages.sheet; delete W.EvarelComponents.sheet; (0, eval)(code);
    W.openSheet('หัวแรก', '<p id="m1">เนื้อแรก</p>', { back: true, foot: '<i>ท้าย</i>' });
    await new Promise(r => setTimeout(r, 400));
    const sh = document.getElementById('sheet'); const q = s => sh.querySelector(s);
    const keep = {}; for (const k of Object.keys(SEL)) keep[k] = q(SEL[k]);
    W.setSheet('หัวสอง', '<p id="m2">เนื้อสอง</p>', { back: true, foot: '<i>ท้ายสอง</i>' });
    await new Promise(r => setTimeout(r, 400));
    const same = {}; for (const k of Object.keys(SEL)) same[k] = keep[k] === q(SEL[k]);
    return { same, title: q('#sheetTitle')?.textContent, html: sh.innerHTML };
  }, { code, SEL });
  await ctx.close(); return { r, errs };
}
const a = await probe(OLD), c = await probe(NEW);
const sameKeys = JSON.stringify(a.r.same) === JSON.stringify(c.r.same), htmlEq = a.r.html === c.r.html;
console.log('คงโหนดเดิม (เดิม):', JSON.stringify(a.r.same));
console.log('คงโหนดเดิม (ใหม่):', JSON.stringify(c.r.same));
console.log('รูปแบบการคงโหนดเท่าเดิม', sameKeys, '| HTML หลัง rerender ตรงทุกไบต์', htmlEq, '| หัวใหม่', c.r.title, '| pageerror', a.errs.length, c.errs.length);
await b.close(); process.exit(sameKeys && htmlEq && !a.errs.length && !c.errs.length && c.r.title === 'หัวสอง' ? 0 : 1);

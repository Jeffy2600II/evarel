// พิสูจน์ F3.3-g16: fmtClock / val ของ core/ ให้ผลเท่าสำเนาชั้น m ทุกทาง (หน้าโฟกัสจะอ่านจาก core แทน window)
// เทียบบนหน้าจริงกับ window.fmtClock / window.val | ครอบอินพุตขอบ: 0 เศษวินาที ข้ามชั่วโมง ค่ามาก ติดลบ NaN undefined, log ว่าง/ไม่มีคีย์/ค่า 0
import { build } from 'esbuild'; import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const bundle = async (entry, name) => (await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', globalName: name, platform: 'browser', logLevel: 'silent' })).outputFiles[0].text;
const DAT = await bundle('app/src/core/dates.ts', 'CoreDates'), SCH = await bundle('app/src/core/schedule.ts', 'CoreSchedule');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const ctx = await openAsUser(b, await makeTestUser('focuscore'), { colorScheme: 'light' }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate(({ dat, sch }) => {
  (0, eval)(dat); (0, eval)(sch);
  const D = window.CoreDates, S = window.CoreSchedule, W = window, bad = [], n = { ok: 0 };
  const same = (name, a, m) => { (JSON.stringify(a) === JSON.stringify(m)) ? n.ok++ : bad.push(`${name} core=${JSON.stringify(a)} m=${JSON.stringify(m)}`); };
  const run = (fn) => { try { return fn(); } catch (e) { return 'ERR:' + e.message.slice(0, 40); } };
  // fmtClock: 0, เศษวินาที, ขอบนาที/ชั่วโมง, ค่ามาก (เกิน 24 ชม.), ติดลบ, NaN, undefined, null, สตริง
  for (const ms of [0, 1, 999, 1000, 1500, 59999, 60000, 61000, 3599999, 3600000, 3661000, 86399000, 86400000, 90000000, 360000000, -1, -1000, -61000, NaN, undefined, null, '5000', Infinity]) same('fmtClock(' + String(ms) + ')', run(() => D.fmtClock(ms)), run(() => W.fmtClock(ms)));
  // val: มีคีย์, ไม่มีคีย์, ค่า 0, ค่าติดลบ, ค่าทศนิยม, log ว่าง, ค่า null ในคีย์
  const its = [{ log: { '2026-10-28': 25, '2026-10-27': 0, '2026-10-26': -3, '2026-10-25': 1.5, '2026-10-24': null } }, { log: {} }];
  for (const it of its) for (const ds of ['2026-10-28', '2026-10-27', '2026-10-26', '2026-10-25', '2026-10-24', '2026-01-01', '', undefined]) same('val(' + JSON.stringify(it.log).slice(0, 20) + ',' + String(ds) + ')', run(() => S.val(it, ds)), run(() => W.val(it, ds)));
  return { ok: n.ok, bad, cases: n.ok + bad.length };
}, { dat: DAT, sch: SCH });
console.log('เทียบ', r.cases, 'กรณี | ตรงกัน', r.ok, '| ต่าง', r.bad.length, r.bad.slice(0, 6));
console.log('pageerror:', errs.length, errs);
await b.close(); process.exit(r.bad.length || errs.length ? 1 : 0);

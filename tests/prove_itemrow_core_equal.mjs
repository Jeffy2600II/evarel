// พิสูจน์ F3.3-g9: ฟังก์ชันที่แถวรายการใช้ (val target tracked isDone skipped isFuture esc fmtDate timeText) ของ core ให้ผลเท่าสำเนาชั้น m
// isFuture ของ core ต้องส่ง today เอง (ลายเซ็นต่างจากชั้น m ที่อ่าน TODAY ในโมดูล): ทดสอบแบบส่ง window.TODAY เทียบ และแบบไม่ส่ง (ต้องต่าง = พิสูจน์ว่าความเสี่ยงมีจริง)
import { build } from 'esbuild'; import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const bundle = async (e, g) => (await build({ entryPoints: [e], bundle: true, write: false, format: 'iife', globalName: g, platform: 'browser', logLevel: 'silent' })).outputFiles[0].text;
const SCH = await bundle('app/src/core/schedule.ts', 'CoreSchedule'), DAT = await bundle('app/src/core/dates.ts', 'CoreDates');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const ctx = await openAsUser(b, await makeTestUser('itemrow'), { colorScheme: 'light' }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate(({ sch, dat }) => {
  (0, eval)(dat); (0, eval)(sch);
  const C = Object.assign({}, window.CoreSchedule, window.CoreDates), W = window, bad = [], n = { ok: 0 };
  const t = (name, cond) => (cond ? n.ok++ : bad.push(name));
  const day = k => W.ymd(W.addDays(new Date(), k));
  const base = { id: 1, type: 'habit', title: 't', subject: '', start: day(-9), end: '', time: '', timeEnd: '', rem: [], track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, log: {}, skip: {} };
  const mk = o => Object.assign(JSON.parse(JSON.stringify(base)), o);
  const items = [
    mk({}), mk({ track: 'none' }), mk({ track: 'count', target: 5, log: { [day(0)]: 5, [day(-1)]: 2 } }), mk({ track: 'timer', target: 30, log: { [day(0)]: 31 } }),
    mk({ time: '09:30', timeEnd: '10:45' }), mk({ time: '07:05' }), mk({ skip: { [day(-2)]: true } }),
  ];
  const days = [-400, -2, -1, 0, 1, 2, 30].map(day);
  for (const [i, it] of items.entries()) {
    t(`target #${i}`, C.target(it) === W.target(it)); t(`tracked #${i}`, C.tracked(it) === W.tracked(it)); t(`timeText #${i}`, C.timeText(it) === W.timeText(it));
    for (const ds of days) { t(`val #${i} ${ds}`, C.val(it, ds) === W.val(it, ds)); t(`isDone #${i} ${ds}`, C.isDone(it, ds) === W.isDone(it, ds)); t(`skipped #${i} ${ds}`, C.skipped(it, ds) === W.skipped(it, ds)); }
  }
  for (const ds of days) { t(`isFuture(ds, TODAY) ${ds}`, C.isFuture(ds, W.TODAY) === W.isFuture(ds)); t(`fmtDate ${ds}`, C.fmtDate(ds) === W.fmtDate(ds)); }
  for (const s of ['', null, undefined, 'a<b>&"\'c', 'ปกติ', '<script>x</script>', 5, 0]) t(`esc ${JSON.stringify(s)}`, C.esc(s) === W.esc(s));
  // ความเสี่ยงที่ต้องมีจริง: เรียก isFuture ของ core แบบเดิม (ไม่ส่ง today) แล้วให้ false ทุกวัน ต่างจากชั้น m ที่ true สำหรับวันอนาคต
  const risk = days.filter(ds => C.isFuture(ds) !== W.isFuture(ds)).length;
  return { ok: n.ok, bad, cases: n.ok + bad.length, riskDaysDiffer: risk };
}, { sch: SCH, dat: DAT });
console.log('เทียบ', r.cases, 'กรณี | ตรงกัน', r.ok, '| ต่าง', r.bad.length, r.bad.slice(0, 6));
console.log('ความเสี่ยงยืนยัน: เรียก core.isFuture(ds) โดยไม่ส่ง today แล้วผลต่างจากชั้น m', r.riskDaysDiffer, 'วัน (ต้อง > 0)');
console.log('pageerror:', errs.length, errs);
await b.close(); process.exit(r.bad.length || errs.length || !r.riskDaysDiffer ? 1 : 0);

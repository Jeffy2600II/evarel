// พิสูจน์ F3.3-g7: ฟังก์ชันตารางเวลาของ core/schedule+stats ให้ผลเท่าสำเนาชั้น m (ที่ window ให้) ทุกกรณีที่หน้ารายละเอียดใช้
import { build } from 'esbuild'; import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const bundle = async (e, g) => (await build({ entryPoints: [e], bundle: true, write: false, format: 'iife', globalName: g, platform: 'browser', logLevel: 'silent' })).outputFiles[0].text;
const SCH = await bundle('app/src/core/schedule.ts', 'CoreSchedule'), STA = await bundle('app/src/core/stats.ts', 'CoreStats'), DAT = await bundle('app/src/core/dates.ts', 'CoreDates');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const ctx = await openAsUser(b, await makeTestUser('schedeq'), { colorScheme: 'light' }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate(({ sch, sta, dat }) => {
  (0, eval)(dat); (0, eval)(sch); (0, eval)(sta);
  const C = Object.assign({}, window.CoreSchedule, window.CoreStats), W = window, bad = [], n = { ok: 0 };
  const t = (name, cond) => (cond ? n.ok++ : bad.push(name));
  const ymd = d => W.ymd(d), add = (d, k) => W.addDays(d, k), now = new Date();
  const day = k => ymd(add(now, k));
  const base = { id: 1, type: 'habit', title: 't', subject: '', end: '', time: '', timeEnd: '', rem: [], track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, log: {}, skip: {} };
  const mk = o => Object.assign(JSON.parse(JSON.stringify(base)), o);
  const log = (...ks) => Object.fromEntries(ks.map(k => [day(k), 1]));
  const items = {
    รายวันมีสตรีค: mk({ start: day(-20), log: log(0, -1, -2, -3) }),
    รายวันสตรีคขาด: mk({ start: day(-20), log: log(-1, -2, -5) }),
    รายวันข้ามวัน: mk({ start: day(-20), log: log(-1, -3), skip: { [day(-2)]: true } }),
    ทุก2วัน: mk({ start: day(-10), repeat: { unit: 'day', every: 2, days: [] }, log: log(0, -2, -4) }),
    รายสัปดาห์: mk({ start: day(-30), repeat: { unit: 'week', every: 1, days: [1, 3, 5] }, log: log(-1, -3) }),
    ทุก2สัปดาห์: mk({ start: day(-30), repeat: { unit: 'week', every: 2, days: [0, 6] }, log: log(-2) }),
    รายเดือน: mk({ start: day(-70), repeat: { unit: 'month', every: 1, days: [] }, log: {} }),
    ครั้งเดียว: mk({ type: 'task', start: day(-3), repeat: { unit: 'none', every: 1, days: [] }, log: {} }),
    ครั้งเดียวเสร็จ: mk({ type: 'task', start: day(-3), repeat: { unit: 'none', every: 1, days: [] }, log: log(-3) }),
    มีวันสิ้นสุด: mk({ start: day(-10), end: day(-5), log: log(-6, -7) }),
    นับเป้า: mk({ track: 'count', target: 5, unitName: 'หน้า', start: day(-9), log: { [day(0)]: 5, [day(-1)]: 3, [day(-2)]: 5 } }),
    จับเวลา: mk({ track: 'timer', target: 30, start: day(-9), log: { [day(0)]: 30, [day(-1)]: 10 } }),
    ไม่ติดตาม: mk({ track: 'none', start: day(-9), log: {} }),
    มีเวลาและเตือน: mk({ type: 'event', time: '09:30', timeEnd: '10:45', rem: [{ k: 'before', m: 0 }, { k: 'before', m: 10 }, { k: 'before', m: 60 }, { k: 'before', m: 1440 }, { k: 'before', m: 2880 }, { k: 'at', t: '08:00' }], start: day(-2), repeat: { unit: 'none', every: 1, days: [] } }),
    มีเวลาไม่มีจบ: mk({ time: '07:05', start: day(-4), rem: [{ k: 'before', m: 90 }] }),
    ไม่มีเวลา: mk({ time: '', start: day(-4) }),
  };
  const days = [-400, -60, -31, -8, -3, -2, -1, 0, 1, 2, 7, 30, 90].map(day);
  for (const [name, it] of Object.entries(items)) {
    for (const ds of days) {
      for (const f of ['occursOn', 'isDone', 'skipped', 'scheduled']) t(`${f} ${name} ${ds}`, C[f](it, ds) === W[f](it, ds));
    }
    for (const f of ['streak', 'repeatText', 'timeText', 'totalDone', 'val', 'target', 'tracked']) t(`${f} ${name}`, JSON.stringify(C[f](it)) === JSON.stringify(W[f](it)));
    for (const rm of it.rem) t(`remText ${name} ${JSON.stringify(rm)}`, C.remText(rm) === W.remText(rm));
  }
  return { ok: n.ok, bad, cases: n.ok + bad.length };
}, { sch: SCH, sta: STA, dat: DAT });
console.log('เทียบ', r.cases, 'กรณี | ตรงกัน', r.ok, '| ต่าง', r.bad.length, r.bad.slice(0, 8));
console.log('pageerror:', errs.length, errs);
await b.close(); process.exit(r.bad.length || errs.length ? 1 : 0);

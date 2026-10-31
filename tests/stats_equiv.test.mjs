// พิสูจน์ F6 (07-services__stats): โมดูลใหม่ (ตรรกะบริสุทธิ์มาจาก core/stats) ให้ผลเหมือนโมดูลเดิมทุกชื่อที่ส่งออก ทั้งสัปดาห์และเดือน
// ใช้: node tests/stats_equiv.test.mjs <07-services__stats.js เดิม>  (ใหม่อ่านจาก app/web/js/app/07-services__stats.js)
import { chromium } from 'playwright'; import fs from 'fs';
import { constantsInlined } from './_constants_inline.mjs';
const R = p => fs.readFileSync(p, 'utf8');
const OLD = R(process.argv[2]), NEW = R('app/web/js/app/07-services__stats.js');
const SRC = { dates: R('app/web/js/app/02-core__dates.js'), cdates: R('app/web/js/app/core/dates.js'), cschedule: R('app/web/js/app/core/schedule.js'), cstats: R('app/web/js/app/core/stats.js'), schedule: R('app/web/js/app/06-services__schedule.js'), constants: constantsInlined('.') };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const r = await p.evaluate(async ({ OLD, NEW, SRC }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const NOW = new Date(2026, 9, 30, 7, 51, 9).getTime(), RD = Date;
  const clock = () => { globalThis.Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(NOW) } static now() { return NOW } } }, unclock = () => { globalThis.Date = RD };
  const I = (o) => ({ id: 1, type: 'habit', title: 't', subject: '', start: '2026-09-01', end: '', time: '', timeEnd: '', rem: [], track: 'check', target: 1, unitName: 'ครั้ง', repeat: { unit: 'day', every: 1, days: [] }, log: {}, skip: {}, ...o });
  const items = [
    I({ id: 1, repeat: { unit: 'day', every: 1, days: [] }, log: { '2026-10-30': 1, '2026-10-29': 1, '2026-10-28': 1, '2026-10-26': 1 } }),
    I({ id: 2, repeat: { unit: 'day', every: 3, days: [] }, track: 'count', target: 5, unitName: 'แก้ว', log: { '2026-10-30': 5, '2026-10-27': 2 }, time: '09:30', timeEnd: '10:15' }),
    I({ id: 3, repeat: { unit: 'week', every: 1, days: [1, 3, 5] }, time: '06:00', log: { '2026-10-30': 1, '2026-10-28': 1 }, skip: { '2026-10-26': true } }),
    I({ id: 4, repeat: { unit: 'week', every: 2, days: [0, 6] }, time: '13:00', track: 'timer', target: 1800, log: { '2026-10-25': 1800 } }),
    I({ id: 5, repeat: { unit: 'month', every: 1, days: [] }, start: '2026-01-31', time: '18:45' }),
    I({ id: 6, type: 'task', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-20', track: 'check', log: {} }),
    I({ id: 7, type: 'task', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-30', log: { '2026-10-30': 1 } }),
    I({ id: 12, type: 'task', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-30', log: {} }),
    I({ id: 13, type: 'task', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-29', log: { '2026-10-29': 1 } }),
    I({ id: 14, repeat: { unit: 'day', every: 1, days: [] }, time: '23:00', start: '2026-10-01', log: {} }),
    I({ id: 15, repeat: { unit: 'day', every: 1, days: [] }, time: '05:00', start: '2026-10-01', log: {} }),
    I({ id: 16, repeat: { unit: 'day', every: 1, days: [] }, start: '2026-10-01', log: { '2026-10-30': 1, '2026-10-28': 1, '2026-10-27': 1 }, skip: { '2026-10-29': true } }),
    I({ id: 17, repeat: { unit: 'day', every: 1, days: [] }, track: 'count', target: 5, unitName: 'แก้ว', start: '2026-10-01', log: { '2026-10-30': 2, '2026-10-29': 5, '2026-10-28': 1 } }),
    I({ id: 18, repeat: { unit: 'day', every: 1, days: [] }, start: '2026-10-01', log: { '2026-10-30': 0, '2026-10-29': 1 } }),
    I({ id: 8, type: 'event', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-11-02', track: 'none', time: '23:10' }),
    I({ id: 9, type: 'class', repeat: { unit: 'week', every: 1, days: [2, 4] }, start: '2026-08-01', end: '2026-10-15', time: '11:59', track: 'none' }),
    I({ id: 10, repeat: { unit: 'day', every: 1, days: [] }, start: '2024-02-29', log: { '2026-10-30': 1 } }),
    I({ id: 11, repeat: { unit: 'month', every: 2, days: [] }, start: '2026-02-28', time: '00:00' }),
  ];
  const out = {};
  for (const [name, srcCode] of [['old', OLD], ['new', NEW]]) {
    clock();
    const U = { dates: mk(SRC.dates), cdates: mk(SRC.cdates), constants: mk(SRC.constants) };
    const datesCode = SRC.dates.replace(/\.\/core\/dates\.js/g, U.cdates).replace(/\.\/01-core__constants\.js/g, U.constants);
    const datesU = mk(datesCode + '\n//' + name + Math.random());
    const S = { items: items.map(x => JSON.parse(JSON.stringify(x))) }, UI = { period: 'week' };
    globalThis.__S = S; globalThis.__UI = UI;
    const authU = mk('export const S = globalThis.__S; export const UI = globalThis.__UI;');
    const cs = mk(SRC.cschedule.replace(/\.\/dates\.js/g, U.cdates));
    const schedCode = SRC.schedule.replace(/\.\/core\/schedule\.js/g, cs).replace(/\.\/02-core__dates\.js/g, datesU).replace(/\.\/05-data__auth\.js/g, authU).replace(/\.\/01-core__constants\.js/g, U.constants).replace(/\.\/core\/dates\.js/g, U.cdates);
    const schedU = mk(schedCode + '\n//' + name + Math.random());
    const cst = mk(SRC.cstats.replace(/\.\/dates\.js/g, U.cdates).replace(/\.\/schedule\.js/g, cs));
    const code = srcCode.replace(/\.\/core\/stats\.js/g, cst).replace(/\.\/02-core__dates\.js/g, datesU).replace(/\.\/05-data__auth\.js/g, authU).replace(/\.\/06-services__schedule\.js/g, schedU).replace(/\.\/01-core__constants\.js/g, U.constants);
    const m = await import(mk(code + '\n//' + name + Math.random()));
    const names = ['habits','typeIcon','periodStats','ARC_C','chartData','totalDone'];
    const res = { exports: Object.keys(m).sort(), winTypes: names.map(k => typeof window[k]), winSame: names.every(k => window[k] === m[k]) };
    res.habits = m.habits().map(x => x.id);
    res.typeIcon = items.map(m.typeIcon);
    res.periodStats = items.map(it => [1, 7, 14, 30, 90].map(n => JSON.stringify(m.periodStats(it, n))).join('|'));
    res.ARC_C = m.ARC_C;
    res.totalDone = items.map(m.totalDone);
    for (const per of ['week', 'month']) { UI.period = per; res['chartData_' + per] = JSON.stringify(m.chartData()); }
    UI.period = 'week';
    S.items = []; res.habitsEmpty = m.habits().length; res.chartEmpty = JSON.stringify(m.chartData());
    unclock(); out[name] = res;
  }
  return out;
}, { OLD, NEW, SRC });
let diff = 0; const keys = Object.keys(r.old);
for (const k of keys) { const a = JSON.stringify(r.old[k]), c = JSON.stringify(r.new[k]); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', k, '| เริ่มต่างที่ตำแหน่ง', i, '\n  เดิม: …' + a.slice(Math.max(0, i - 25), i + 50) + '\n  ใหม่: …' + c.slice(Math.max(0, i - 25), i + 50)); } }
const distinct = new Set([...r.new.chartData_week.match(/"pct":\d+/g), ...r.new.chartData_month.match(/"pct":\d+/g)]).size;
console.log(`เทียบ ${keys.length} หมวด | ตรง ${keys.length - diff} | ต่าง ${diff} | pct ต่างกัน ${distinct} ค่า | exports ${r.new.exports.length} ชื่อ | window ตรง export: ${r.new.winSame} | pageerror ${errs.length}`);
await b.close();
process.exit(diff || errs.length || !r.new.winSame || distinct < 4 ? 1 : 0);

// พิสูจน์ F6 (20-services__calendar -> core/calendar): addMin/occurrenceEvents/dotsFor ให้ผลเหมือนของเดิมทุกกรณี และ occurrenceEvents/dotsFor อ่าน S.items สดทุกครั้ง (ไม่แคชตอนโหลด)
// ใช้: node tests/calendar_logic_equiv.test.mjs <20-services__calendar.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/20-services__calendar.js', 'utf8');
const rd = f => fs.readFileSync('app/web/js/m/core/' + f, 'utf8'); const CAL = rd('calendar.js'), SCH = rd('schedule.js'), DAT = rd('dates.js');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const NAMES = ['FCS', 'destroyCal', 'addMin', 'occurrenceEvents', 'dotsFor', 'mountCal', 'mountMain', 'selectDay', 'mountHabit', 'calDayTap', 'detailHabit', 'detailTask', 'detailSchedule', 'DETAIL_BY_TYPE', 'metaCard', 'detailHTML', 'openDetail'];
const r = await p.evaluate(async ({ OLD, NEW, CAL, SCH, DAT, NAMES }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const datU = mk(DAT), schU = mk(SCH.replace(/\.\/dates\.js/g, datU)); const SCHM = await import(schU); const calU = mk(CAL.replace(/\.\/dates\.js/g, datU).replace(/\.\/schedule\.js/g, schU)); const out = {};
  const R = (unit, every, days) => ({ unit, every: every || 1, days: days || [] });
  const I = (id, type, o) => ({ id, type, title: 'รายการ' + id, start: '2026-10-01', repeat: R('none'), skip: {}, log: {}, rem: [], track: type === 'schedule' ? 'none' : 'check', ...o });
  const mkItems = () => [
    I(1, 'habit', { time: '07:00', repeat: R('day') }), I(2, 'habit', { repeat: R('day') }), I(3, 'task', { start: '2026-10-30', time: '16:00' }), I(4, 'task', { start: '2026-10-30' }),
    I(5, 'schedule', { time: '09:00', timeEnd: '10:30', repeat: R('week', 1, [1, 3, 5]) }), I(6, 'schedule', { time: '23:50' }), I(7, 'habit', { time: '23:45', repeat: R('day'), skip: { '2026-10-30': 1 } }),
    I(8, 'task', { start: '2026-10-30', time: '12:00', log: { '2026-10-30': 1 } }), I(9, 'habit', { time: '06:30', repeat: R('day'), end: '2026-10-29' }), I(10, 'schedule', { start: '2026-10-31', time: '08:00', repeat: R('day', 2) }),
    I(13, 'schedule', { start: '2026-10-30', time: '14:00', track: 'none', log: { '2026-10-30': 5 } }), I(14, 'task', { start: '2026-10-27', time: '13:00', skip: { '2026-10-27': 1 } }), I(11, 'task', { start: '2026-10-28', time: '10:00', timeEnd: '11:15' }), I(12, 'habit', { time: '00:00', repeat: R('day'), log: { '2026-10-30': 99 } }),
  ];
  const ranges = { week: ['2026-10-26', '2026-11-02'], day: ['2026-10-30', '2026-10-31'], empty: ['2026-10-30', '2026-10-30'], reversed: ['2026-11-02', '2026-10-26'], monthEnd: ['2026-10-29', '2026-11-03'], long: ['2026-10-01', '2026-12-01'], single0: ['2026-10-30T00:00:00', '2026-10-30T00:00:01'], leap: ['2028-02-27', '2028-03-02'] };
  const addCases = [['00:00', 0], ['00:00', 30], ['07:00', 30], ['09:00', 60], ['23:59', 1], ['23:30', 60], ['23:00', 120], ['12:34', 56], ['00:00', 1439], ['00:00', 1440], ['10:05', -5], ['10:00', -60], ['01:00', -120], ['5:7', 3], ['abc', 5], ['12:xx', 5], ['', 5], ['08:30', 0.5], ['08:30', NaN]];
  const dsList = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-09-01', '2027-01-01'];
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    for (const k of NAMES) delete window[k];
    const realNow = Date.now; Date.now = () => Date.parse('2026-10-30T08:00:00Z');
    globalThis.S = { items: mkItems() }; globalThis.TODAY = '2026-10-30'; globalThis.pad = n => String(n).padStart(2, '0');
    globalThis.ymd = dd => `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}`; globalThis.addDays = (dd, n) => new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() + n);
    Object.assign(globalThis, { scheduled: SCHM.scheduled, skipped: SCHM.skipped, tracked: SCHM.tracked, isDone: SCHM.isDone });   // ทั้งสองฝั่งใช้ตัวช่วยจริงจาก core/schedule (ในแอปจริงคือ window.* ที่มาจากไฟล์นี้) ไม่ใช้ตัวปลอมที่ไม่ตรวจวันในสัปดาห์
    for (const k of ['icon', 'esc', 'TYPES', 'repeatText', 'timeText', 'remText', 'toast', 'render', 'openSheet', 'AI_LIVE']) globalThis[k] = k === 'TYPES' ? { habit: 'นิสัย', task: 'งาน', schedule: 'ตาราง' } : (() => '');
    try {
      const code = src.replace(/\.\/core\/calendar\.js/g, calU) + '\n//' + name + Math.random();
      const m = await import(mk(code)); const res = {};
      res.exports = Object.keys(m).sort(); res.winTypes = NAMES.map(k => typeof window[k]).join(',');
      res.add = addCases.map(([t, mm]) => { try { return window.addMin(t, mm) } catch (e) { return 'THROW:' + e.constructor.name } });
      res.occ = {}; for (const [k, [a, z]] of Object.entries(ranges)) { try { res.occ[k] = JSON.stringify(window.occurrenceEvents(new Date(a), new Date(z))) } catch (e) { res.occ[k] = 'THROW:' + e.constructor.name } }
      res.dots = dsList.map(ds => window.dotsFor(ds));
      S.items = S.items.slice(0, 3); res.occLive = JSON.stringify(window.occurrenceEvents(new Date('2026-10-30'), new Date('2026-10-31'))); res.dotsLive = window.dotsFor('2026-10-30');
      S.items = []; res.occEmpty = JSON.stringify(window.occurrenceEvents(new Date('2026-10-30'), new Date('2026-11-05'))); res.dotsEmpty = window.dotsFor('2026-10-30');
      S.items = Array.from({ length: 7 }, (_, i) => I(100 + i, ['habit', 'task', 'schedule', 'x', 'y', 'z', 'w'][i], { start: '2026-10-30' })); res.dotsMany = window.dotsFor('2026-10-30');
      S.items = mkItems(); const before = JSON.stringify(S.items); window.occurrenceEvents(new Date('2026-10-26'), new Date('2026-11-02')); window.dotsFor('2026-10-30'); res.pure = before === JSON.stringify(S.items);
      res.winSame = NAMES.filter(k => typeof window[k] === 'function' && m[k] !== undefined && window[k] !== m[k]);
      out[name] = res;
    } finally { Date.now = realNow }
  }
  return out;
}, { OLD, NEW, CAL, SCH, DAT, NAMES });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ที่', i, '| เดิม:', a.slice(Math.max(0, i - 25), i + 60), '| ใหม่:', c.slice(Math.max(0, i - 25), i + 60)); } };
cmp('exports', o.exports, n.exports); cmp('winTypes', o.winTypes, n.winTypes);
o.add.forEach((v, i) => cmp('add#' + i, v, n.add[i])); Object.keys(o.occ).forEach(k => cmp('occ:' + k, o.occ[k], n.occ[k])); o.dots.forEach((v, i) => cmp('dots#' + i, v, n.dots[i]));
for (const k of ['occLive', 'dotsLive', 'occEmpty', 'dotsEmpty', 'dotsMany', 'pure', 'winSame']) cmp(k, o[k], n[k]);
const dist = a => new Set(a).size;
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | ผลต่างกัน: add ${dist(n.add)} occ ${dist(Object.values(n.occ))} dots ${dist(n.dots)} | เหตุการณ์ช่วง week ${JSON.parse(n.occ.week).length} long ${JSON.parse(n.occ.long).length} | exports ${n.exports.length} | window ${n.winTypes.split(',').filter(t => t === 'function').length}/${n.winTypes.split(',').length} function | ชื่อต่างจากโมดูล ${JSON.stringify(n.winSame)} | pageerror ${errs.length}`);
await b.close();
process.exit(diff || errs.length || dist(n.add) < 10 || dist(Object.values(n.occ)) < 6 || dist(n.dots) < 4 || JSON.parse(n.occ.week).length < 20 || JSON.parse(n.occ.reversed).length !== 0 || n.occLive === n.occ.day || n.dotsMany.split('<i').length - 1 !== 4 || !n.pure || n.winSame.length || n.exports.length !== 0 || JSON.stringify(o.exports) !== JSON.stringify(n.exports) ? 1 : 0);

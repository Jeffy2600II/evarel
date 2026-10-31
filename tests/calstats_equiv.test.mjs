/* พิสูจน์ F6 (20-services__calendar ส่วนคำนวณที่เหลือ): สถิติเดือน (monthStatsOf) และครั้งถัดไป (nextOccurrencesOf) ที่ย้ายไป core/calendar
   เทียบผ่านหน้าตา HTML ของ detailHabit/detailTask/detailSchedule เดิมกับใหม่บนเบราว์เซอร์จริง (core/dates + core/schedule ของจริงบน window, ล็อกนาฬิกาให้ new Date() = 2026-10-31)
   ใช้: node tests/calstats_equiv.test.mjs <20-services__calendar.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/calstats_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/calendar_m20_selfcontained.js', 'utf8');
const NEWM = fs.readFileSync('app/web/js/app/20-services__calendar.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/app/core/calendar.js', 'utf8');
const CORE_DATES = fs.readFileSync('app/web/js/app/core/dates.js', 'utf8');
const CORE_SCHED = fs.readFileSync('app/web/js/app/core/schedule.js', 'utf8');
const CORE_STATS = fs.readFileSync('app/web/js/app/core/stats.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

/* ฉีดความผิดลงโค้ดจริง ทีละแบบ — เทสต์ต้องจับให้ได้ทุกแบบ */
function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/if \(ds <= today && scheduled\(it, ds\)/, 'if (ds < today && scheduled(it, ds)'); /* วันนี้ไม่ถูกนับ */
  if (which === 2) return R(/&& !skipped\(it, ds\)\)\s*\{\s*t\+\+/, ') { t++'); /* วันที่ข้ามถูกนับ */
  if (which === 3) return R(/if \(isDone\(it, ds\)\) ok\+\+;/, 'if (!isDone(it, ds)) ok++;'); /* นับกลับด้าน */
  if (which === 4) return R(/next\.length < maxCount/, 'next.length < maxCount + 1'); /* เก็บเกิน 5 ครั้ง */
  if (which === 5) return R(/addDays\((?:\/\* @__PURE__ \*\/ )?new Date\(today \+ ["']T00:00:00["']\), i\)/, 'addDays(new Date(today + "T00:00:00"), i + 1)'); /* กวาดเริ่มพรุ่งนี้ (วันนี้หายจากครั้งถัดไป) */
  if (which === 6) return R(/for \(let i = 0; i < maxDays && next\.length < maxCount/, 'for(let i = 0; i <= maxDays && next.length < maxCount'); /* กวาดยาวเกิน 1 วัน (ขอบ 90) */
  if (which === 7) return R(/Math\.round\(100 \* ok \/ t\)/, 'Math.floor(100 * ok / t)'); /* ปัดเปอร์เซ็นต์ผิด */
  return src;
}
const NEWMi = inj === 7 ? inject(NEWM, 7) : NEWM; /* 7 อยู่ที่ตัวห่อ (HTML builder) ที่เหลืออยู่ใน core */
const NEWCOREi = inj && inj !== 7 ? inject(NEWCORE, inj) : NEWCORE;

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');

/* ปัก core/dates + core/schedule ของจริงบน window (แทน global ที่เคยมาจาก m/02 m/06) + stub UI primitive ที่ไม่ใช่ตรรกะ */
const HARNESS = `
const FIXED = new Date('2026-10-31T10:00:00+07:00').getTime();
class F extends Date { constructor(...a) { a.length ? super(...a) : super(FIXED) } static now() { return FIXED } }
globalThis.Date = F;
window.TODAY = '2026-10-31';
window.UI = { cal: { y: 2026, m: 9 }, calSel: '2026-10-31' };
window.icon = ic => '[icon:' + ic + ']';
window.seg = (name, opts, sel) => '[seg:' + name + ':' + sel + ']';
window.empty = (ic, t, h) => '[empty:' + t + ']';
window.haptic = () => {};
window.LP = { fired: false };
window.commit = () => {};
window.openPop = () => {};
window.find = id => null;
window.S = { items: [] };
window.ST = { DETAIL: null };
window.EvarelMount = null;
`;
await p.evaluate(HARNESS);
const load = async (tag, mSrc, coreSrc) => {
  const err = await p.evaluate(async ({ mSrc, coreSrc, datesSrc, schedSrc, statsSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const datesU = mk(datesSrc), schedU = mk(schedSrc.replace(/\.\/dates\.js/g, datesU));
    const statsU = mk(statsSrc.replace(/\.\/dates\.js/g, datesU).replace(/\.\/schedule\.js/g, schedU));
    const D = await import(datesU), C = await import(schedU), S2 = await import(statsU);
    Object.assign(window, D, C, S2); /* ตรรกะวันที่/ตาราง/สถิติของจริงบน window เหมือนที่ m/02 m/06 m/07 เคยปัก */
    window.dayLab = (ds) => D.dayLab(ds, window.TODAY);
    let src = mSrc;
    if (coreSrc !== null) src = src.replace(/\.\/core\/calendar\.js/g, mk(coreSrc.replace(/\.\/dates\.js/g, datesU).replace(/\.\/schedule\.js/g, schedU) + '\n//core ' + tag));
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 300) }
  }, { mSrc, coreSrc, datesSrc: CORE_DATES, schedSrc: CORE_SCHED, statsSrc: CORE_STATS, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};

let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + String(detail).slice(0, 200) : '')) } };
const recs = {};
const IT = (over) => Object.assign({ id: 1, type: 'habit', title: 'อ่านหนังสือ', start: '2026-10-01', time: '08:00', timeEnd: '', track: 'check', target: 1, repeat: { unit: 'day', every: 1, days: [] }, log: {}, skip: {}, rem: [], subject: '' }, over);
const SCN = [
  ['habit เศษ 2/3 (ทดสอบการปัดเปอร์เซ็นต์)', IT({ skip: Object.fromEntries(Array.from({ length: 31 }, (_, i) => ['2026-10-' + String(i + 1).padStart(2, '0'), !['2026-10-01', '2026-10-02', '2026-10-05'].includes('2026-10-' + String(i + 1).padStart(2, '0'))]).filter(([, v]) => v)), log: { '2026-10-01': 1, '2026-10-02': 1 } })],
  ['habit ทำไปแล้วบางวัน (เศษเปอร์เซ็นต์)', IT({ log: { '2026-10-01': 1, '2026-10-02': 1, '2026-10-05': 1 }, skip: { '2026-10-03': 1 } })],
  ['habit ครบทุกวันที่ผ่านมา (100%)', IT({ log: Object.fromEntries(Array.from({ length: 31 }, (_, i) => ['2026-10-' + String(i + 1).padStart(2, '0'), 1])) })],
  ['habit ยังไม่ทำเลย', IT({})],
  ['habit นับจำนวน', IT({ track: 'count', target: 3, log: { '2026-10-02': 2, '2026-10-04': 3 } })],
  ['habit start กลางเดือน', IT({ start: '2026-10-20', log: { '2026-10-21': 1 } })],
  ['task ยังไม่เสร็จ', IT({ type: 'task', start: '2026-10-30', time: '17:00', subject: 'ส่งงาน' })],
  ['task เลยกำหนด', IT({ type: 'task', start: '2026-10-15' })],
  ['event (ครั้งถัดไป)', IT({ type: 'event', start: '2026-11-03', repeat: { unit: 'week', every: 1, days: [2] } })],
  ['class ทุกจันทร์-พุธ (เริ่มอีกสัปดาห์)', IT({ type: 'class', start: '2026-11-04', repeat: { unit: 'week', every: 1, days: [1, 3] } })],
  ['event เริ่มพรุ่งนี้ (สแกนครั้งถัดไปตั้งแต่วันนี้)', IT({ type: 'event', start: '2026-11-05', repeat: { unit: 'week', every: 1, days: [6] } })],
  ['ครั้งถัดไปชิดขอบ 90 วัน (วันละทุก 30 วัน)', IT({ type: 'event', start: '2026-10-31', repeat: { unit: 'day', every: 30, days: [] } })],
  ['รายการสิ้นสุดแล้ว (ไม่มีครั้งถัดไป)', IT({ type: 'event', start: '2026-10-01', repeat: { unit: 'none', every: 1, days: [] } })],
];
for (const [tag, mSrc, coreSrc] of [['old', OLDM, null], ['new', NEWMi, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const list = [];
  for (const [name, it] of SCN) {
    const out = await p.evaluate((item) => {
      const r = {};
      for (const k of ['detailHabit', 'detailTask', 'detailSchedule']) { try { r[k] = window[k](item) } catch (e) { r[k] = 'ERR ' + e.message } }
      return r;
    }, it);
    list.push({ name, out });
  }
  recs[tag] = list;
}
for (let i = 0; i < SCN.length; i++) {
  t(SCN[i][0] + ' | detailHabit', recs.old[i].out.detailHabit === recs.new[i].out.detailHabit, (recs.old[i].out.detailHabit || '').slice(0, 150) + ' vs ' + (recs.new[i].out.detailHabit || '').slice(0, 150));
  t(SCN[i][0] + ' | detailTask', recs.old[i].out.detailTask === recs.new[i].out.detailTask, (recs.old[i].out.detailTask || '').slice(0, 150) + ' vs ' + (recs.new[i].out.detailTask || '').slice(0, 150));
  t(SCN[i][0] + ' | detailSchedule', recs.old[i].out.detailSchedule === recs.new[i].out.detailSchedule, (recs.old[i].out.detailSchedule || '').slice(0, 150) + ' vs ' + (recs.new[i].out.detailSchedule || '').slice(0, 150));
}
if (process.env.DBG) { console.log('DBG detailHabit old:', recs.old[0].out.detailHabit.slice(0,120)); console.log('DBG detailHabit new:', recs.new[0].out.detailHabit.slice(0,120)); console.log('DBG sched old:', recs.old[0].out.detailSchedule.slice(0,300)); console.log('DBG sched new:', recs.new[0].out.detailSchedule.slice(0,300)); }
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);

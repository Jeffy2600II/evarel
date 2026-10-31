/* พิสูจน์ F6 (15-core__timer ส่วนคำนวณ): tmMs/dialPct/timerMins ที่ย้ายไป core/timer ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบทั้งค่าคำนวณตรง ๆ และ HTML ของ focusBody (หน้าปัด/ปุ่ม) บนเบราว์เซอร์จริง ล็อกนาฬิกา
   ใช้: node tests/timer_equiv.test.mjs <15-core__timer.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/timer_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/timer_m15_at_head.js', 'utf8');
const NEWM = fs.readFileSync('app/web/js/m/15-core__timer.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/m/core/timer.js', 'utf8');
const CORE_DATES = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8');
const CORE_SCHED = fs.readFileSync('app/web/js/m/core/schedule.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/now - tm\.startedAt/, 'tm.startedAt - now'); /* เวลารันติดลบ */
  if (which === 2) return R(/tm\.acc \+ \(tm\.startedAt/, 'tm.acc - (tm.startedAt'); /* ไม่บวกสะสมเดิม */
  if (which === 3) return R(/Math\.min\(100, doneMs \/ goalMs \* 100\)/, 'Math.min(101, doneMs / goalMs * 100)'); /* บีบผิดขีด */
  if (which === 4) return R(/doneMs \/ goalMs \* 100/, 'doneMs / goalMs * 90'); /* เปอร์เซ็นต์ผิด */
  if (which === 5) return R(/Math\.round\(tmMsOf\(tm, now\) \/ 6e4\)/, 'Math.floor(tmMsOf(tm, now) / 6e4)'); /* ปัดนาทีผิด */
  if (which === 6) return R(/tm\.startedAt \? now - tm\.startedAt : 0\) : 0;/, 'tm.startedAt ? now - tm.startedAt : 0) : 1;'); /* ไม่มีตัวจับควรได้ 0 แต่ได้ 1 */
  if (which === 7) return R(/dialPctOf\(base \+ ms, goal\)/, 'dialPctOf(base + ms, goal + 1)'); /* เป้าหมายเพี้ยนใน focusBody */
  return src;
}
const NEWMi = inj === 7 ? inject(NEWM, 7) : NEWM;
const NEWCOREi = inj && inj !== 7 ? inject(NEWCORE, inj) : NEWCORE;

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');

const HARNESS = `
const FIXED = new Date('2026-10-31T10:00:00+07:00').getTime();
class F extends Date { constructor(...a) { a.length ? super(...a) : super(FIXED) } static now() { return FIXED } }
globalThis.Date = F;
window.TODAY = '2026-10-31';
window.UI = { fdate: '2026-10-31' };
window.icon = ic => '[icon:' + ic + ']';
window.toast = () => {}; window.commit = () => {}; window.patch = () => {};
window.openPage = () => ({}); window.pageOf = () => null;
window.$ = id => document.getElementById(id);
window.haptic = () => {};
window.EvarelMount = null;
`;
await p.evaluate(HARNESS);
const load = async (tag, mSrc, coreSrc) => {
  const err = await p.evaluate(async ({ mSrc, coreSrc, datesSrc, schedSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const datesU = mk(datesSrc), schedU = mk(schedSrc.replace(/\.\/dates\.js/g, datesU));
    const D = await import(datesU), C = await import(schedU);
    Object.assign(window, D, C);
    window.dayLab = (ds) => D.dayLab(ds, window.TODAY);
    let src = mSrc;
    if (coreSrc !== null) src = src.replace(/\.\/core\/timer\.js/g, mk(coreSrc + '\n//core ' + tag));
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 300) }
  }, { mSrc, coreSrc, datesSrc: CORE_DATES, schedSrc: CORE_SCHED, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};
const NOW = new Date('2026-10-31T10:00:00+07:00').getTime();
const IT = (over) => Object.assign({ id: 9, type: 'habit', title: 'อ่านหนังสือ', start: '2026-10-01', time: '', track: 'timer', target: 25, unitName: 'นาที', repeat: { unit: 'day', every: 1, days: [] }, log: { '2026-10-31': 5 }, skip: {}, rem: [] }, over);
const SCN = [
  ['ไม่มีตัวจับ', { tm: null, it: IT() }],
  ['สะสมอย่างเดียว (หยุดชั่วคราว)', { tm: { id: 9, date: '2026-10-31', acc: 300000, startedAt: null }, it: IT() }],
  ['กำลังรัน 90 วินาที', { tm: { id: 9, date: '2026-10-31', acc: 300000, startedAt: NOW - 90000 }, it: IT() }],
  ['รันจนเกินเป้า (บีบ 100)', { tm: { id: 9, date: '2026-10-31', acc: 1500000, startedAt: NOW - 600000 }, it: IT() }],
  ['ตัวจับของรายการอื่น', { tm: { id: 77, date: '2026-10-30', acc: 120000, startedAt: NOW - 60000 }, it: IT() }],
  ['ทำไปแล้วเกือบเป้า', { tm: { id: 9, date: '2026-10-31', acc: 1140000, startedAt: null }, it: IT({ log: { '2026-10-31': 24 } }) }],
  ['ปัด 29 นาที 40 วิ -> 30', { tm: { id: 9, date: '2026-10-31', acc: 0, startedAt: NOW - 1780000 }, it: IT() }],
  ['ปัด 29 นาที 10 วิ -> 29', { tm: { id: 9, date: '2026-10-31', acc: 0, startedAt: NOW - 1750000 }, it: IT() }],
];
let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + String(detail).slice(0, 200) : '')) } };
const recs = {};
for (const [tag, mSrc, coreSrc] of [['old', OLDM, null], ['new', NEWMi, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const list = [];
  for (const [name, { tm, it }] of SCN) {
    const out = await p.evaluate(([item, tmv]) => {
      window.ST = { TM: tmv, focusId: null, _render: () => {} };
      const r = {};
      r.ms = window.tmMs();
      r.focus = window.focusBody(item);
      return r;
    }, [it, tm]);
    list.push({ name, out });
  }
  recs[tag] = { list };
}
/* tmFinish: เทียบจำนวนนาทีที่จะบันทึกผ่าน commit stub */
const minsOf = {};
for (const [tag, mSrc, coreSrc] of [['old', OLDM, null], ['new', NEWMi, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const got = [];
  for (const [name, { tm, it }] of SCN.slice(2)) {
    const r = await p.evaluate(([item, tmv]) => {
      window.ST = { TM: tmv, focusId: null, _render: () => {} };
      window.find = (id) => String(id) === String(item.id) ? item : null; /* tmFinish หา it จาก ST.TM.id ต้องเจอ */
      let saved = null; window.commit = (msg, fn) => { fn(); saved = msg }; window.toast = (m) => { saved = 'TOAST:' + m }; window.refreshFocus = () => {};
      window.tmFinish();
      return saved;
    }, [it, tm]);
    got.push({ name, r });
  }
  minsOf[tag] = got;
}
for (let i = 0; i < SCN.length; i++) {
  t(SCN[i][0] + ' | ms รวม', recs.old.list[i].out.ms === recs.new.list[i].out.ms, recs.old.list[i].out.ms + ' vs ' + recs.new.list[i].out.ms);
  t(SCN[i][0] + ' | focusBody HTML', recs.old.list[i].out.focus === recs.new.list[i].out.focus, (recs.old.list[i].out.focus || '').slice(0, 120) + ' vs ' + (recs.new.list[i].out.focus || '').slice(0, 120));
}
for (let i = 0; i < minsOf.old.length; i++) { if (process.env.DBG) console.log('DBG tmFinish', minsOf.old[i].name, '::', String(minsOf.old[i].r).slice(0,60), 'vs', String(minsOf.new[i].r).slice(0,60)); t('tmFinish | ' + minsOf.old[i].name, minsOf.old[i].r === minsOf.new[i].r, minsOf.old[i].r + ' vs ' + minsOf.new[i].r); }
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);

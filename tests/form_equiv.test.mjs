/* พิสูจน์ F6 (14-ui__form ส่วนตรรกะ): newDraft/draftFrom/everyTxt/repSum/remSum/rangeSum/notifyIssue/validate/buildItem ที่ย้ายไป core/form ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบผ่านชื่อ window เดิมทั้งหมด บนเบราว์เซอร์จริง (mk ของจริงจาก core/store ล็อกนาฬิกา) — ครอบคลุมทุกประเภทและทุกกฎการตรวจ
   ใช้: node tests/form_equiv.test.mjs <14-ui__form.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/form_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/form_m14_at_head.js', 'utf8');
const NEWM = fs.readFileSync('app/web/js/m/14-ui__form.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/m/core/form.js', 'utf8');
const CORE_DATES = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8');
const CORE_SCHED = fs.readFileSync('app/web/js/m/core/schedule.js', 'utf8');
const CORE_STORE = fs.readFileSync('app/web/js/m/core/store.js', 'utf8');
const CORE_CONST = fs.readFileSync('app/web/js/m/core/constants.js', 'utf8');
const CORE_NOTIFY = fs.readFileSync('app/web/js/m/core/notify.js', 'utf8');
const CORE_UIHTML = fs.readFileSync('app/web/js/m/core/uihtml.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/\.sort\(\)/, ''); /* วันซ้ำไม่เรียง */
  if (which === 2) return R(/slice\(0, 2\)/, 'slice(0, 3)'); /* โชว์การเตือนเกิน */
  if (which === 3) return R(/d\.timeEnd <= d\.time/, 'd.timeEnd < d.time'); /* เวลาเท่ากันไม่ตรวจ */
  if (which === 4) return R(/Math\.max\(1, Math\.round\(\+d\.every \|\| 1\)\)/, 'Math.max(0, Math.round(+d.every || 1))'); /* ทุก ๆ 0 วันผ่าน */
  if (which === 5) return R(/T === "task" \? "check" : "none"/, '"none"'); /* task ไม่ติ๊กได้ */
  if (which === 6) return R(/t === "habit" \? "day" : "none"/, '"day"'); /* งานได้ซ้ำรายวัน */
  if (which === 7) return R(/r\.m >= 0/, 'r.m > 0'); /* เตือนตรงเวลา (m=0) ไม่เตือนให้ใส่เวลา */
  return src;
}
const NEWCOREi = inj ? inject(NEWCORE, inj) : NEWCORE;

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');
const HARNESS = `
const FIXED = new Date('2026-10-31T10:00:00+07:00').getTime();
class F extends Date { constructor(...a) { a.length ? super(...a) : super(FIXED) } static now() { return FIXED } }
globalThis.Date = F;
window.TODAY = '2026-10-31';
window.UI = { tab: 'today', date: '2026-10-31', calSel: '2026-10-20' };
window.ST = { D: null };
`;
await p.evaluate(HARNESS);
const load = async (tag, mSrc, coreSrc) => {
  const err = await p.evaluate(async ({ mSrc, coreSrc, datesSrc, schedSrc, storeSrc, constSrc, notifySrc, uihtmlSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const datesU = mk(datesSrc), constU = mk(constSrc.replace(/\.\/dates\.js/g, datesU));
    const schedU = mk(schedSrc.replace(/\.\/dates\.js/g, datesU).replace(/\.\/constants\.js/g, constU));
    const notifyU = mk(notifySrc.replace(/\.\/dates\.js/g, datesU).replace(/\.\/schedule\.js/g, schedU));
    const storeU = mk(storeSrc.replace(/\.\/dates\.js/g, datesU).replace(/\.\/schedule\.js/g, schedU));
    const D = await import(datesU), S2 = await import(storeU), K2 = await import(constU), C2 = await import(schedU), N2 = await import(notifyU);
    Object.assign(window, D, S2, K2, C2, N2); /* global ที่ฝั่งเก่าอ่าน (m/01 m/02 m/06 m/10 เคยปัก) ใช้ของจริงจาก core ทั้งหมด */
    window.mk = (o) => S2.mk('2026-10-31', o);
    const uihtmlU = mk(uihtmlSrc.replace(/\.\/dates\.js/g, datesU).replace(/\.\/constants\.js/g, constU).replace(/\.\/schedule\.js/g, schedU));
    let src = mSrc.replace(/\.\/core\/uihtml\.js/g, uihtmlU);
    if (coreSrc !== null) src = src.replace(/\.\/core\/form\.js/g, mk(coreSrc.replace(/\.\/constants\.js/g, constU).replace(/\.\/dates\.js/g, datesU).replace(/\.\/schedule\.js/g, schedU).replace(/\.\/notify\.js/g, notifyU) + '\n//core ' + tag));
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 300) }
  }, { mSrc, coreSrc, datesSrc: CORE_DATES, schedSrc: CORE_SCHED, storeSrc: CORE_STORE, constSrc: CORE_CONST, notifySrc: CORE_NOTIFY, uihtmlSrc: CORE_UIHTML, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};
const ITEM = (over) => Object.assign({ id: 9, type: 'habit', title: 'อ่านหนังสือ', subject: '', start: '2026-10-01', end: '', time: '19:00', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'week', every: 1, days: [1, 3, 5] }, rem: [{ k: 'before', m: 0 }, { k: 'at', t: '08:00' }], log: { '2026-10-31': 1 }, skip: {} }, over);
const DRAFT = (over) => Object.assign({ id: null, step: 'form', open: '', type: 'habit', title: 'อ่านหนังสือ', subject: '', start: '2026-10-31', end: '', endMode: 'never', time: '19:00', timeEnd: '', unit: 'week', every: 1, days: [3, 1, 5], track: 'check', target: 1, unitName: '', rem: [{ k: 'before', m: 0 }, { k: 'before', m: 30 }, { k: 'before', m: 10 }, { k: 'at', t: '08:00' }], err: '' }, over);
let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + String(detail).slice(0, 200) : '')) } };
const recs = {};
const CASES = [
  ['newDraft habit', { call: ['newDraft', ['habit']] }],
  ['newDraft task', { call: ['newDraft', ['task']] }],
  ['newDraft จากปฏิทิน (base = calSel)', { ui: { tab: 'calendar' }, call: ['newDraft', ['event']] }],
  ['draftFrom habit ครบ', { call: ['draftFrom', [ITEM()]] }],
  ['draftFrom task track none', { call: ['draftFrom', [ITEM({ type: 'task', track: 'none' })]] }],
  ['repSum สัปดาห์ (เรียงวัน)', { D: DRAFT(), call: ['repSum', []] }],
  ['repSum เดือนทุก ๆ 2', { D: DRAFT({ unit: 'month', every: 2, days: [] }), call: ['repSum', []] }],
  ['repSum ไม่ซ้ำ', { D: DRAFT({ unit: 'none', days: [] }), call: ['repSum', []] }],
  ['remSum เกิน 2 รายการ', { D: DRAFT(), call: ['remSum', []] }],
  ['remSum ปิดแจ้งเตือน', { D: DRAFT({ rem: [] }), call: ['remSum', []] }],
  ['rangeSum วันนี้', { D: DRAFT(), call: ['rangeSum', []] }],
  ['rangeSum มีวันสิ้นสุด', { D: DRAFT({ endMode: 'date', end: '2026-11-30', start: '2026-10-05' }), call: ['rangeSum', []] }],
  ['notifyIssue มีเตือนแต่ไม่มีเวลา', { D: DRAFT({ time: '' }), call: ['notifyIssue', []] }],
  ['notifyIssue ตรงเวลา (m=0) ไม่มีเวลา', { D: DRAFT({ time: '', rem: [{ k: 'before', m: 0 }] }), call: ['notifyIssue', []] }],
  ['validate ผ่าน', { D: DRAFT(), call: ['validate', []] }],
  ['validate ไม่มีชื่อ', { D: DRAFT({ title: '   ' }), call: ['validate', []] }],
  ['validate เวลาจบก่อนเริ่ม', { D: DRAFT({ timeEnd: '18:00' }), call: ['validate', []] }],
  ['validate เวลาจบตรงกัน', { D: DRAFT({ timeEnd: '19:00' }), call: ['validate', []] }],
  ['validate วันสิ้นสุดก่อนเริ่ม', { D: DRAFT({ endMode: 'date', end: '2026-10-01' }), call: ['validate', []] }],
  ['validate เตือนแต่ไม่มีเวลา', { D: DRAFT({ time: '' }), call: ['validate', []] }],
  ['validate class ไม่เลือกวัน', { D: DRAFT({ type: 'class', unit: 'week', days: [] }), call: ['validate', []] }],
  ['buildItem habit นับเป้า (ทุก ๆ 0 -> 1)', { D: DRAFT({ track: 'count', target: 5, unitName: ' แก้ว ', every: -3 }), call: ['buildItem', []] }],
  ['buildItem task', { D: DRAFT({ type: 'task', track: 'none', timeEnd: '20:00' }), call: ['buildItem', []] }],
  ['buildItem class (days จาก start)', { D: DRAFT({ type: 'class', unit: 'week', days: [] }), call: ['buildItem', []] }],
  ['buildItem แก้ไข (รักษา log/skip)', { D: DRAFT({ id: 9 }), call: ['buildItem', []] }],
  ['buildItem rem เกิน MAX_REM', { D: DRAFT({ rem: Array.from({ length: 12 }, (_, i) => ({ k: 'before', m: i })) }), call: ['buildItem', []] }],
];
for (const [tag, mSrc, coreSrc] of [['old', OLDM, null], ['new', NEWM, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const list = [];
  for (const [name, c] of CASES) {
    const out = await p.evaluate(([c, ui]) => {
      if (ui) Object.assign(window.UI, ui); else { window.UI.tab = 'today'; window.UI.date = '2026-10-31'; window.UI.calSel = '2026-10-20' }
      if (c.D) window.ST.D = JSON.parse(JSON.stringify(c.D));
      const [fn, args] = c.call;
      try { return JSON.parse(JSON.stringify(window[fn](...args))) } catch (e) { return 'ERR ' + e.message }
    }, [c, c.ui || null]);
    list.push({ name, out });
  }
  recs[tag] = list;
}
for (let i = 0; i < CASES.length; i++) {
  const A = JSON.stringify(recs.old[i].out), B = JSON.stringify(recs.new[i].out);
  t(CASES[i][0], A === B, A.slice(0, 160) + ' vs ' + B.slice(0, 160));
}
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);

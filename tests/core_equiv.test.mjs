/* เทียบ "ชั้นฐานชุดใหม่" (app/src/core, ES module จริง) กับต้นฉบับโมดูล window เดิม ด้วยอินพุตและเวลาล็อกชุดเดียวกัน (เกณฑ์ S4 ข้อ 2)
   ต้นฉบับอ่านจาก git commit ฐาน (BASE) ไม่ใช่ไฟล์ปัจจุบัน เพราะโมดูลเดิมจะถูกลบเมื่อ React แทนทุก route
   ใช้: node tests/core_equiv.test.mjs   ผล: exit 1 ถ้ามีผลต่างแม้ข้อเดียว */
import { execFileSync } from 'node:child_process'; import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join, dirname } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CORE_EQUIV_BASE || '6a5833b';
const tmp = mkdtempSync(join(tmpdir(), 'core-eq-'));
const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '--ignoreConfig', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--lib', 'dom,esnext', '--outDir', tmp, join(ROOT, 'app/src/core/dates.ts'), join(ROOT, 'app/src/core/schedule.ts'), join(ROOT, 'app/src/core/stats.ts')], { stdio: 'inherit' });
writeFileSync(join(tmp, 'package.json'), '{"type":"module"}');
for (const f of ['dates', 'schedule', 'stats']) { const p = join(tmp, f + '.js'); const t = (await import('node:fs')).readFileSync(p, 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.js'"); writeFileSync(p, t); }
const orig = (f) => execFileSync('git', ['show', `${BASE}:app/web/js/m/${f}.js`], { cwd: ROOT, encoding: 'utf8' }).replace(/^"use strict";?/, '');
const D = await import(pathToFileURL(join(tmp, 'dates.js'))), S = await import(pathToFileURL(join(tmp, 'schedule.js'))), T = await import(pathToFileURL(join(tmp, 'stats.js')));
const fs = { readFileSync: (p) => orig(p.split('/').pop().replace(/\.js$/, '')) };
const FIXED = new Date('2026-10-17T05:30:00Z');
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a){ if(a.length===0) super(FIXED.getTime()); else super(...a); } static now(){ return FIXED.getTime(); } };
// โหลดต้นฉบับ: ทุกไฟล์ใช้ Object.assign(window,...) -> ให้ window = globalThis
globalThis.window = globalThis; globalThis.document = {}; globalThis.navigator = {};
const src = ['01-core__constants','02-core__dates','03-core__store','06-services__schedule','07-services__stats']
  .map(f => orig(f)).join('\n;\n');
// const ระดับบนสุดของแต่ละไฟล์ไม่ออก global -> ห่อรวมเป็นฟังก์ชันเดียว แล้วคืน window ที่ถูก assign
(0, eval)('var S = { items: [] }; var UI = { period: "week" };\n' + src);
const O = globalThis;
const mk = (id,o) => ({ id, type:'habit', title:'t'+id, subject:'ว', time:'', timeEnd:'', track:'check', target:1, unitName:'ข้อ', repeat:{unit:'day',every:1,days:[]}, start:'2026-09-01', end:'', skip:{}, log:{}, rem:[], ...o });
const logs = (n,every=1,v=1) => Object.fromEntries(Array.from({length:n},(_,i)=> i%every===0 ? [new RealDate(FIXED.getTime()-i*864e5).toISOString().slice(0,10), v] : null).filter(Boolean));
const ITEMS = [
 mk(1,{repeat:{unit:'none',every:1,days:[]},start:'2026-10-17'}), mk(2,{repeat:{unit:'none',every:1,days:[]},start:'2026-10-10',log:{'2026-10-10':1}}),
 mk(3), mk(4,{repeat:{unit:'day',every:3,days:[]},start:'2026-09-02'}), mk(5,{repeat:{unit:'week',every:1,days:[1,3,5]}}),
 mk(6,{repeat:{unit:'week',every:2,days:[1,3]},start:'2026-09-14',end:'2026-12-01'}), mk(7,{repeat:{unit:'month',every:1,days:[]},start:'2026-08-31'}),
 mk(8,{repeat:{unit:'month',every:2,days:[]},start:'2026-01-15',end:'2026-10-16'}), mk(9,{track:'count',target:3,unitName:'หน้า',log:logs(20,1,3)}),
 mk(10,{track:'timer',target:30,unitName:'นาที',time:'05:30',timeEnd:'06:00',log:logs(15,2,30)}), mk(11,{track:'none'}),
 mk(12,{time:'11:59'}), mk(13,{time:'12:00'}), mk(14,{time:'16:59'}), mk(15,{time:'17:00'}), mk(16,{time:'00:00'}), mk(17,{time:'23:59',timeEnd:'23:59'}),
 mk(18,{log:logs(40),skip:{'2026-10-15':true,'2026-10-10':true}}), mk(19,{log:logs(10,3),start:'2026-10-05'}), mk(20,{start:'2026-10-18'}),
 mk(21,{rem:[{k:'before',m:0},{k:'before',m:30},{k:'before',m:120},{k:'before',m:1440},{k:'before',m:2880},{k:'at',t:'07:15'}]}),
 mk(22,{repeat:{unit:'week',every:1,days:[0,6]},log:logs(60,1,1)}), mk(24,{type:'class',track:'count',target:3,log:{'2026-10-06':2,'2026-10-13':3},repeat:{unit:'week',every:1,days:[1]},start:'2026-05-15'}),
 mk(25,{type:'task',start:'2026-10-05'}), mk(26,{type:'task',start:'2026-10-12',log:{'2026-10-12':1}}),
 /* ขอบเกณฑ์สี lv (>=80 hi, >=50 mid): ช่วงนับ t วันย้อนจากวันล็อก ok วัน -> pct 79 / 80 / 50 พอดี (month 28 วัน, week 7 วัน ใช้ 4/5 ไม่ได้ จึงเล็งที่ month) */
 mk(27,{title:'edge79',start:'2026-09-20',log:logs(22,1,1)}), mk(28,{title:'edge80',start:'2026-09-23',log:logs(20,1,1)}), mk(29,{title:'edge50',start:'2026-09-20',log:logs(14,1,1)}),
];
const DATES = ['2026-10-17','2026-10-16','2026-10-18','2026-10-01','2026-09-30','2026-12-01','2026-12-02','2026-02-28','2028-02-29','2026-01-01','2026-12-31','2026-10-11','2026-10-12'];
const TODAY = D.ymd(new Date());
O.S.items = ITEMS;
let fail = 0, n = 0;
const eq = (name, a, b) => { n++; const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) { fail++; console.log('FAIL', name, '\n  orig:', x.slice(0,160), '\n  new :', y.slice(0,160)); } };
eq('TODAY', O.TODAY, TODAY);
eq('pad', [0,5,12].map(O.pad), [0,5,12].map(D.pad));
eq('ymd/parse', DATES.map(x=>O.ymd(O.parse(x))), DATES.map(x=>D.ymd(D.parse(x))));
eq('addDays', DATES.map(x=>O.ymd(O.addDays(O.parse(x),7))+O.ymd(O.addDays(O.parse(x),-45))+O.ymd(O.addDays(O.parse(x),400))), DATES.map(x=>D.ymd(D.addDays(D.parse(x),7))+D.ymd(D.addDays(D.parse(x),-45))+D.ymd(D.addDays(D.parse(x),400))));
eq('fmtDate', DATES.map(O.fmtDate), DATES.map(D.fmtDate));
eq('dayLab', DATES.map(O.dayLab), DATES.map(x=>D.dayLab(x,TODAY)));
eq('nowHM', O.nowHM(), D.nowHM());
eq('fmtClock', [0,999,1000,59999,60000,3599999,3600000,86399000,90061000].map(O.fmtClock), [0,999,1000,59999,60000,3599999,3600000,86399000,90061000].map(D.fmtClock));
eq('esc', ['<b>"a"&\'b\'</b>','','ก ข','&amp;'].map(O.esc), ['<b>"a"&\'b\'</b>','','ก ข','&amp;'].map(D.esc));
const E = (nm, fo, fn) => eq(nm, ITEMS.map(it=>DATES.map(ds=>fo(it,ds))), ITEMS.map(it=>DATES.map(ds=>fn(it,ds))));
E('occursOn',O.occursOn,S.occursOn); E('scheduled',O.scheduled,S.scheduled); E('val',O.val,S.val); E('isDone',O.isDone,S.isDone); E('skipped',O.skipped,S.skipped);
E('dayState',O.dayState,(it,ds)=>S.dayState(it,ds,TODAY));
eq('isFuture', DATES.map(O.isFuture), DATES.map(d=>S.isFuture(d,TODAY)));
eq('onDate', DATES.map(ds=>O.onDate(ds).map(i=>i.id)), DATES.map(ds=>S.onDate(ITEMS,ds).map(i=>i.id)));
eq('overdue', O.overdue().map(i=>i.id), S.overdue(ITEMS,TODAY).map(i=>i.id));
const K = (nm, fo, fn) => eq(nm, ITEMS.map(fo), ITEMS.map(fn));
K('target',O.target,S.target); K('tracked',O.tracked,S.tracked); K('periodOf',O.periodOf,S.periodOf); K('streak',O.streak,S.streak); K('rate',O.rate,S.rate);
K('repeatText',O.repeatText,S.repeatText); K('timeText',O.timeText,S.timeText);
eq('remText', ITEMS.flatMap(i=>i.rem).map(O.remText), ITEMS.flatMap(i=>i.rem).map(S.remText));
eq('PERIODS', O.PERIODS, S.PERIODS);
eq('TYPES', O.TYPES, S.TYPES);
// stats: ต้นฉบับอ่าน S.items กับ UI.period ส่วนชุดใหม่รับ items/period เป็นอาร์กิวเมนต์
eq('ARC_C', O.ARC_C, T.ARC_C);
eq('habits', O.habits().map(i=>i.id), T.habits(ITEMS).map(i=>i.id));
K('typeIcon',O.typeIcon,T.typeIcon); K('totalDone',O.totalDone,T.totalDone);
eq('periodStats', ITEMS.map(it=>[7,28,90].map(n=>O.periodStats(it,n))), ITEMS.map(it=>[7,28,90].map(n=>T.periodStats(it,n))));
for (const per of ['week','month']) { O.UI.period = per; eq('chartData_'+per, O.chartData(), T.chartData(ITEMS, per)); }
// buildStatsProps: เทียบกับ props ที่ VIEWS.stats ต้นฉบับ (13-views ใน git) ส่งเข้า React จริง
// ดึงเนื้อ stats() ด้วยการนับวงเล็บให้สมดุล (ไม่ใช้ regex เดา) แล้วรันโดยดัก EvarelPages.stats เก็บ props
{
  const v = orig('13-views'); const st = v.indexOf('stats() {'); let depth = 0, i = v.indexOf('{', st), end = -1;
  for (let k = i; k < v.length; k++) { const ch = v[k]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } } }
  if (st < 0 || end < 0) { n++; fail++; console.log('FAIL buildStatsProps: ดึง VIEWS.stats จาก 13-views ไม่ได้'); }
  else {
    const fnSrc = 'return function ' + v.slice(st, end + 1);
    for (const per of ['week','month']) {
      O.UI.period = per; let got = null;
      O.EvarelPages = { stats: (p) => { got = p; return '<ul><li></li></ul>'; } }; /* O.window === O จึงตรงกับ window.EvarelPages ที่ต้นฉบับอ่าน */
      O.header = () => ''; O.seg = () => ''; O.icon = () => ''; O.statsClassic = () => { throw new Error('ตกไป statsClassic: เส้นทาง React ไม่ถูกเข้า'); };
      const run = new Function('O', 'with(O){ ' + fnSrc + ' }');
      run(O).call({});
      if (!got) { n++; fail++; console.log('FAIL buildStatsProps_' + per + ': VIEWS.stats ไม่ส่ง props (อาจตกไป statsClassic)'); }
      else eq('buildStatsProps_' + per, got, T.buildStatsProps(ITEMS, per, TODAY));
    }
  }
}
// buildAllProps: เทียบกับ props ที่ VIEWS.all ต้นฉบับส่งเข้า React จริง (ดึงเนื้อ all() ด้วยการนับวงเล็บ ดัก EvarelPages.all)
{
  const v = orig('13-views'); const st = v.indexOf('all() {'); let depth = 0, i = v.indexOf('{', st), end = -1;
  for (let k = i; k < v.length; k++) { const ch = v[k]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } } }
  if (st < 0 || end < 0) { n++; fail++; console.log('FAIL buildAllProps: ดึง VIEWS.all จาก 13-views ไม่ได้'); }
  else {
    const fnSrc = 'return function ' + v.slice(st, end + 1);
    /* O.icon ถูกสต็อบเป็น () => '' ในหมวด buildStatsProps ที่อยู่ก่อนหน้า ต้องสร้างใหม่จากตาราง ICONS จริง ไม่งั้นไอคอนว่างหมดแล้วตัวเทียบมองไม่เห็นความผิดเรื่องไอคอน */
    O.icon = (nm) => `<svg class="ev-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${O.ICONS[nm]}"/></svg>`;
    O.header = () => ''; O.pills = () => ''; O.allClassic = () => { throw new Error('ตกไป allClassic: เส้นทาง React ไม่ถูกเข้า'); };
    for (const type of ['all', 'habit', 'task', 'event', 'class']) {
      O.UI.type = type; O.S.items = ITEMS; let got = null;
      O.EvarelPages = { all: (p) => { got = p; return '<ul><li></li></ul>'; } };
      const run = new Function('O', 'with(O){ ' + fnSrc + ' }');
      let threw = null; try { run(O).call({}); } catch (e) { threw = e; }
      const want = T.buildAllProps(ITEMS, type, O.icon);
      if (!want.sections.length) { n++; if (got !== null || !threw) { fail++; console.log('FAIL buildAllProps_' + type + ': ชนิดว่างต้องตกไป allClassic'); } continue; }
      if (threw || !got) { n++; fail++; console.log('FAIL buildAllProps_' + type + ': ' + (threw ? threw.message : 'ไม่ส่ง props')); }
      else eq('buildAllProps_' + type, got, want);
    }
    O.S.items = [];
  }
}
console.log(`เทียบ ${n} หมวด | ตกเพราะต่างกัน: ${fail}`); process.exit(fail ? 1 : 0);

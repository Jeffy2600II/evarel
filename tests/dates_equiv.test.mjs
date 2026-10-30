// พิสูจน์ F6 (02-core__dates): โมดูลใหม่ (ฟังก์ชันบริสุทธิ์มาจาก core/dates) ให้ผลเหมือนโมดูลเดิมทุกชื่อที่ส่งออก ทุกกรณี
// ใช้: node tests/dates_equiv.test.mjs <02-core__dates.js เดิม>   (ใหม่อ่านจาก app/web/js/m/02-core__dates.js)
// ล็อกนาฬิกา (TODAY/nowHM/dayLab ผูกเวลา) โหลดแต่ละเวอร์ชันเป็นโมดูลแยกในเบราว์เซอร์จริง จำลอง 01-core__constants และ core/dates ด้วย blob
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/02-core__dates.js', 'utf8');
const CORE = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8'), CONST = fs.readFileSync('app/web/js/m/01-core__constants.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const r = await p.evaluate(async ({ OLD, NEW, CORE, CONST }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const coreU = mk(CORE), constU = mk(CONST);
  const NOW = new Date(2026, 9, 30, 7, 51, 9).getTime(); const RealDate = Date;
  const clock = () => { globalThis.Date = class extends RealDate { constructor(...a) { a.length ? super(...a) : super(NOW) } static now() { return NOW } }; };
  const unclock = () => { globalThis.Date = RealDate };
  const out = {};
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    for (const k of ['pad','ymd','parse','addDays','TODAY','fmtDate','nowHM','esc','fmtClock','haptic','dayLab']) delete window[k];
    clock();
    const code = src.replace(/\.\/core\/dates\.js/g, coreU).replace(/\.\/01-core__constants\.js/g, constU);
    const m = await import(mk(code + '\n//' + name + Math.random()));
    const res = { exports: Object.keys(m).sort(), win: ['pad','ymd','parse','addDays','TODAY','fmtDate','nowHM','esc','fmtClock','haptic','dayLab'].map(k => typeof window[k]), same: ['pad','ymd','parse','addDays','TODAY','fmtDate','nowHM','esc','fmtClock','haptic','dayLab'].every(k => window[k] === m[k]) };
    const D = ['2026-01-01', '2026-02-28', '2026-10-29', '2026-10-30', '2026-10-31', '2024-02-29', '2026-12-31'];
    res.ymd = [new RealDate(2026, 0, 5), new RealDate(2026, 11, 31), new RealDate(2024, 1, 29)].map(m.ymd);
    res.parse = D.map(s => m.parse(s).getTime()); res.fmtDate = D.map(m.fmtDate); res.dayLab = D.map(m.dayLab);
    res.addDays = [-40, -1, 0, 1, 33, 400].map(n => m.ymd(m.addDays(new RealDate(2026, 9, 30), n)));
    res.pad = [0, 5, 9, 10, 99, 123].map(m.pad); res.fmtClock = [0, 999, 1000, 61000, 3599000, 3600000, 86399000, 90061000].map(m.fmtClock);
    res.esc = [null, undefined, 0, 'a&b<c>"d\'e', '<script>alert(1)</script>', 'ไทย&ok', 123].map(m.esc);
    res.TODAY = m.TODAY; res.nowHM = m.nowHM();
    const calls = []; const nav = navigator; const orig = Object.getOwnPropertyDescriptor(Navigator.prototype, 'vibrate');
    Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: n => { calls.push(n) } }); m.haptic();
    Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: () => { throw new Error('x') } }); let thrown = false; const w = console.warn; const warns = []; console.warn = (...a) => warns.push(a.join(' ')); try { m.haptic() } catch { thrown = true } console.warn = w;
    Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: undefined }); let t2 = false; try { m.haptic() } catch { t2 = true }
    if (orig) Object.defineProperty(Navigator.prototype, 'vibrate', orig); else delete Navigator.prototype.vibrate;
    res.haptic = { calls, thrown, warns, noVibrateThrown: t2 };
    unclock(); out[name] = res;
  }
  return out;
}, { OLD, NEW, CORE, CONST });
let diff = 0; const keys = Object.keys(r.old);
for (const k of keys) { const a = JSON.stringify(r.old[k]), c = JSON.stringify(r.new[k]); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', k, '| เริ่มต่างที่ตำแหน่ง', i, '\n  เดิม: …' + a.slice(Math.max(0, i - 25), i + 50), '\n  ใหม่: …' + c.slice(Math.max(0, i - 25), i + 50)); } }
const distinct = new Set([...r.new.fmtDate, ...r.new.dayLab, ...r.new.addDays]).size;
console.log(`เทียบ ${keys.length} หมวด | ตรง ${keys.length - diff} | ต่าง ${diff} | ค่าต่างกันจริง ${distinct} แบบ | exports ${r.new.exports.length} ชื่อ | window ตรง export: ${r.new.same} | pageerror ${errs.length}`);
await b.close(); process.exit(diff || errs.length || distinct < 12 || !r.new.same || r.new.exports.length < 11 ? 1 : 0);

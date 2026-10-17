/* เทียบผลฟังก์ชันคำนวณ ฉบับ JS ต้นฉบับ (ก่อนแปลง TS) กับฉบับที่คอมไพล์จาก TS ด้วยอินพุตชุดเดียวกัน (เกณฑ์ S4 ข้อ 2)
   โหลดสองชุดในเบราว์เซอร์จริงสองหน้า ล็อกเวลาให้เท่ากันด้วย page.clock จึงเทียบ streak/rate/dayLab ที่อ่านเวลาปัจจุบันได้
   ใช้: node tests/fn_equiv.test.mjs <ORIG_WEB_DIR> <NEW_WEB_DIR>   ผล: exit 1 ถ้ามีผลต่างแม้ข้อเดียว */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http'; import path from 'path';
const [ORIG, NEW] = [process.argv[2], process.argv[3]];
if (!ORIG || !NEW) { console.error('ต้องระบุโฟลเดอร์ต้นฉบับและโฟลเดอร์ใหม่'); process.exit(2); }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const serve = (dir) => new Promise(r => { const s = http.createServer((q, a) => { let p = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, b) => { if (e) { a.writeHead(404); a.end(); } else { a.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); a.end(b); } }); }).listen(0, '127.0.0.1', () => r(s)); });
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const FIXED = new Date('2026-10-17T05:30:00Z');
const mk = (id, o) => ({ id, type: 'habit', title: 't' + id, subject: 'ว', time: '', timeEnd: '', track: 'check', target: 1, unitName: 'ข้อ', repeat: { unit: 'day', every: 1, days: [] }, start: '2026-09-01', end: '', skip: {}, rem: [], log: {}, ...o });
const logs = (n, every = 1, v = 1) => Object.fromEntries(Array.from({ length: n }, (_, i) => i % every === 0 ? [new Date(FIXED.getTime() - i * 864e5).toISOString().slice(0, 10), v] : null).filter(Boolean));
const ITEMS = [
  mk(1, { repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-17' }), mk(2, { repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-10', log: { '2026-10-10': 1 } }),
  mk(3), mk(4, { repeat: { unit: 'day', every: 3, days: [] }, start: '2026-09-02' }), mk(5, { repeat: { unit: 'week', every: 1, days: [1, 3, 5] } }),
  mk(6, { repeat: { unit: 'week', every: 2, days: [1, 3] }, start: '2026-09-14', end: '2026-12-01' }), mk(7, { repeat: { unit: 'month', every: 1, days: [] }, start: '2026-08-31' }),
  mk(8, { repeat: { unit: 'month', every: 2, days: [] }, start: '2026-01-15', end: '2026-10-16' }), mk(9, { track: 'count', target: 3, unitName: 'หน้า', log: logs(20, 1, 3) }),
  mk(10, { track: 'timer', target: 30, unitName: 'นาที', time: '05:30', timeEnd: '06:00', log: logs(15, 2, 30) }), mk(11, { track: 'none' }),
  mk(12, { time: '11:59' }), mk(13, { time: '12:00' }), mk(14, { time: '16:59' }), mk(15, { time: '17:00' }), mk(16, { time: '00:00' }), mk(17, { time: '23:59', timeEnd: '23:59' }),
  mk(18, { log: logs(40), skip: { '2026-10-15': true, '2026-10-10': true } }), mk(19, { log: logs(10, 3), start: '2026-10-05' }), mk(20, { start: '2026-10-18' }),
  mk(21, { rem: [{ k: 'before', m: 0 }, { k: 'before', m: 30 }, { k: 'before', m: 120 }, { k: 'before', m: 1440 }, { k: 'before', m: 2880 }, { k: 'at', t: '07:15' }] }),
  mk(22, { repeat: { unit: 'week', every: 1, days: [0, 6] }, log: logs(60, 1, 1) }), mk(23, { type: 'event', time: '15:00', timeEnd: '16:30', repeat: { unit: 'week', every: 2, days: [1, 3] }, start: '2026-10-14', end: '2026-12-01' }),
  mk(24, { type: 'class', track: 'count', target: 3, log: { '2026-10-06': 2, '2026-10-13': 3 }, repeat: { unit: 'week', every: 1, days: [1] }, start: '2026-05-15' }),
];
const DATES = ['2026-10-17', '2026-10-16', '2026-10-18', '2026-10-01', '2026-09-30', '2026-12-01', '2026-12-02', '2026-02-28', '2028-02-29', '2026-01-01', '2026-12-31', '2026-10-11', '2026-10-12'];
const probe = ([ITEMS, DATES]) => {
  const out = {}; const R = (k, f) => { try { out[k] = JSON.stringify(f()); } catch (e) { out[k] = 'ERR:' + e.message; } };
  S.items = ITEMS; const kp = k => ITEMS.map(it => k(it));
  R('TODAY', () => TODAY); R('nowHM', () => nowHM()); R('pad', () => [pad(0), pad(5), pad(12)]); R('ymd', () => DATES.map(x => ymd(parse(x)))); R('parse', () => DATES.map(x => parse(x).getTime()));
  R('addDays', () => DATES.map(x => ymd(addDays(parse(x), 7)) + ymd(addDays(parse(x), -45)) + ymd(addDays(parse(x), 400)))); R('fmtDate', () => DATES.map(fmtDate)); R('dayLab', () => DATES.map(dayLab));
  R('fmtClock', () => [0, 999, 1000, 59999, 60000, 3599999, 3600000, 86399000, 90061000].map(fmtClock)); R('esc', () => ['<b>"a"&\'b\'</b>', '', 'ก ข', '&amp;'].map(esc));
  R('occursOn', () => ITEMS.map(it => DATES.map(ds => occursOn(it, ds)))); R('scheduled', () => ITEMS.map(it => DATES.map(ds => scheduled(it, ds)))); R('dayState', () => ITEMS.map(it => DATES.map(ds => dayState(it, ds))));
  R('val', () => ITEMS.map(it => DATES.map(ds => val(it, ds)))); R('isDone', () => ITEMS.map(it => DATES.map(ds => isDone(it, ds)))); R('target', () => kp(target)); R('tracked', () => kp(tracked));
  R('skipped', () => ITEMS.map(it => DATES.map(ds => skipped(it, ds)))); R('isFuture', () => DATES.map(isFuture)); R('onDate', () => DATES.map(ds => onDate(ds).map(i => i.id))); R('overdue', () => overdue().map(i => i.id));
  R('periodOf', () => kp(periodOf)); R('streak', () => kp(streak)); R('rate', () => kp(rate)); R('remText', () => ITEMS.flatMap(it => it.rem).map(remText)); R('repeatText', () => kp(repeatText)); R('timeText', () => kp(timeText));
  R('habits', () => habits().map(i => i.id)); R('typeIcon', () => kp(typeIcon)); R('totalDone', () => kp(totalDone));
  R('periodStats', () => ITEMS.map(it => [7, 28, 90].map(n => periodStats(it, n)))); for (const per of ['week', 'month']) R('chartData_' + per, () => { UI.period = per; return chartData(); });
  return out;
};
const SERVERS = [await serve(ORIG), await serve(NEW)]; const b = await chromium.launch({ executablePath: exe }); const res = [];
try {
  for (const s of SERVERS) {
    const ctx = await b.newContext({ timezoneId: 'Asia/Bangkok', locale: 'th-TH', serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)|supabase|workers\.dev|cdn\./, r => r.abort());
    await p.clock.install({ time: FIXED }); await p.goto(`http://127.0.0.1:${s.address().port}/index.html`); await p.waitForTimeout(2500);
    const ready = await p.evaluate(() => typeof occursOn === 'function' && typeof chartData === 'function'); if (!ready) { console.error('ฟังก์ชันไม่พร้อมบนพอร์ต', s.address().port, errs.slice(0, 2)); process.exit(2); }
    res.push({ out: await p.evaluate(probe, [ITEMS, DATES]), errs }); await ctx.close();
  }
} finally { await b.close(); SERVERS.forEach(s => s.close()); }
const [A, N] = res.map(r => r.out); const keys = Object.keys(A); let bad = 0;
for (const k of keys) { const same = A[k] === N[k]; if (!same) bad++; console.log((same ? 'PASS ' : 'FAIL ') + k + (same ? '' : ` | JS=${A[k].slice(0, 90)} | TS=${(N[k] || '').slice(0, 90)}`)); }
const errOnly = keys.filter(k => A[k].startsWith('ERR:')); console.log(`\nฟังก์ชันที่เทียบ: ${keys.length} | ตกเพราะต่างกัน: ${bad} | ทั้งสองฝั่ง error เหมือนกัน (ไม่นับว่าเทียบได้จริง): ${errOnly.length}${errOnly.length ? ' → ' + errOnly.join(',') : ''} | pageerror JS=${res[0].errs.length} TS=${res[1].errs.length}`);
process.exit(bad || errOnly.length ? 1 : 0);

// พิสูจน์ F3.3-g12: dayLab ของ core/dates (รับ today) ให้ผลเท่าสำเนาชั้น m (อ่าน TODAY ในโมดูล) ทุกทางของข้อความ
// และยืนยันความเสี่ยง: เรียก core.dayLab(ds) โดยไม่ส่ง today ต้องให้ผลต่างจากชั้น m (พิสูจน์ว่าต้องส่ง today เสมอ)
import { build } from 'esbuild'; import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const DAT = (await build({ entryPoints: ['app/src/core/dates.ts'], bundle: true, write: false, format: 'iife', globalName: 'CoreDates', platform: 'browser', logLevel: 'silent' })).outputFiles[0].text;
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const ctx = await openAsUser(b, await makeTestUser('daylab'), { colorScheme: 'light' }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate((dat) => {
  (0, eval)(dat); const C = window.CoreDates, W = window, bad = [], n = { ok: 0 }, seen = new Set();
  const day = k => W.ymd(W.addDays(new Date(), k));
  for (const k of [-400, -30, -3, -2, -1, 0, 1, 2, 3, 30, 400]) {
    const ds = day(k), a = C.dayLab(ds, W.TODAY), m = W.dayLab(ds); seen.add(m);
    (a === m) ? n.ok++ : bad.push(`k=${k} ${ds} core=${a} m=${m}`);
  }
  for (const ds of ['', 'x', '2026-02-30', '1999-12-31']) { let a, m; try { a = C.dayLab(ds, W.TODAY); } catch (e) { a = 'ERR'; } try { m = W.dayLab(ds); } catch (e) { m = 'ERR'; } (a === m) ? n.ok++ : bad.push(`edge ${JSON.stringify(ds)} core=${a} m=${m}`); }
  const risk = [0, 1, -1].filter(k => { let a; try { a = C.dayLab(day(k)); } catch (e) { a = 'ERR'; } return a !== W.dayLab(day(k)); }).length;
  return { ok: n.ok, bad, cases: n.ok + bad.length, risk, seen: [...seen].slice(0, 6) };
}, DAT);
console.log('เทียบ', r.cases, 'กรณี | ตรงกัน', r.ok, '| ต่าง', r.bad.length, r.bad.slice(0, 5));
console.log('ทางของข้อความที่เจอ:', r.seen.join(' | '));
console.log('ความเสี่ยงยืนยัน: core.dayLab(ds) ไม่ส่ง today ต่างจากชั้น m', r.risk, 'จาก 3 วัน (ต้อง > 0)');
console.log('pageerror:', errs.length, errs);
await b.close(); process.exit(r.bad.length || errs.length || !r.risk ? 1 : 0);

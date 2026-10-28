// พิสูจน์ F3.3-g13a: esc / TYPES / remText ของ core/ ให้ผลเท่าสำเนาชั้น m ทุกทาง (ฟอร์มจะอ่านจาก core แทน window)
// เทียบบนหน้าจริงกับ window.esc / window.TYPES / window.remText | ครอบอินพุตขอบ: null undefined อักขระพิเศษ ทุกกิ่งของ remText
import { build } from 'esbuild'; import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const bundle = async (entry, name) => (await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', globalName: name, platform: 'browser', logLevel: 'silent' })).outputFiles[0].text;
const DAT = await bundle('app/src/core/dates.ts', 'CoreDates'), SCH = await bundle('app/src/core/schedule.ts', 'CoreSchedule');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const ctx = await openAsUser(b, await makeTestUser('formcore'), { colorScheme: 'light' }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate(({ dat, sch }) => {
  (0, eval)(dat); (0, eval)(sch);
  const D = window.CoreDates, S = window.CoreSchedule, W = window, bad = [], n = { ok: 0 }, tag = new Set();
  const same = (name, a, m) => { (JSON.stringify(a) === JSON.stringify(m)) ? n.ok++ : bad.push(`${name} core=${JSON.stringify(a)} m=${JSON.stringify(m)}`); };
  const run = (fn) => { try { return fn(); } catch (e) { return 'ERR:' + e.message.slice(0, 40); } };
  // esc: อักขระพิเศษทุกตัว ค่าว่าง null undefined ตัวเลข ไทย
  for (const s of ['', 'a', '<script>', '&"\'', '<>&"\'', 'ก ข ค', null, undefined, 0, 12, false, '\u00e9', 'a&amp;b', '`', '/', '=']) { same('esc(' + JSON.stringify(s) + ')', run(() => D.esc(s)), run(() => W.esc(s))); }
  // TYPES: ค่าเท่ากันทั้งก้อนและทีละคีย์
  same('TYPES', S.TYPES, W.TYPES); for (const k of Object.keys(W.TYPES)) same('TYPES.' + k, S.TYPES[k], W.TYPES[k]);
  same('TYPES keys', Object.keys(S.TYPES), Object.keys(W.TYPES));
  // remText: ทุกกิ่ง (at / 0 / หาร 1440 / หาร 60 / นาที) + ค่าขอบ
  const cases = [{ k: 'at', t: '07:30' }, { k: 'at', t: '' }, { k: 'before', m: 0 }, { k: 'before', m: 1440 }, { k: 'before', m: 2880 }, { k: 'before', m: 60 }, { k: 'before', m: 120 }, { k: 'before', m: 5 }, { k: 'before', m: 90 }, { k: 'before', m: 1 }, { k: 'before', m: 1441 }, { k: 'before', m: 10080 }];
  for (const c of cases) { const a = run(() => S.remText(c)), m = run(() => W.remText(c)); tag.add(m); same('remText(' + JSON.stringify(c) + ')', a, m); }
  return { ok: n.ok, bad, cases: n.ok + bad.length, tag: [...tag] };
}, { dat: DAT, sch: SCH });
console.log('เทียบ', r.cases, 'กรณี | ตรงกัน', r.ok, '| ต่าง', r.bad.length, r.bad.slice(0, 6));
console.log('ทางของ remText ที่เจอ:', r.tag.join(' | '));
console.log('pageerror:', errs.length, errs);
await b.close(); process.exit(r.bad.length || errs.length ? 1 : 0);

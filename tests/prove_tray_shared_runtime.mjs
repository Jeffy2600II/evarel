// พิสูจน์ F3.3-g13: ถ้า runtime ไม่ได้ตั้ง window.EvarelTray ไฟล์หน้าต้องพังดังและชี้ได้ ไม่ใช่เงียบ/ได้ HTML ผิด
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const NAV = fs.readFileSync('/tmp/evarel-repo/app/web/js/react/nav.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const ctx = await openAsUser(b, await makeTestUser('g13loud'), { colorScheme: 'light' }); const p = await ctx.newPage();
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate((code) => {
  const W = window, out = {};
  out.hasTray = !!W.EvarelTray && typeof W.EvarelTray.tray === 'function';
  out.sameClass = W.EvarelTray.TrayError === (() => { try { W.EvarelTray.tray('x', { a: W.EvarelTray.T.string }).take({ a: 1 }); } catch (e) { return e.constructor; } })();
  const keep = W.EvarelTray; delete W.EvarelTray;
  try { (0, eval)(code); out.noTray = 'ไม่พัง (ผิด: ต้องพัง)'; } catch (e) { out.noTray = 'พังดัง: ' + e.message.slice(0, 90); }
  W.EvarelTray = keep; return out;
}, NAV);
console.log('runtime เปิด EvarelTray ครบ:', r.hasTray, '| TrayError ตัวเดียวทั้งระบบ (instanceof ใช้ได้):', r.sameClass);
console.log('ไม่มี EvarelTray ->', r.noTray);
await b.close(); process.exit(r.hasTray && r.sameClass && String(r.noTray).startsWith('พังดัง') ? 0 : 1);

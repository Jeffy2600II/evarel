import { chromium } from 'playwright'; import fs from 'fs';
/* deep link บนเครือข่ายจริงทั้งหมด (ไม่ interception): ชี้ forge จริง ล็อกอินผู้ใช้ทดสอบจริง วัด 3 deep link + SW */
import { makeTestUser, seedItems, API } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('dlnet'); await seedItems(user.session, SEED_ITEMS);
const ORIGIN = 'https://evarel-app-forge.nontakorn2600.workers.dev';
let pass = 0, total = 0;
for (const [hash, want, kind] of [['#/calendar', 'ปฏิทิน', 'tab'], ['#/ai', 'AI', 'page'], ['#/settings', 'ตั้งค่า', 'page']]) {
  total++;
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Bangkok' });
  await ctx.addInitScript(([a, s]) => { window.EVAREL_API = a; localStorage.setItem('evarel-session-v2', JSON.stringify(s)); }, [API, user.session]);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 100)));
  await p.goto(ORIGIN + '/index.html' + hash);
  let st = {}; for (let i = 0; i < 60; i++) { st = await p.evaluate(() => typeof window.ACTIONS === 'object').catch(() => false); if (st === true) break; await p.waitForTimeout(250); }
  const want2 = kind === 'tab' ? () => st.tab === 'calendar' : () => st.open;
  st = {}; for (let i = 0; i < 20; i++) { st = await p.evaluate(() => ({ tab: window.UI && window.UI.tab, title: document.title, open: document.getElementById('page') && !document.getElementById('page').hidden, txt: (document.getElementById('page') && document.getElementById('page').textContent || '').slice(0, 30) })).catch(() => ({})); if (want2()) break; await p.waitForTimeout(250); }
  await p.waitForTimeout(1200);
  const okc = kind === 'tab' ? st.tab === 'calendar' && (st.title || '').includes(want) : st.open && (st.txt || '').includes(want);
  okc ? pass++ : null;
  console.log((okc ? 'PASS' : 'FAIL') + ` ${hash} -> ${JSON.stringify({ tab: st.tab, title: (st.title || '').slice(0, 16), open: st.open })}` + (errs.length ? ' errs:' + errs[0] : ''));
  await ctx.close();
}
console.log(`สรุป: ผ่าน ${pass}/${total}`);
await b.close();

/* พิสูจน์โหมด mount จริงบนเบราว์เซอร์จริง (S4 หน่วย mount จริง): DOM เนื้อจริงจาก createRoot + effect วิ่งจริง + วงจรสลับแท็บซ้ำไม่พัง */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const today = new Date(); const pad = n => String(n).padStart(2, '0');
const TD = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const cv = (id, o = {}) => ({ id, type: 'habit', title: 'ทำประจำวัน ' + id, subject: '', time: '', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: TD, end: '', skip: {}, log: {}, rem: [], ...o });
const b = await chromium.launch({ executablePath: exe }); const user = await makeTestUser('mountlive');
let fails = 0; const t = (n, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${ok ? '' : extra}`); if (!ok) fails++; };
try {
  await seedItems(user.session, [cv(101), cv(102, { type: 'event', time: '18:00', timeEnd: '19:00', repeat: { unit: 'week', every: 1, days: [today.getDay()] } })]);
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP_ORIGIN + '/index.html');
  await p.waitForSelector('main[data-react-mount="today"]', { timeout: 15000 });
  await p.waitForFunction(() => document.querySelector('main[data-react-mount="today"] section.ev-card'), null, { timeout: 15000 });
  const st = await p.evaluate(() => ({
    mount: !!document.querySelector('main[data-react-mount="today"]'),
    rows: document.querySelectorAll('main[data-react-mount] li.ev-list-item').length,
    sum: !!document.querySelector('main section.ev-sum'),
  }));
  t('today: โหมด mount จริง (data-react-mount และเนื้อ DOM จาก React)', st.mount && st.rows >= 1 && st.sum, JSON.stringify(st));
  await p.click('main li.ev-list-item .ev-check');
  await p.waitForTimeout(900);
  const afterTick = await p.evaluate(() => document.querySelector('main li.ev-list-item')?.dataset.state);
  t('today: กดติ๊กบน DOM ของ React แล้ว state ไป done', afterTick === 'done', String(afterTick));
  // วงจรสลับแท็บซ้ำ 6 รอบ (today -> calendar -> today) — ทดสอบ unmount/mount ซ้ำ
  for (let i = 0; i < 3; i++) {
    await p.click('nav button[data-tab="calendar"]');
    await p.waitForSelector('main[data-react-mount="calendar"]', { timeout: 15000 });
    await p.waitForFunction(() => document.querySelector('#fcMain [class^="fc-"]') || document.querySelector('#fcMain .fc-daygrid'), null, { timeout: 15000 });
    await p.click('nav button[data-tab="today"]');
    await p.waitForSelector('main[data-react-mount="today"] section.ev-card', { timeout: 15000 });
  }
  const cyc = await p.evaluate(() => ({ fcGone: !document.querySelector('#fcMain'), todayBack: !!document.querySelector('main[data-react-mount="today"] section.ev-sum'), calClass: document.querySelectorAll('main[data-react-mount="calendar"]').length }));
  t('วงจรสลับแท็บ 6 ครั้ง: ปฏิทินถูกทำลายเมื่อออก (effect destroy) + today กลับมาเสมอ', cyc.fcGone && cyc.todayBack && cyc.calClass === 0, JSON.stringify(cyc));
  // ปฏิทิน: สลับมุมมอง + nav บน FullCalendar ที่ mount ใน effect
  await p.click('nav button[data-tab="calendar"]');
  await p.waitForFunction(() => document.querySelector('#fcMain .fc-daygrid') || document.querySelector('#fcMain [class^="fc-"]'), null, { timeout: 15000 });
  await p.click('button[data-act="cal-nav"][data-id="next"]'); await p.waitForTimeout(600);
  const title = await p.evaluate(() => document.getElementById('calTitle')?.textContent);
  t('calendar: FullCalendar (จาก effect) + กดถัดไปได้', !!title && title.trim().length > 0, String(title));
  t('ไม่มี pageerror ตลอด', errs.length === 0, errs.slice(0, 4).join(' | '));
  console.log(`สรุป: ผ่าน ${5 - fails}/5`);
  process.exit(fails ? 1 : 0);
} finally { await b.close(); await user.cleanup(); }

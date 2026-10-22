/* เทสไลฟ์บน forge จริง (ไม่มีการ intercept): ล็อกอินผู้ใช้ทดสอบ → เปิด AI → เปิด settings ซ้อน → ย้อนกลับ */
import { chromium } from '/tmp/evarel-repo/node_modules/playwright/index.mjs';
import { makeTestUser, APP_ORIGIN } from '/tmp/evarel-repo/tests/live_user.mjs';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Bangkok' });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 60)));
const user = await makeTestUser('livedeploy');
try {
  await p.addInitScript((sess) => {
    localStorage.setItem('evarel-session-v2', JSON.stringify(sess));
  }, user.session);
  await p.goto(APP_ORIGIN + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  const bootOk = await p.evaluate(() => !!document.querySelector('.ev-nav') && typeof window.openAI === 'function');
  console.log('LIVE boot=' + bootOk + ' user=' + (await p.evaluate(() => (window.ST?.USER?.name || '').slice(0, 12))));
  await p.evaluate(() => openAI()); await p.waitForTimeout(1200);
  const afterAI = await p.evaluate(() => document.querySelectorAll('.ev-page[data-open="true"]').length);
  await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(1200);
  const afterSet = await p.evaluate(() => [...document.querySelectorAll('.ev-page[data-open="true"]')].map(e => (e.innerText || '').trim().slice(0, 8)));
  await p.evaluate(() => history.back()); await p.waitForTimeout(1200);
  const afterBack = await p.evaluate(() => [...document.querySelectorAll('.ev-page[data-open="true"]')].map(e => (e.innerText || '').trim().slice(0, 8)));
  console.log('LIVE afterAI=' + afterAI + ' afterSet=' + JSON.stringify(afterSet) + ' afterBack=' + JSON.stringify(afterBack));
  console.log('LIVE stack2=' + (afterSet.length === 2) + ' backPopsOne=' + (afterBack.length === 1) + ' errs=' + errs.length);
} finally {
  await user.cleanup();
  await b.close();
}

import { chromium } from 'playwright';
import { makeTestUser, openAsUser, APP_ORIGIN } from '../tests/live_user.mjs';
const user = await makeTestUser('dbg'); const browser = await chromium.launch();
try { const ctx = await openAsUser(browser, user);
  await ctx.addInitScript((sess) => { try { localStorage.setItem('ordivel-token', JSON.stringify(sess)); } catch (e) {} }, user.session); const page = await ctx.newPage();
  page.on('console', m => { if (m.type()==='error') console.log('ERR:', m.text().slice(0,120)); });
  await page.goto(APP_ORIGIN + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  console.log('ข้อความหน้า:', (await page.locator('body').innerText()).replace(/\s+/g,' ').slice(0,300));
  console.log('ปุ่มทั้งหมด:', await page.locator('[data-act]').evaluateAll(els=>els.map(e=>e.dataset.act).slice(0,25)));
  await page.screenshot({ path: '/tmp/dbg.png' });
} finally { await browser.close(); await user.cleanup(); }

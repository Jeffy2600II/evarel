import { chromium } from 'playwright';
import { makeTestUser, openAsUser, APP_ORIGIN } from '../tests/live_user.mjs';
const user = await makeTestUser('probe'); const browser = await chromium.launch();
try {
  const ctx = await openAsUser(browser, user);
  await ctx.addInitScript((s) => { try { localStorage.setItem('ordivel-token', JSON.stringify(s)); } catch (e) {} }, user.session);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
  await page.goto(APP_ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.click('[data-act="add"]', { timeout: 8000 }).catch(e => errs.push('คลิก + ไม่ได้: ' + e.message.slice(0,80)));
  await page.waitForTimeout(700);
  const title1 = await page.locator('#sheetTitle').innerText().catch(() => '(ไม่มีชีต)');
  const types = await page.locator('.ev-type b').allInnerTexts().catch(() => []);
  console.log('ชีตแรก:', title1, '| ปุ่มชนิด:', types.join(', '));
  if (types.length) {
    await page.locator('.ev-type').first().click({ timeout: 5000 }).catch(e => errs.push('คลิกกิจวัตรไม่ได้: ' + e.message.slice(0,80)));
    await page.waitForTimeout(800);
    const title2 = await page.locator('#sheetTitle').innerText().catch(() => '(หาย)');
    const hasForm = await page.locator('#addForm').count();
    console.log('หลังคลิกกิจวัตร -> ชีต:', title2, '| มีฟอร์ม:', hasForm);
  }
  const upd = await page.evaluate(() => { if (typeof window.__evShowUpdate !== 'function') return 'ไม่มีตัวเปิดกล่องอัปเดต'; window.__evShowUpdate(); const b = document.getElementById('evUpd'); return b && b.dataset.open === 'true' ? 'กล่องอัปเดตเปิดได้: ' + b.innerText.replace(/\s+/g, ' ') : 'กล่องอัปเดตไม่เปิด'; });
  console.log('อัปเดต:', upd);
  console.log('ข้อผิดพลาด:', errs.length ? errs : 'ไม่พบ');
} finally { await browser.close(); await user.cleanup(); }

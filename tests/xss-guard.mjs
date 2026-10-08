import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const browser = await chromium.launch({ executablePath: process.env.CH });
const page = await (await browser.newContext({ viewport: { width: 412, height: 900 }, timezoneId: 'Asia/Bangkok' })).newPage();
const alerts = []; page.on('dialog', d => { alerts.push(d.message()); d.dismiss(); });
await page.route('**/fonts.*/**', r => r.abort());
await page.goto(pathToFileURL('/app/conversations/6ac77d8632a1ea4bea84b135/evarel/app/index.html').href);
await page.waitForTimeout(800);
const evil = ['<b>XSS</b>', '<img src=x onerror=alert(1)>', '"><script>alert(2)</script>'];
for (const t of evil) {
  await page.click('#fab'); await page.waitForTimeout(100);
  await page.fill('input[name="title"]', t);
  await page.click('#addForm button[type="submit"]'); await page.waitForTimeout(100);
}
await page.click('[data-tab="all"]'); await page.waitForTimeout(200);
const injected = await page.locator('.ev-main b b, .ev-main img, .ev-main script').count();
const text = await page.locator('.ev-main').innerText();
// AI mock
await page.click('[data-act="ai"]'); await page.fill('#aiText', 'เพิ่มงาน <img src=x onerror=alert(3)>'); await page.click('[data-act="send"]');
await page.waitForTimeout(200);
const aiInjected = await page.locator('#chat img').count();
console.log(JSON.stringify({ injected_elements: injected, shows_literal_text: text.includes('<b>XSS</b>'), ai_injected: aiInjected, alerts_fired: alerts }));
await browser.close();

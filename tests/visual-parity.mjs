import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const base = '/app/conversations/6ac77d8632a1ea4bea84b135/evarel';
const targets = { demo: base + '/design/master-demo-v2.html', split: base + '/app/index.html' };
const browser = await chromium.launch({ executablePath: process.env.CH });
for (const scheme of ['light', 'dark']) {
  for (const [name, path] of Object.entries(targets)) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, colorScheme: scheme, timezoneId: 'Asia/Bangkok' });
    const page = await ctx.newPage();
    await page.route('**/fonts.*/**', r => r.abort());
    await page.goto(pathToFileURL(path).href); await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'}); await page.waitForTimeout(1200);
    for (const tab of ['today', 'all', 'schedule', 'stats']) {
      await page.click(`[data-tab="${tab}"]`); await page.waitForTimeout(150);
      await page.screenshot({ path: `p2-${scheme}-${name}-${tab}.png` });
    }
    await ctx.close();
  }
}
await browser.close();

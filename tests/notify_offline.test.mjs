import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, API, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const U = process.argv[2] || (APP_ORIGIN + '/index.html');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/'; const exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + ' :: ' + String(e.message || e).slice(0, 180)); } };
const eq = (a, c, m = '') => { if (JSON.stringify(a) !== JSON.stringify(c)) throw new Error(m + ' ได้ ' + JSON.stringify(a) + ' ควรเป็น ' + JSON.stringify(c)); };
const user = await makeTestUser('offline'); await seedItems(user.session, SEED_ITEMS);
let exitCode = 0;
try {
const ctx = await openAsUser(b, user, { serviceWorkers: 'allow' });
await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
await p.goto(U); await p.waitForSelector('[data-tab="all"]', { timeout: 15000 }); await p.waitForTimeout(4500);
await t('O1 Service Worker ลงทะเบียนและควบคุมหน้า', async () => eq(await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active), true));
await t('O2 แคชมีเครื่องยนต์ (โมดูลแจ้งเตือน / บันเดิล Next)', async () => { const has = await p.evaluate(async () => {
  /* เส้นทางเดิม: js/m/services__notify.js อยู่ในแคช | build Next: ไม่มี js/m — ตรวจ chunk ทุกอันที่หน้าอ้างถูกแคชแทน (seam เดียวกัน: เครื่องยนต์ใช้ออฟไลน์ได้) */
  const scripts = [...document.scripts].filter((s) => s.src).map((s) => new URL(s.src).pathname);
  for (const k of await caches.keys()) { const c = await caches.open(k); const keys = (await c.keys()).map((r) => new URL(r.url).pathname);
    if (keys.some((u) => u.includes('services__notify.js'))) return true;
    if (!scripts.some((x) => x.includes('/js/m/')) && scripts.length > 0 && scripts.every((x) => keys.includes(x))) return true; }
  return false; }); eq(has, true); });
await p.reload(); await p.waitForTimeout(1500);
await ctx.setOffline(true);
await p.reload(); await p.waitForTimeout(2500);
await t('O3 ออฟไลน์: รีโหลดแล้วแอปบูตขึ้นหน้าหลัก', async () => eq(await p.locator('[data-tab="all"]').count(), 1));
await t('O4 ออฟไลน์: โมดูลแจ้งเตือนโหลดแล้ว (ฟังก์ชันพร้อม)', async () => eq(await p.evaluate(() => typeof notifyState + typeof checkNotify + typeof countNotifiable), 'functionfunctionfunction'));
await p.click('[data-act="add"]'); await p.click('[data-act="dtype"][data-id="task"]'); await p.waitForSelector('#addForm'); await p.waitForTimeout(400);
await p.click('[data-act="dopen"][data-id="rem"]'); await p.waitForTimeout(400);
await t('O5 ออฟไลน์: ฟอร์มแสดงสวิตช์ (เปิดตามค่าเริ่มต้น) และชิปล่วงหน้า 4 ตัว', async () => { eq(await p.locator('.ev-panel[data-key="rem"] .ev-switch').getAttribute('aria-checked'), 'true'); eq(await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').count(), 4); });
await p.fill('input[name="title"]', 'ออฟไลน์'); await p.fill('input[name="time"]', '07:15'); await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(0).click(); await p.waitForTimeout(200);
await p.click('button[type="submit"][form="addForm"]'); await p.waitForTimeout(900);
await t('O6a ออฟไลน์: กดบันทึกแล้วไม่ crash ผู้ใช้ได้ข้อความล้มเหลว และรายการไม่ค้างบนหน้าจอ', async () => {
  await p.waitForTimeout(1500);
  const toast = await p.evaluate(() => (document.getElementById('toast') || document.querySelector('[role="status"]') || document.body).innerText);
  eq(toast.includes('บันทึกไม่สำเร็จ'), true, 'ควรเห็นข้อความล้มเหลว');
  eq(await p.evaluate(() => S.items.some((x) => x.title === 'ออฟไลน์')), false, 'รายการต้องถูกย้อนกลับ ไม่ค้างหน้าจอ');
});
await ctx.setOffline(false); await p.waitForTimeout(800);
await t('O6b กลับออนไลน์: บันทึกซ้ำสำเร็จ และฐานข้อมูลจริง (ผ่าน API) เก็บ time/rem ถูกต้อง', async () => {
  await p.reload(); await p.waitForSelector('[data-tab="all"]', { timeout: 15000 }); await p.waitForTimeout(3500);
  await p.click('[data-act="add"]'); await p.click('[data-act="dtype"][data-id="task"]'); await p.waitForSelector('#addForm'); await p.waitForTimeout(400);
  await p.click('[data-act="dopen"][data-id="rem"]'); await p.waitForTimeout(400);
  await p.fill('input[name="title"]', 'ออฟไลน์'); await p.fill('input[name="time"]', '07:15');
  await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(0).click(); await p.waitForTimeout(200);
  await p.click('button[type="submit"][form="addForm"]'); await p.waitForTimeout(3500);
  const rows = await (await fetch(API + '/api/items', { headers: { Authorization: 'Bearer ' + user.session.access_token } })).json();
  const it = rows.items.find((x) => x.title === 'ออฟไลน์');
  eq(it && it.time, '07:15');
  eq(it.rem.map((r) => r.m).sort((a, c) => a - c), [0, 10]);
});
await t('O7 ไม่มี error ของหน้าเว็บ (ออฟไลน์)', async () => eq(errs, []));
} catch (e) { console.log("FAIL exception " + String(e.message || e).slice(0, 200)); exitCode = 1; }
finally { try { await ctx.setOffline(false); } catch {} await b.close(); console.log("ลบผู้ใช้ทดสอบ ->", await user.cleanup()); console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail || exitCode ? 1 : 0); }

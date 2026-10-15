/* เทสต์ฟอร์มแจ้งเตือนในเบราว์เซอร์จริง (evarel-notify-default ส่วน B) | ใช้ session จำลองแบบเดียวกับชุด route/feature เดิม
   ค่าคาดหวังมาจากสเปก D1-D6 ไม่ได้คำนวณจากโค้ด | รัน: node tests/notify_form.test.mjs [url]  (ค่าเริ่มต้น http://localhost:8776/index.html) */
import { chromium } from 'playwright';
import fs from 'fs';
const U = process.argv[2] || 'http://localhost:8776/index.html';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
let pass = 0, fail = 0; const t = async (n, fn) => { try { await fn(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + ' :: ' + String(e.message || e).slice(0, 200)); } };
const eq = (a, c, m = '') => { if (JSON.stringify(a) !== JSON.stringify(c)) throw new Error(m + ' ได้ ' + JSON.stringify(a) + ' ควรเป็น ' + JSON.stringify(c)); };
const SEED = [
  { id: 1760100000001, type: 'task', title: 'มีเวลา', subject: '', time: '09:00', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-12', end: '', skip: {}, rem: [{ k: 'before', m: 0 }], log: {} },
  { id: 1760100000002, type: 'task', title: 'ไม่มีเวลา', subject: '', time: '', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-12', end: '', skip: {}, rem: [{ k: 'before', m: 0 }], log: {} },
  { id: 1760100000003, type: 'task', title: 'ปิดเตือน', subject: '', time: '10:00', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-12', end: '', skip: {}, rem: [], log: {} },
];
async function fresh() {
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Bangkok' }); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.addInitScript((S) => { if (!localStorage.getItem('evarel-demo-session')) { localStorage.setItem('evarel-demo-users', JSON.stringify([{ id: 'u_test', name: 'N', email: 'd@g.com', provider: 'google' }])); localStorage.setItem('evarel-demo-session', 'u_test'); localStorage.setItem('evarel-demo-v3:u_test', JSON.stringify({ items: S })); } }, SEED);
  await p.goto(U); await p.waitForSelector('[data-tab="all"]', { timeout: 8000 }); await p.waitForTimeout(500); return p;
}
const openAdd = async (p, type = 'task') => { await p.click('[data-act="add"]'); await p.waitForSelector(`[data-act="dtype"][data-id="${type}"]`, { timeout: 6000 }); await p.click(`[data-act="dtype"][data-id="${type}"]`); await p.waitForSelector('#addForm', { timeout: 6000 }); await p.waitForTimeout(400); };   // + เปิดแผ่น "เพิ่มอะไรดี" (dtype) แล้วจึงเข้าฟอร์ม
const panel = (p) => p.locator('.ev-panel[data-key="rem"]');
const openRem = async (p) => { await p.click('[data-act="dopen"][data-id="rem"]'); await p.waitForTimeout(450); };
const sw = (p) => p.locator('.ev-panel[data-key="rem"] .ev-switch[data-act="dontime"]');
const pressed = async (p) => (await p.locator('.ev-panel[data-key="rem"] [data-act="drem"][aria-pressed="true"]').allTextContents()).map((s) => s.trim());
const sumText = async (p) => (await p.locator('[data-act="dopen"][data-id="rem"] small').innerText()).replace(/\s+/g, ' ').trim();
const labelOf = async (p) => (await p.locator('[data-act="dopen"][data-id="rem"] span').first().innerText()).trim();

let p = await fresh();
await openAdd(p);
await t('F1 ป้ายแถวเรียก "แจ้งเตือน" (ศัพท์ชุดเดียวทั้งแอป ไม่ใช่ "เตือน")', async () => eq(await labelOf(p), 'แจ้งเตือน'));
await t('F2 ฟอร์มใหม่: สรุปบอก "ตรงเวลา" เป็นค่าเริ่มต้น', async () => eq(await sumText(p), 'ตรงเวลา'));
await openRem(p);
await t('F3 ในแผงมีสวิตช์ "แจ้งเตือนตรงเวลา" และเปิดเป็นค่าเริ่มต้น', async () => { eq(await sw(p).count(), 1, 'จำนวนสวิตช์'); eq(await sw(p).getAttribute('aria-checked'), 'true'); });
await t('F4 ชิปเตือนล่วงหน้ามี 4 ตัว ไม่มี "ตรงเวลา" ปนเป็นชิป', async () => { const all = (await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').allTextContents()).map((s) => s.trim()); eq(all, ['ก่อน 10 นาที', 'ก่อน 30 นาที', 'ก่อน 1 ชม.', 'ก่อน 1 วัน']); });
await t('F5 เริ่มต้นไม่มีชิปล่วงหน้าถูกเลือก', async () => eq(await pressed(p), []));
await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(0).click(); await p.waitForTimeout(250);
await t('F6 กดชิป 10 นาที -> ถูกเลือก สรุปเป็น "ตรงเวลา, ก่อน 10 นาที"', async () => { eq(await pressed(p), ['ก่อน 10 นาที']); eq(await sumText(p), 'ตรงเวลา, ก่อน 10 นาที'); });
await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(3).click(); await p.waitForTimeout(250);
await t('F7 เลือกหลายชิปได้ (10 นาที + 1 วัน)', async () => eq(await pressed(p), ['ก่อน 10 นาที', 'ก่อน 1 วัน']));
await sw(p).click(); await p.waitForTimeout(250);
await t('F8 ปิดสวิตช์ตรงเวลา -> สวิตช์ปิด คงชิปล่วงหน้าไว้ สรุปไม่มี "ตรงเวลา"', async () => { eq(await sw(p).getAttribute('aria-checked'), 'false'); eq(await pressed(p), ['ก่อน 10 นาที', 'ก่อน 1 วัน']); eq((await sumText(p)).includes('ตรงเวลา'), false, 'สรุป: ' + (await sumText(p))); });
await sw(p).click(); await p.waitForTimeout(250);
await t('F9 เปิดสวิตช์กลับ -> ตรงเวลากลับมา ชิปล่วงหน้ายังอยู่', async () => { eq(await sw(p).getAttribute('aria-checked'), 'true'); eq((await sumText(p)).startsWith('ตรงเวลา'), true); eq((await pressed(p)).length, 2); });
await p.close();

// ปิดทั้งหมดแล้วสรุป "ปิด"
p = await fresh(); await openAdd(p); await openRem(p); await sw(p).click(); await p.waitForTimeout(250);
await t('F10 ปิดตรงเวลาและไม่มีล่วงหน้า -> สรุป "ปิด" (ไม่ใช่ "ไม่เตือน" เดิม)', async () => eq(await sumText(p), 'ปิด'));
await p.close();

// บังคับใส่เวลา
p = await fresh(); await openAdd(p); await p.fill('input[name="title"]', 'ทดสอบบังคับเวลา');
const save = async (p) => { await p.click('button[type="submit"][form="addForm"]'); await p.waitForTimeout(500); };   // ฟอร์มจริงส่งผ่าน submit ของ #addForm (24-actions.js:106)
await t('F11 เปิดแจ้งเตือน (ค่าเริ่มต้น) แต่ไม่ใส่เวลา กดบันทึก -> ไม่บันทึก แสดงข้อความภาษาไทยให้ใส่เวลา', async () => { await save(p); const err = (await p.locator('.ev-form-err').allTextContents()).join(' '); eq(/เวลา/.test(err) && /แจ้งเตือน/.test(err), true, 'ข้อความ: ' + err); eq(await p.locator('.ev-form-err[role="alert"]').count(), 1); });
await t('F12 รายการไม่ถูกสร้างเมื่อบันทึกไม่ผ่าน (ยังเป็น 3 รายการเดิม)', async () => { const n = await p.evaluate(() => JSON.parse(localStorage.getItem('evarel-demo-v3:u_test')).items.length); eq(n, 3); });
await p.fill('input[name="time"]', '14:30'); await save(p);
await t('F13 ใส่เวลาแล้วบันทึกได้ ได้ rem = [ตรงเวลา]', async () => { const it = await p.evaluate(() => JSON.parse(localStorage.getItem('evarel-demo-v3:u_test')).items.find((x) => x.title === 'ทดสอบบังคับเวลา')); eq(it && it.time, '14:30'); eq(it.rem, [{ k: 'before', m: 0 }]); });
await p.close();

p = await fresh(); await openAdd(p); await p.fill('input[name="title"]', 'ปิดเตือนไม่ต้องมีเวลา'); await openRem(p); await sw(p).click(); await p.waitForTimeout(250); await save(p);
await t('F14 ปิดแจ้งเตือนแล้ว ไม่ใส่เวลาก็บันทึกได้ ได้ rem = []', async () => { const it = await p.evaluate(() => JSON.parse(localStorage.getItem('evarel-demo-v3:u_test')).items.find((x) => x.title === 'ปิดเตือนไม่ต้องมีเวลา')); eq(!!it, true, 'ไม่ถูกสร้าง'); eq(it.rem, []); eq(it.time, ''); });
await p.close();

p = await fresh(); await openAdd(p); await p.fill('input[name="title"]', 'ล่วงหน้าอย่างเดียวไม่มีเวลา'); await openRem(p); await sw(p).click(); await p.waitForTimeout(200); await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(1).click(); await p.waitForTimeout(200); await save(p);
await t('F15 ปิดตรงเวลาแต่เปิดล่วงหน้า 30 นาที โดยไม่มีเวลา -> ไม่บันทึก (นับถอยหลังจากเวลาไม่ได้)', async () => { const err = (await p.locator('.ev-form-err').allTextContents()).join(' '); eq(/เวลา/.test(err), true, 'ข้อความ: ' + err); });
await p.close();

// แก้ไขรายการเดิม 3 แบบ (ข้อมูลจริงทั้ง 3 รูปแบบ)
const openEdit = async (p, title) => { await p.click('[data-tab="all"]'); await p.waitForTimeout(400); await p.locator('[data-act="detail"]', { hasText: title }).first().click(); await p.waitForTimeout(600); await p.click('[data-act="d-more"]'); await p.waitForTimeout(400); await p.click('[data-act="m-edit"]'); await p.waitForSelector('#addForm', { timeout: 6000 }); await p.waitForTimeout(400); };   // รายละเอียด -> ตัวเลือก -> แก้ไขการตั้งค่า
p = await fresh(); await openEdit(p, 'ไม่มีเวลา');
await t('F16 แก้รายการเดิมที่เปิดแจ้งเตือนแต่ไม่มีเวลา (ข้อมูลจริง 8 รายการ) -> สวิตช์เปิด และบันทึกโดยไม่ใส่เวลาไม่ได้', async () => { await openRem(p); eq(await sw(p).getAttribute('aria-checked'), 'true'); await save(p); const err = (await p.locator('.ev-form-err').allTextContents()).join(' '); eq(/เวลา/.test(err), true, 'ข้อความ: ' + err); });
await p.close();
p = await fresh(); await openEdit(p, 'ปิดเตือน'); await openRem(p);
await t('F17 แก้รายการเดิมที่ปิดแจ้งเตือน (rem ว่าง) -> สวิตช์ปิด สรุป "ปิด" ไม่เติมกลับเอง', async () => { eq(await sw(p).getAttribute('aria-checked'), 'false'); eq(await sumText(p), 'ปิด'); });
await p.close();
// ป้ายช่องเวลา: ต้องไม่บอกว่า "ไม่บังคับ" เพราะบังคับเมื่อเปิดแจ้งเตือน (ศัพท์ต้องไม่ขัดกับกฎ) ครอบคลุมทุกชนิดที่มีช่องเวลา
for (const [ty, lab] of [['task', 'เวลา'], ['habit', 'เวลา'], ['event', 'เริ่ม']]) {
  p = await fresh(); await openAdd(p, ty);
  await t(`F19-${ty} ช่องเวลาของ ${ty} ไม่มีคำว่า "ไม่บังคับ" (บังคับเมื่อเปิดแจ้งเตือน)`, async () => { const txt = (await p.locator('#addForm').innerText()).replace(/\s+/g, ' '); eq(txt.includes('เวลา (ไม่บังคับ)'), false, 'ยังมี "เวลา (ไม่บังคับ)"'); eq(txt.includes(lab), true, 'ไม่พบป้าย ' + lab); });
  await p.close();
}
// ธงแก้ไข: แก้แผงแจ้งเตือนแล้วปิดฟอร์ม ต้องขึ้นกล่องยืนยัน ไม่ใช่ทิ้งการแก้เงียบๆ (ทั้งสวิตช์และชิป)
for (const [name, act] of [['สวิตช์ตรงเวลา', async (p) => p.locator('.ev-panel[data-key="rem"] .ev-switch[data-act="dontime"]').click()], ['ชิปล่วงหน้า', async (p) => p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').first().click()]]) {
  p = await fresh(); await openAdd(p); await openRem(p); await act(p); await p.waitForTimeout(250);
  await p.locator('#sheet [data-act="close"]').first().click(); await p.waitForTimeout(600);
  await t(`F20 แก้ ${name} แล้วปิดฟอร์ม -> ขึ้นกล่อง "ทิ้งการเปลี่ยนแปลง?" (ไม่ทิ้งเงียบ)`, async () => eq(await p.locator('[data-act="cf-ok"]').count(), 1));
  await p.close();
}
p = await fresh();
await t('F18 ไม่มี error ของหน้าเว็บตลอดการทดสอบ', async () => eq(p.errs, []));
await b.close();
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

/* ตัวทดสอบการโต้ตอบของหน้ารายการ (VIEWS.all): กดจริงบน DOM แล้วอ่านผลจากสถานะ UI/ST และเลเยอร์ที่เปิด
   ประตู 9 ชุดมีภาพของหน้านี้แต่ไม่กดปุ่ม จึงใช้ตัวนี้จับกรณีที่ markup ตรงเป๊ะแต่ปุ่มทำงานผิด (React เป็นเจ้าของ markup ของหน้านี้)
   ใช้: node tests/all_interact.test.mjs  (ต้องมี http.server พอร์ต 8779 เสิร์ฟ app/web ตอบ 200)  ผล: exit 1 ถ้ามีข้อใดตก */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('allint');
const res = [], t = (name, ok, detail = '') => res.push({ name, ok: !!ok, detail });
try {
  const mk = (id, type, title, extra) => ({ id, type, title, subject: '', time: '', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: '2026-10-01', end: '', skip: {}, rem: [], log: {}, ...extra });
  await seedItems(user.session, [mk(9101, 'habit', 'กิจวัตรทดสอบ'), mk(9102, 'task', 'งานทดสอบ', { repeat: { unit: 'none', every: 1, days: [] } }), mk(9103, 'event', 'กิจกรรมทดสอบ', { repeat: { unit: 'none', every: 1, days: [] }, time: '09:30', timeEnd: '10:30' })]);
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3800);
  const openLayers = () => p.evaluate(() => ['sheet', 'page', 'dialog'].filter(id => document.getElementById(id)?.dataset.open === 'true'));
  const heads = () => p.evaluate(() => [...document.querySelectorAll('h3.ev-group')].map(h => h.firstChild?.textContent?.trim() + ':' + h.querySelector('span')?.textContent));
  const press = async (sel) => { try { await p.click(sel, { timeout: 4000 }); return true } catch (e) { t('กดปุ่มไม่ได้: ' + sel, false, String(e.message).split('\n')[0]); return false } };
  await p.evaluate(() => { location.hash = '#/all' });
  await p.waitForFunction(() => document.querySelector('h3.ev-group'), null, { timeout: 8000 }).catch(() => null); await p.waitForTimeout(400);
  const h0 = await heads(); t('หน้ารายการแสดงหัวข้อครบ 3 ชนิดพร้อมจำนวน', h0.length === 3 && h0.join('|').includes('กิจวัตร:1') && h0.join('|').includes('งาน:1') && h0.join('|').includes('กิจกรรม:1'), JSON.stringify(h0));
  const sub = await p.evaluate(() => [...document.querySelectorAll('li.ev-list-item')].map(l => l.querySelector('.ev-sub')?.textContent));
  t('ข้อความย่อยของแถวมีเวลาเมื่อตั้งไว้ และไม่มีเมื่อไม่ได้ตั้ง', sub.some(x => x?.includes('09:30–10:30')) && sub.some(x => x?.startsWith('ทุกวัน') && !x.includes('·  ')), JSON.stringify(sub));
  // กรองชนิด: pills data-act="type"
  await press('[data-act="type"][data-id="task"]'); await p.waitForTimeout(500);
  const h1 = await heads(); t('กรองชนิด "งาน": เหลือหัวข้อเดียว', h1.length === 1 && h1[0].startsWith('งาน'), JSON.stringify(h1));
  await press('[data-act="type"][data-id="event"]'); await p.waitForTimeout(500);
  const h2 = await heads(); t('กรองชนิด "กิจกรรม": เหลือหัวข้อเดียว', h2.length === 1 && h2[0].startsWith('กิจกรรม'), JSON.stringify(h2));
  await press('[data-act="type"][data-id="all"]'); await p.waitForTimeout(500);
  t('กลับ "ทั้งหมด": กลับมา 3 หัวข้อ', (await heads()).length === 3);
  // ปุ่ม + เพิ่ม: ต้องเปิดฟอร์มของชนิดนั้น
  for (const [k, label] of [['habit', 'กิจวัตร'], ['task', 'งาน'], ['event', 'กิจกรรม']]) {
    if (await press(`[data-act="add-type"][data-id="${k}"]`)) { await p.waitForTimeout(600);
      const st = await p.evaluate(() => ({ type: ST.D?.type, layers: ['sheet', 'page', 'dialog'].filter(id => document.getElementById(id)?.dataset.open === 'true') }));
      t(`ปุ่ม + ของ${label}: เปิดฟอร์มชนิด ${k}`, st.type === k && st.layers.length >= 1, JSON.stringify(st));
      await p.keyboard.press('Escape'); await p.waitForTimeout(600); /* ตรวจจริง 17 ต.ค. 2026: Escape ปิดฟอร์มและกลับ #/all เอง ห้ามสั่ง history.back() ซ้ำ ไม่งั้นถอยไป #/today */
      t(`หลังปิดฟอร์ม${label}: ยังอยู่หน้ารายการและไม่มีชั้นค้าง`, (await p.evaluate(() => location.hash)) === '#/all' && (await openLayers()).length === 0, await p.evaluate(() => location.hash));
      if ((await openLayers()).length) { await p.evaluate(() => { document.querySelector('[data-act="close"],[data-act="dback"]')?.click() }); await p.waitForTimeout(400) } }
  }
  // กดแถว: เปิดรายละเอียดของรายการนั้น
  if (await press('[data-act="detail"][data-id="9102"]')) { await p.waitForTimeout(800);
    const dt = await p.evaluate(() => ({ layers: ['sheet', 'page', 'dialog'].filter(id => document.getElementById(id)?.dataset.open === 'true'), text: (document.getElementById('page')?.textContent || '') + (document.getElementById('sheet')?.textContent || '') }));
    t('กดแถว "งานทดสอบ": เปิดรายละเอียดที่มีชื่อรายการนั้น', dt.layers.length >= 1 && dt.text.includes('งานทดสอบ'), JSON.stringify({ layers: dt.layers, hasTitle: dt.text.includes('งานทดสอบ') })); }
  t('ไม่มี pageerror ตลอดกระบวนการ', errs.length === 0, errs.join(' | '));
} finally { await b.close(); console.log('cleanup', await user.cleanup()); }
for (const r of res) console.log(JSON.stringify(r)); const bad = res.filter(r => !r.ok); console.log(`สรุป: ผ่าน ${res.length - bad.length}/${res.length}`); process.exit(bad.length ? 1 : 0);

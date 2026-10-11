// ประตูพฤติกรรมตัวแปรร่วม (evarel-ts-1c): ขับแอปจริงให้ตัวแปรทั้ง 10 ตัวถูก "เขียน" แล้วอ่านกลับ เทียบ ต้นฉบับ (ตัวแปรเดิม) กับ ใหม่ (ST.x)
// ไม่ใช่ดูภาพ แต่ยืนยันว่าค่าที่เขียนถูกเก็บและอ่านได้ตรงกัน ในสถานะเดียวกัน
import { chromium } from 'playwright'; import fs from 'fs';
const [,, A, B] = process.argv;
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const NAMES = ['sheetMode','drag','popBtn','D','TM','focusId','CH','DETAIL','DV','swipeX'];
async function run(url, isNew) {
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, hasTouch: true }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 90)));
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js') }));
  const SEED = (0, eval)(fs.readFileSync('/tmp/evarel-repo/tests/_seed_items.json.js', 'utf8'));
  await p.goto(url); await p.waitForTimeout(500); await p.evaluate(() => localStorage.clear());
  await p.evaluate((SEED) => { const u = { id: 'u_test', name: 'N', email: 'a@b.c', provider: 'google' }; localStorage.setItem('evarel-demo-users', JSON.stringify([u])); localStorage.setItem('evarel-demo-session', 'u_test'); localStorage.setItem('evarel-demo-v3:u_test', JSON.stringify({ items: SEED })); }, SEED);
  await p.reload(); await p.waitForTimeout(1800);
  // อ่านตัวแปรร่วมทั้ง 10 ตัวเป็น JSON ที่เทียบได้ (ตัด DOM node เหลือแท็ก)
  const read = () => p.evaluate(({ isNew, NAMES }) => {
    const g = n => isNew ? ST[n] : (0, eval)(n);
    const f = v => v instanceof Element ? '<' + v.tagName + '>' : (typeof v === 'object' && v !== null ? JSON.parse(JSON.stringify(v, (k, x) => x instanceof Element ? '<' + x.tagName + '>' : x)) : v);
    const o = {}; for (const n of NAMES) { try { o[n] = f(g(n)) } catch (e) { o[n] = 'ERR:' + e.message.slice(0, 40) } } return o;
  }, { isNew, NAMES });
  const snaps = {}; const snap = async k => { snaps[k] = await read(); };
  const act = async (sel, w = 500) => { try { await p.click(sel, { timeout: 1500 }); } catch (e) { errs.push('คลิกไม่ได้ ' + sel) } await p.waitForTimeout(w); };
  await snap('1.เริ่มต้น');
  await act('[data-act="add"]'); await snap('2.เปิดฟอร์มเพิ่ม (sheetMode,D)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); await snap('3.ปิดฟอร์ม');
  await act('[data-act="ai-open"], [data-act="ai"]'); await snap('4.เปิด AI (CH)');
  await act('[data-act="ai-new"]'); await snap('5.แชตใหม่ (CH)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = '#/all' }); await p.waitForTimeout(600);
  const rows = await p.$$('#app .ev-row, main .ev-row, .ev-list .ev-row, [data-act="detail"], [data-act="dopen"]'); snaps['0.จำนวนแถวรายการ'] = rows.length;
  await act('[data-act="detail"], [data-act="dopen"]', 700); await snap('6.เปิดรายละเอียด (DETAIL,DV)');
  await act('[data-act="d-more"]', 500); await snap('6b.เมนูเพิ่มเติมในรายละเอียด (popBtn)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(500); await snap('7.ปิดรายละเอียด');
  // ตัวจับเวลา: เริ่มโดยตรงผ่านฟังก์ชันของแอป (นิยามไว้ใน timer module) บนรายการ track=timer
  const started = await p.evaluate(() => { try { const it = (typeof S !== 'undefined' ? S.items : []).find(x => x.track === 'timer'); if (!it) return 'ไม่มีรายการ timer'; if (typeof tmStart === 'function') { tmStart(it.id); return 'tmStart'; } return 'ไม่มี tmStart'; } catch (e) { return 'ERR ' + e.message } });
  snaps['0.เริ่มจับเวลา'] = started; await p.waitForTimeout(700); await snap('8.จับเวลาทำงาน (TM,focusId)');
  // ลาก sheet (drag) ด้วย touch จริง
  await p.evaluate(() => { location.hash = '#/today' }); await p.waitForTimeout(500);
  await act('[data-act="add"]', 600); await snap('9.เปิดฟอร์มอีกครั้ง');
  const sh = await p.$('.ev-sheet, [data-sheet], .ev-layer'); if (sh) { const bb = await sh.boundingBox(); if (bb) { await p.mouse.move(bb.x + bb.width / 2, bb.y + 8); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + 60, { steps: 4 }); await snap('10.กำลังลาก (drag)'); await p.mouse.up(); await p.waitForTimeout(500); } } else snaps['0.ไม่พบ sheet'] = 1;
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // ปัดแถบสัปดาห์ (swipeX): ยิง touchstart/touchend จริงบน .ev-week ถ้ามี
  const hasWk = await p.evaluate(() => { const w = document.querySelector('.ev-week'); if (!w) return false; const r = w.getBoundingClientRect(); const mk = (t, x) => new TouchEvent(t, { bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [new Touch({ identifier: 1, target: w, clientX: x, clientY: r.top + 5 })], changedTouches: [new Touch({ identifier: 1, target: w, clientX: x, clientY: r.top + 5 })] }); w.dispatchEvent(mk('touchstart', r.left + 200)); return true; });
  snaps['0.มี .ev-week'] = hasWk; await snap('11.เริ่มปัดสัปดาห์ (swipeX)');
  await p.close(); return { snaps, errs };
}
const ra = await run(A, false), rb = await run(B, true); await b.close();
// ฟิลด์เดียวที่ตัดออกจากการเทียบ: drag.t = performance.now() (นาฬิกาจริง ต่างกันทุกรอบรัน ยืนยันจากโค้ด 09-ui__layers.js:31) แต่ต้องเป็นตัวเลขทั้งสองฝั่ง
const stripT = (o) => { const c = JSON.parse(JSON.stringify(o)); if (c && c.drag && typeof c.drag === 'object') { if (typeof c.drag.t !== 'number') c.drag.t = 'NOT-NUMBER'; else c.drag.t = 'NUM'; } return c; };
for (const r of [ra, rb]) for (const k of Object.keys(r.snaps)) if (r.snaps[k] && typeof r.snaps[k] === 'object') r.snaps[k] = stripT(r.snaps[k]);
let diff = 0; const rows = [];
for (const k of Object.keys(ra.snaps)) { const same = JSON.stringify(ra.snaps[k]) === JSON.stringify(rb.snaps[k]); if (!same) { diff++; rows.push(k + ' ต่าง: ' + JSON.stringify(ra.snaps[k]).slice(0, 120) + ' | ' + JSON.stringify(rb.snaps[k]).slice(0, 120)); } }
// ยืนยันว่าเทสต์ "เห็นการเปลี่ยนค่า" จริง (ไม่ใช่ทุกสแนปช็อตเท่ากันหมดเพราะไม่มีอะไรขยับ)
const changed = new Set(); for (const n of NAMES) { const vs = new Set(Object.values(rb.snaps).map(s => JSON.stringify(s[n]))); if (vs.size > 1) changed.add(n); }
const ok = diff === 0 && JSON.stringify(ra.errs) === JSON.stringify(rb.errs) && changed.size >= 3;
console.log(ok ? 'STATE-GATE PASS' : 'STATE-GATE FAIL', '| สแนปช็อต', Object.keys(ra.snaps).length, '| ต่างจากต้นฉบับ', diff, '| ตัวแปรที่เห็นค่าขยับจริง', changed.size + '/10:', [...changed].join(','), '| errs ต้นฉบับ', ra.errs.length, 'ใหม่', rb.errs.length);
rows.slice(0, 4).forEach(r => console.log(' ', r)); if (ra.errs.length || rb.errs.length) console.log(' errs:', JSON.stringify(ra.errs.slice(0, 3)), JSON.stringify(rb.errs.slice(0, 3)));
process.exit(ok ? 0 : 1);

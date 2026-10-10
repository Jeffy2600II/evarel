/* ทดสอบการ์ดความจำ (จำไว้/ลืม) ในเบราว์เซอร์จริง
   ล็อกอิน Supabase จริง (ผู้ใช้ทดสอบ แล้วลบ) แต่ดัก /ai/chat และ /ai/memory ด้วย page.route -> ทดสอบ UI ได้ก่อน deploy Worker */
import { chromium } from 'playwright'; import fs from 'fs';
const vals = {}; for (const l0 of fs.readFileSync('/app/.agents/.env', 'utf8').split('\n')) { let l = l0.trim().replace(/^export /, ''); const i = l.indexOf('='); if (i < 0) continue; let v = l.slice(i + 1).trim(); if (v.startsWith("$'") && v.endsWith("'")) v = v.slice(2, -1); vals[l.slice(0, i)] = v; }
const K = vals.SUPABASE_SERVICE_KEY, SB = 'https://vdbmwmmsfrgpaauzspup.supabase.co', API = 'https://evarel-api-b-test.nontakorn2600.workers.dev', APP = process.argv[2] || 'http://localhost:8779/index.html';
const adm = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/', exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); let uid, ok = true;
const t = (n, c, v = '') => { console.log(c ? 'PASS' : 'FAIL', n, v); if (!c) ok = false; };
const em = `memui${Date.now()}@example.com`, pw = 'Passw0rd!m3m1';
try {
  const u = await (await fetch(SB + '/auth/v1/admin/users', { method: 'POST', headers: adm, body: JSON.stringify({ email: em, password: pw, email_confirm: true }) })).json(); uid = u.id;
  const c = await b.newContext({ viewport: { width: 412, height: 915 } }); await c.addInitScript((a) => { window.EVAREL_API = a; }, API);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route(/fonts\./, (r) => r.abort());

  /* Worker จำลอง: คิวคำตอบของ /ai/chat + ตัวบันทึกคำขอ /ai/memory */
  let chatQueue = [], memCalls = [], memResult = { status: 200, body: { ok: true } };
  await p.route(/\/api\/ai\/chat$/, async (r) => { const j = chatQueue.shift() || { text: 'ok', proposals: [] }; await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(j) }); });
  await p.route(/\/api\/ai\/memory$/, async (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'POST, OPTIONS' } });
    memCalls.push({ body: JSON.parse(r.request().postData() || '{}'), auth: r.request().headers()['authorization'] || '' });
    if (memResult.delay) await new Promise((x) => setTimeout(x, memResult.delay));
    await r.fulfill({ status: memResult.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(memResult.body) });
  });

  await p.goto(APP); await p.waitForTimeout(800);
  await p.click('[data-act="au-go"][data-id="login"]').catch(() => {}); await p.waitForTimeout(300); await p.fill('#f-email', em); await p.fill('#f-password', pw); await p.click('button[type="submit"]');
  await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.click('[data-act="ai"]'); await p.waitForTimeout(900);
  const send = async (txt) => { await p.fill('#aiText', txt); await p.click('.ev-send'); await p.waitForTimeout(500); };
  const lastCard = () => p.locator('.ev-card').last();

  // 1) memory_save ปกติ: การ์ด "จำไว้" ไม่มีแถบเตือน, ยังไม่เรียกเครือข่ายก่อนกด
  chatQueue.push({ text: 'เตรียมไว้ให้แล้ว', proposals: [{ tool: 'memory_save', args: { fact: 'ผู้ใช้ชอบทำการบ้านตอนเช้า' }, summary: 'จำไว้: ผู้ใช้ชอบทำการบ้านตอนเช้า' }] });
  await send('จำไว้ว่าชอบทำการบ้านตอนเช้า'); await p.waitForSelector('[data-act="ai-cok"]', { timeout: 10000 });
  t('1 การ์ดจำไว้: ปุ่มเขียนว่า "จำไว้"', (await p.locator('[data-act="ai-cok"]').last().innerText()).trim() === 'จำไว้');
  t('1 ข้อความสรุปถูกต้อง', /จำไว้: ผู้ใช้ชอบทำการบ้านตอนเช้า/.test(await lastCard().innerText()));
  t('1 ไม่มีแถบเตือนข้อมูลส่วนตัวกับข้อมูลปกติ', !/ส่วนตัว/.test(await lastCard().innerText()));
  t('1 ยังไม่เรียกเครือข่ายก่อนกดยืนยัน', memCalls.length === 0);

  // 2) กดจำไว้: ยิง /ai/memory พร้อมโทเคน, body ถูกต้อง, ไม่มี confirmSensitive, การ์ด -> "จำแล้ว"
  await p.click('[data-act="ai-cok"]'); await p.waitForTimeout(900);
  t('2 ยิง /ai/memory ครั้งเดียว', memCalls.length === 1, String(memCalls.length));
  t('2 body = save + fact (ไม่มี confirmSensitive)', JSON.stringify(memCalls[0]?.body) === JSON.stringify({ op: 'save', fact: 'ผู้ใช้ชอบทำการบ้านตอนเช้า' }), JSON.stringify(memCalls[0]?.body));
  t('2 แนบโทเคน Bearer', /^Bearer .{20,}/.test(memCalls[0]?.auth || ''));
  t('2 การ์ดเป็น "จำแล้ว"', (await p.locator('.ev-chip', { hasText: 'จำแล้ว' }).count()) === 1);
  t('2 ไม่เขียนลง items (ไม่ใช่รายการ)', (await (await fetch(SB + `/rest/v1/items?user_id=eq.${uid}&select=id`, { headers: adm })).json()).length === 0);

  // 3) ข้อมูลอ่อนไหว: แถบเตือน + ส่ง confirmSensitive:true เมื่อกด
  chatQueue.push({ text: 'เตรียมไว้ให้แล้ว', proposals: [{ tool: 'memory_save', args: { fact: 'ผู้ใช้แพ้กุ้ง' }, summary: 'จำไว้: ผู้ใช้แพ้กุ้ง', sensitive: true }] });
  await send('จำไว้ว่าแพ้กุ้ง'); await p.waitForTimeout(600);
  t('3 อ่อนไหว: มีแถบเตือนส่วนตัว/บริการภายนอก', /ส่วนตัว.*ภายนอก/.test(await lastCard().innerText()));
  await p.locator('[data-act="ai-cok"]').last().click(); await p.waitForTimeout(900);
  t('3 อ่อนไหว: ส่ง confirmSensitive:true', memCalls[1]?.body?.confirmSensitive === true, JSON.stringify(memCalls[1]?.body));
  t('3 หลังกด แถบเตือนหายและเป็น "จำแล้ว"', (await p.locator('.ev-chip', { hasText: 'จำแล้ว' }).count()) === 2);

  // 4) ลืม: ปุ่ม "ลืม" + body forget + id
  chatQueue.push({ text: 'เตรียมไว้ให้แล้ว', proposals: [{ tool: 'memory_forget', args: { id: 'fact-abc123', fact: 'ผู้ใช้ชอบกาแฟ' }, summary: 'ลืม: ผู้ใช้ชอบกาแฟ' }] });
  await send('ลืมเรื่องกาแฟ'); await p.waitForTimeout(600);
  t('4 ปุ่มเขียนว่า "ลืม"', (await p.locator('[data-act="ai-cok"]').last().innerText()).trim() === 'ลืม');
  await p.locator('[data-act="ai-cok"]').last().click(); await p.waitForTimeout(900);
  t('4 body = forget + id', JSON.stringify(memCalls[2]?.body) === JSON.stringify({ op: 'forget', id: 'fact-abc123' }), JSON.stringify(memCalls[2]?.body));
  t('4 การ์ดเป็น "ลืมแล้ว"', (await p.locator('.ev-chip', { hasText: 'ลืมแล้ว' }).count()) === 1);

  // 5) ยกเลิก: ไม่เรียกเครือข่าย
  chatQueue.push({ text: 'เตรียมไว้ให้แล้ว', proposals: [{ tool: 'memory_save', args: { fact: 'ผู้ใช้ชอบดูหนัง' }, summary: 'จำไว้: ผู้ใช้ชอบดูหนัง' }] });
  const before = memCalls.length; await send('จำไว้ว่าชอบดูหนัง'); await p.waitForTimeout(600);
  await p.locator('[data-act="ai-cno"]').last().click(); await p.waitForTimeout(500);
  t('5 ยกเลิก: ไม่เรียกเครือข่าย', memCalls.length === before);
  t('5 ยกเลิก: การ์ด "ยกเลิกแล้ว"', (await p.locator('.ev-chip', { hasText: 'ยกเลิกแล้ว' }).count()) >= 1);

  // 6) เครือข่ายล้ม: การ์ด "ไม่สำเร็จ" + toast ไม่ใช่ค้าง
  memResult = { status: 502, body: { ok: false, error: 'memory_unavailable' } };
  chatQueue.push({ text: 'เตรียมไว้ให้แล้ว', proposals: [{ tool: 'memory_save', args: { fact: 'ผู้ใช้ชอบเดินเล่น' }, summary: 'จำไว้: ผู้ใช้ชอบเดินเล่น' }] });
  await send('จำไว้ว่าชอบเดินเล่น'); await p.waitForTimeout(600);
  await p.locator('[data-act="ai-cok"]').last().click(); await p.waitForTimeout(900);
  t('6 ล้ม: การ์ด "ไม่สำเร็จ"', (await p.locator('.ev-chip', { hasText: 'ไม่สำเร็จ' }).count()) === 1);

  // 7) สถานะ "กำลังบันทึก..." ระหว่างรอ + กดซ้ำไม่ยิงซ้ำ
  memResult = { status: 200, body: { ok: true }, delay: 1500 };
  chatQueue.push({ text: 'เตรียมไว้ให้แล้ว', proposals: [{ tool: 'memory_save', args: { fact: 'ผู้ใช้ชอบวาดรูป' }, summary: 'จำไว้: ผู้ใช้ชอบวาดรูป' }] });
  await send('จำไว้ว่าชอบวาดรูป'); await p.waitForTimeout(600);
  const n0 = memCalls.length; await p.locator('[data-act="ai-cok"]').last().click(); await p.waitForTimeout(300);
  t('7 ระหว่างรอ: "กำลังบันทึก..." และปุ่มหาย', (await p.locator('.ev-chip', { hasText: 'กำลังบันทึก' }).count()) === 1 && (await p.locator('[data-act="ai-cok"]').count()) === 0);
  await p.waitForTimeout(1800);
  t('7 กดครั้งเดียว ยิงครั้งเดียว', memCalls.length === n0 + 1);
  t('7 เสร็จแล้วเป็น "จำแล้ว"', (await p.locator('.ev-chip', { hasText: 'จำแล้ว' }).count()) === 3);

  // 8) รีโหลดกลางทาง: การ์ดสถานะ saving ค้างใน localStorage ต้องกลับเป็น "ไม่สำเร็จ" ไม่ใช่ค้างตลอดกาล
  await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => /chat/i.test(x)); const j = JSON.parse(localStorage.getItem(k)); const m = j.list[0].msgs.filter((x) => x.cards).pop(); m.cards[0].status = 'saving'; localStorage.setItem(k, JSON.stringify(j)); });
  await p.reload(); await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.click('[data-act="ai"]'); await p.waitForTimeout(900);
  t('8 รีโหลด: ไม่มีการ์ดค้าง "กำลังบันทึก"', (await p.locator('.ev-chip', { hasText: 'กำลังบันทึก' }).count()) === 0);
  t('9 ไม่มี pageerror', errs.length === 0, errs.join('|').slice(0, 160));
} catch (e) { console.log('ERR', String(e).slice(0, 300)); ok = false; }
finally { if (uid) { await fetch(SB + '/rest/v1/items?user_id=eq.' + uid, { method: 'DELETE', headers: adm }); await fetch(SB + '/auth/v1/admin/users/' + uid, { method: 'DELETE', headers: adm }); } await b.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1); }

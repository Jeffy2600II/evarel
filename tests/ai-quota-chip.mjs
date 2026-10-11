/* ชิปโควตา + ล็อกช่องพิมพ์ (evarel-quota-ui): ตรวจ DOM จริงในเบราว์เซอร์ ไม่ใช่ธงภายใน
   ใช้ Supabase จริงสร้างผู้ใช้ชั่วคราว, ดัก /api/ai/quota และ /api/ai/chat เพื่อคุมสถานการณ์ */
import { chromium } from 'playwright'; import fs from 'fs';
const vals = {}; for (const l0 of fs.readFileSync('/app/.agents/.env', 'utf8').split('\n')) { let l = l0.trim().replace(/^export /, ''); const i = l.indexOf('='); if (i < 0) continue; let v = l.slice(i + 1).trim(); if (v.startsWith("$'") && v.endsWith("'")) v = v.slice(2, -1); vals[l.slice(0, i)] = v; }
const K = vals.SUPABASE_SERVICE_KEY, SB = 'https://vdbmwmmsfrgpaauzspup.supabase.co', API = 'https://evarel-api-b-test.nontakorn2600.workers.dev', APP = process.argv[2] || 'http://localhost:8779/index.html';
const adm = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/', exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); let uid, ok = true;
const t = (n, c, v = '') => { console.log(c ? 'PASS' : 'FAIL', n, v); if (!c) ok = false; };
const em = `quotachip${Date.now()}@example.com`, pw = 'Passw0rd!qu0t2';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
const reset = new Date(Date.now() + 5 * 3600e3).toISOString();           // รีเซ็ตอีก 5 ชม. (เวลาจริงที่ใช้คำนวณ "ภายใน X ชม.")
const q = (calls, tokens, extra = {}) => ({ day: '2026-10-11', resetAt: reset, blocked: calls >= 40 || tokens >= 60000, ...(calls >= 40 ? { reason: 'calls' } : tokens >= 60000 ? { reason: 'tokens' } : {}), calls: { used: calls, limit: 40, remaining: Math.max(0, 40 - calls) }, tokens: { used: tokens, limit: 60000, remaining: Math.max(0, 60000 - tokens) }, ...extra });
try {
  const u = await (await fetch(SB + '/auth/v1/admin/users', { method: 'POST', headers: adm, body: JSON.stringify({ email: em, password: pw, email_confirm: true }) })).json(); uid = u.id;
  const c = await b.newContext({ viewport: { width: 412, height: 915 } }); await c.addInitScript((a) => { window.EVAREL_API = a; }, API);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route(/fonts\./, (r) => r.abort());
  let quotaNext = { status: 200, body: q(13, 21000) }, quotaHits = 0, chatHits = 0, chatNext = { status: 200, body: { text: 'ok', proposals: [] } };
  const fulfill = (r, n) => r.fulfill({ status: n.status, contentType: n.ct || 'application/json', headers: CORS, body: n.raw ?? JSON.stringify(n.body) });
  await p.route(/\/api\/ai\/quota$/, async (r) => { if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS }); quotaHits++; await fulfill(r, quotaNext); });
  await p.route(/\/api\/ai\/chat$/, async (r) => { if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS }); chatHits++; await fulfill(r, chatNext); });
  await p.goto(APP); await p.waitForTimeout(800);
  await p.click('[data-act="au-go"][data-id="login"]').catch(() => {}); await p.waitForTimeout(300); await p.fill('#f-email', em); await p.fill('#f-password', pw); await p.click('button[type="submit"]');
  await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 20000 }); await p.waitForTimeout(1200);
  const closeAI = async () => { await p.evaluate(() => document.querySelector('#page [data-act="close"]')?.click()); await p.waitForTimeout(600); };
  const open = async () => { await p.click('[data-act="ai"]'); await p.waitForTimeout(1100); };
  const chip = () => p.locator('#aiQuota');
  const dom = () => p.evaluate(() => { const t = document.getElementById('aiText'), s = document.querySelector('#aiForm .ev-send'), q = document.getElementById('aiQuota'); return { taDis: !!t?.disabled, sendDis: !!s?.disabled, sendAria: s?.getAttribute('aria-disabled'), ph: t?.placeholder || '', chipText: q?.innerText || '', chipState: q?.dataset.state || '', chipExists: !!q, form: document.getElementById('aiForm')?.dataset.locked || '' }; });

  /* A: ปกติ 13/40 -> ชิปแสดงเหลือเท่าไร ไม่มีสี ช่องพิมพ์ใช้ได้ */
  await open(); let s = await dom();
  t('A1 มีชิปโควตาเหนือช่องพิมพ์', s.chipExists);
  t('A2 ชิปบอกจำนวนที่เหลือ (27 จาก 40)', /27/.test(s.chipText) && /40/.test(s.chipText), s.chipText);
  t('A3 ปกติ: ไม่มีสีเตือน (state=ok)', s.chipState === 'ok', s.chipState);
  t('A4 ช่องพิมพ์ใช้ได้ ปุ่มส่งไม่ disabled', !s.taDis && !s.sendDis);
  t('A5 เรียกอ่านโควตาตอนเปิดแชท 1 ครั้ง', quotaHits === 1, String(quotaHits));
  /* B: แตะชิป -> แผ่นรายละเอียด */
  await chip().click(); await p.waitForTimeout(700);
  const sheetTxt = await p.locator('#sheet').innerText().catch(() => '');
  t('B1 แตะชิปเปิดแผ่นรายละเอียด', sheetTxt.length > 0, sheetTxt.slice(0, 60));
  t('B2 แผ่นแสดงทั้งจำนวนครั้งและโทเคน', /13/.test(sheetTxt) && /21[, ]?000|21,000/.test(sheetTxt), sheetTxt.replace(/\n/g, ' | ').slice(0, 160));
  t('B3 แผ่นบอกเวลารีเซ็ต', /รีเซ็ต/.test(sheetTxt), '');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  /* C: ส่งข้อความแล้วชิปอัปเดตจากคำตอบโดยไม่ยิง /quota เพิ่ม */
  chatNext = { status: 200, body: { text: 'ตอบแล้ว', proposals: [], quota: { used: 14, limit: 40, tokens: { used: 22000, limit: 60000 }, resetAt: reset } } };
  const before = quotaHits; await p.fill('#aiText', 'ทดสอบ'); await p.click('.ev-send'); await p.waitForTimeout(1200); s = await dom();
  t('C1 ชิปอัปเดตเป็น 26 หลังส่ง', /26/.test(s.chipText), s.chipText);
  t('C2 ไม่ยิง /quota เพิ่มหลังส่ง', quotaHits === before, `${before}->${quotaHits}`);
  /* D: เหลือน้อย (<=20%) -> ส้ม */
  quotaNext = { status: 200, body: q(34, 1000) }; await closeAI(); await p.waitForTimeout(600); await open(); s = await dom();
  t('D1 เหลือ 6/40 (15%) -> state=low (ส้ม)', s.chipState === 'low', s.chipState + ' ' + s.chipText);
  t('D2 ยังพิมพ์ได้', !s.taDis && !s.sendDis);
  /* D3: โทเคนใกล้หมดก่อน (calls เหลือเยอะ) -> ชิปต้องไม่โกหก */
  quotaNext = { status: 200, body: q(5, 55000) }; await closeAI(); await p.waitForTimeout(600); await open(); s = await dom();
  t('D3 โทเคนเหลือ 8% แต่ครั้งเหลือ 35 -> ชิปเตือน ไม่ใช่ "เหลือ 35 ครั้ง"', s.chipState === 'low' && !/35/.test(s.chipText) && /ขีดจำกัด/.test(s.chipText), s.chipState + ' ' + s.chipText);
  /* E: หมด -> ล็อกจริงใน DOM */
  quotaNext = { status: 200, body: q(40, 5000) }; await closeAI(); await p.waitForTimeout(600); await open(); s = await dom();
  t('E1 หมดแล้ว textarea disabled จริง', s.taDis);
  t('E2 หมดแล้วปุ่มส่ง disabled จริง + aria-disabled', s.sendDis && s.sendAria === 'true', String(s.sendAria));
  t('E3 ข้อความในช่องบอกว่าหมดและบอกเวลารีเซ็ต', /หมด/.test(s.ph + s.chipText) && /รีเซ็ต/.test(s.ph + s.chipText), s.ph + ' | ' + s.chipText);
  t('E4 chip state=out (แดง)', s.chipState === 'out', s.chipState);
  const hb = chatHits; await p.evaluate(() => { const t = document.getElementById('aiText'); t.disabled = false; t.value = 'ลองยัดข้อความ'; document.getElementById('aiForm').requestSubmit(); }); await p.waitForTimeout(900);
  t('E5 แม้ปลด disabled ด้วยมือแล้ว submit ก็ไม่ยิง /chat (ด่านฝั่งแอปซ้อน)', chatHits === hb, `${hb}->${chatHits}`);
  /* F: เซิร์ฟเวอร์ล่ม/อ่านไม่ได้ -> fail-open ซ่อนชิป ไม่ล็อก */
  quotaNext = { status: 200, body: { unknown: true, blocked: false } }; await closeAI(); await p.waitForTimeout(600); await open(); s = await dom();
  t('F1 unknown -> ไม่ล็อกช่องพิมพ์', !s.taDis && !s.sendDis);
  t('F2 unknown -> ไม่แสดงตัวเลขผิดๆ (ซ่อนชิป)', !s.chipExists || s.chipText.trim() === '', s.chipText);
  quotaNext = { status: 500, raw: 'boom', ct: 'text/plain' }; await closeAI(); await p.waitForTimeout(600); await open(); s = await dom();
  t('F3 /quota ตอบ 500 -> ไม่ล็อก', !s.taDis && !s.sendDis);
  /* G: ชน 429 ทั้งที่ชิปยังบอกว่าเหลือ (เปิดแอปค้างข้ามคืน) -> ล็อกทันที */
  quotaNext = { status: 200, body: q(10, 100) }; chatNext = { status: 429, body: { error: 'quota_exceeded', reason: 'calls', text: 'โควตาหมด', proposals: [], quota: { reason: 'calls', resetAt: reset, used: 40, limit: 40, tokens: { used: 100, limit: 60000 } } } };
  await closeAI(); await p.waitForTimeout(600); await open(); await p.fill('#aiText', 'ส่ง'); await p.click('.ev-send'); await p.waitForTimeout(1200); s = await dom();
  t('G1 ชน 429 แล้วช่องพิมพ์ล็อกทันทีโดยไม่ต้องรีเฟรช', s.taDis && s.sendDis, JSON.stringify({ ta: s.taDis, send: s.sendDis }));
  const vis = await p.evaluate(() => { const vt = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; const txt = []; for (const el of document.querySelectorAll('#aiBody *, #aiQuota, #aiForm *')) { if (el.children.length === 0 && vt(el) && /หมด|ครบ|รีเซ็ต|โควตา/.test(el.textContent || '')) txt.push((el.id || el.className || el.tagName) + ': ' + el.textContent.trim().slice(0, 60)); } return txt; });
  console.log('INFO ข้อความโควตาที่ผู้ใช้เห็นหลังชน 429 (' + vis.length + ' จุด): ' + JSON.stringify(vis));
  /* L: คอนทราสต์ตัวอักษรชิปทุกสถานะ x สองโหมด >= 4.5:1 (วัดจากสีที่คำนวณจริงบนจอ ไม่ใช่ค่าในไฟล์) */
  const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
  const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const states = { ok: q(13, 21000), low: q(34, 21000), out: q(40, 21000) };
  for (const theme of ['light', 'dark']) {
    await p.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    for (const [st, body] of Object.entries(states)) {
      quotaNext = { status: 200, body }; await closeAI(); await p.waitForTimeout(500); await open(); await p.waitForTimeout(700);
      const cc = await p.evaluate(() => { const c = document.getElementById('aiQuota'); if (!c || c.hidden) return null; const cs = getComputedStyle(c); return { fg: cs.color, bg: cs.backgroundColor, state: c.dataset.state }; });
      if (!cc) { t('L ' + theme + ' ' + st + ' มีชิปให้วัด', false, 'ไม่พบชิป'); continue; }
      const a = lum(parse(cc.fg)), b = lum(parse(cc.bg)), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      t('L ' + theme + ' ' + st + ' (state=' + cc.state + ') คอนทราสต์ >= 4.5', r >= 4.5, r.toFixed(2) + ' fg=' + cc.fg + ' bg=' + cc.bg);
    }
  }
  await p.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  /* H: ผู้ใช้ใหม่/ไม่มี overflow ในจอแคบ */
  await p.setViewportSize({ width: 320, height: 640 }); await p.waitForTimeout(400);
  const ov = await p.evaluate(() => { const q = document.getElementById('aiQuota'); if (!q) return { has: false }; const r = q.getBoundingClientRect(); return { has: true, right: r.right, w: innerWidth, sw: q.scrollWidth, cw: q.clientWidth }; });
  t('H1 จอ 320px ชิปไม่ล้นออกนอกจอ', !ov.has || (ov.right <= ov.w + 1 && ov.sw <= ov.cw + 1), JSON.stringify(ov));
  /* K: การเข้าถึง (a11y) */
  const a11y = await p.evaluate(() => { const q = document.getElementById('aiQuota'); return { role: q?.getAttribute('role'), live: q?.getAttribute('aria-live'), atomic: q?.getAttribute('aria-atomic') }; });
  t('K1 ชิปเป็น live region สุภาพ (role=status, aria-live=polite)', a11y.role === 'status' && a11y.live === 'polite' && a11y.atomic === 'true', JSON.stringify(a11y));
  quotaNext = { status: 200, body: q(13, 21000) }; await closeAI(); await open(); await p.locator('#aiQuota').click(); await p.waitForTimeout(700);
  const pbs = await p.evaluate(() => [...document.querySelectorAll('#sheet [role="progressbar"]')].map((x) => x.getAttribute('aria-label') || ''));
  t('K2 แถบความคืบหน้าทุกแถบมีชื่อกำกับ', pbs.length === 2 && pbs.every((x) => x.length > 3), JSON.stringify(pbs));
  t('Z ไม่มี JS error', errs.length === 0, errs.slice(0, 2).join('|'));
} catch (e) { console.log('FAIL exception', String(e.message).slice(0, 300)); ok = false; }
finally {
  try { await fetch(SB + '/rest/v1/items?user_id=eq.' + uid, { method: 'DELETE', headers: { ...adm, Prefer: 'return=minimal' } }); } catch {}
  try { await fetch(SB + '/auth/v1/admin/users/' + uid, { method: 'DELETE', headers: adm }); } catch {}
  await b.close(); console.log(ok ? 'ALL PASS' : 'HAS FAIL'); process.exit(ok ? 0 : 1);
}

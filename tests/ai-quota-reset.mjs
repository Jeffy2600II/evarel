import { readEnvText } from './_env.mjs';
/* ชิปโควตา + ล็อกช่องพิมพ์ (evarel-quota-ui): ตรวจ DOM จริงในเบราว์เซอร์ ไม่ใช่ธงภายใน
   ใช้ Supabase จริงสร้างผู้ใช้ชั่วคราว, ดัก /api/ai/quota และ /api/ai/chat เพื่อคุมสถานการณ์ */
import { chromium } from 'playwright'; import fs from 'fs';
const vals = {}; for (const l0 of readEnvText().split('\n')) { let l = l0.trim().replace(/^export /, ''); const i = l.indexOf('='); if (i < 0) continue; let v = l.slice(i + 1).trim(); if (v.startsWith("$'") && v.endsWith("'")) v = v.slice(2, -1); vals[l.slice(0, i)] = v; }
const K = vals.SUPABASE_SERVICE_KEY, SB = 'https://vdbmwmmsfrgpaauzspup.supabase.co', API = 'https://evarel-api-b-test.nontakorn2600.workers.dev', APP = process.argv[2] || 'http://localhost:8779/index.html';
const adm = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/', exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); let uid, ok = true;
const t = (n, c, v = '') => { console.log(c ? 'PASS' : 'FAIL', n, v); if (!c) ok = false; };
const em = `quotarst${Date.now()}@example.com`, pw = 'Passw0rd!qu0t2';
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
  
  const dom = () => p.evaluate(() => { const t = document.getElementById('aiText'), s = document.querySelector('#aiForm .ev-send'), q = document.getElementById('aiQuota'); return { taDis: !!t?.disabled, sendDis: !!s?.disabled, sendAria: s?.getAttribute('aria-disabled'), ph: t?.placeholder || '', chipText: q?.innerText || '', chipState: q?.dataset.state || '', chipExists: !!q, form: document.getElementById('aiForm')?.dataset.locked || '' }; });

  /* I1: หมดแล้ว รีเซ็ตอีก 4 วินาที -> ปลดล็อกเองโดยไม่ต้องรีเฟรช */
  const soon = new Date(Date.now() + 4000).toISOString();
  quotaNext = { status: 200, body: q(40, 100, { resetAt: soon }) };
  await open(); let s = await dom(); t('I0 เริ่มล็อกอยู่', s.taDis && s.sendDis);
  const h0 = quotaHits; quotaNext = { status: 200, body: q(0, 0) };
  await p.waitForTimeout(9000); s = await dom();
  t('I1 ถึงเวลารีเซ็ต -> ปลดล็อกช่องพิมพ์เอง', !s.taDis && !s.sendDis, JSON.stringify(s));
  t('I2 ชิปกลับเป็นปกติ เหลือ 40 จาก 40', s.chipState === 'ok' && /40/.test(s.chipText), s.chipState + ' ' + s.chipText);
  t('I3 ถามเซิร์ฟเวอร์ซ้ำจริง (ไม่เชื่อแค่นาฬิกาเครื่อง)', quotaHits > h0, `${h0}->${quotaHits}`);
  /* J: ถึงเวลาแล้วแต่เซิร์ฟเวอร์ยังตอบว่าหมด (นาฬิกาเครื่องเร็วกว่า) -> ยังล็อก และไม่ยิงถี่เป็นลูป */
  await closeAI();
  const past = new Date(Date.now() - 60000).toISOString(); quotaNext = { status: 200, body: q(40, 100, { resetAt: past }) };
  const h1 = quotaHits; await open(); await p.waitForTimeout(8000); s = await dom();
  t('J1 เซิร์ฟเวอร์ยังบอกหมด -> ยังล็อก (ไม่เชื่อนาฬิกาเครื่อง)', s.taDis && s.sendDis);
  t('J2 ไม่ยิงถี่เป็นลูป (<=4 ครั้งใน 8 วิ)', quotaHits - h1 <= 4, `${quotaHits - h1} ครั้ง`);
  t('Z ไม่มี JS error', errs.length === 0, errs.slice(0, 2).join('|'));
} catch (e) { console.log('FAIL exception', String(e.message).slice(0, 300)); ok = false; }
finally {
  try { await fetch(SB + '/rest/v1/items?user_id=eq.' + uid, { method: 'DELETE', headers: { ...adm, Prefer: 'return=minimal' } }); } catch {}
  try { await fetch(SB + '/auth/v1/admin/users/' + uid, { method: 'DELETE', headers: adm }); } catch {}
  await b.close(); console.log(ok ? 'ALL PASS' : 'HAS FAIL'); process.exit(ok ? 0 : 1);
}

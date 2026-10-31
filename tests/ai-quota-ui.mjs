import { readEnvText } from './_env.mjs';
/* ทดสอบข้อความโควตา AI (429) ในเบราว์เซอร์จริง: ล็อกอิน Supabase จริง (ผู้ใช้ทดสอบ แล้วลบ) ดัก /ai/chat ด้วย page.route */
import { chromium } from 'playwright'; import fs from 'fs';
const vals = {}; for (const l0 of readEnvText().split('\n')) { let l = l0.trim().replace(/^export /, ''); const i = l.indexOf('='); if (i < 0) continue; let v = l.slice(i + 1).trim(); if (v.startsWith("$'") && v.endsWith("'")) v = v.slice(2, -1); vals[l.slice(0, i)] = v; }
const K = vals.SUPABASE_SERVICE_KEY, SB = 'https://vdbmwmmsfrgpaauzspup.supabase.co', API = 'https://evarel-api-b-test.nontakorn2600.workers.dev', APP = process.argv[2] || 'http://localhost:8779/index.html';
const adm = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/', exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); let uid, ok = true;
const t = (n, c, v = '') => { console.log(c ? 'PASS' : 'FAIL', n, v); if (!c) ok = false; };
const em = `quotaui${Date.now()}@example.com`, pw = 'Passw0rd!qu0t1';
try {
  const u = await (await fetch(SB + '/auth/v1/admin/users', { method: 'POST', headers: adm, body: JSON.stringify({ email: em, password: pw, email_confirm: true }) })).json(); uid = u.id;
  const c = await b.newContext({ viewport: { width: 412, height: 915 } }); await c.addInitScript((a) => { window.EVAREL_API = a; }, API);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route(/fonts\./, (r) => r.abort());
  let next = null, hits = 0;
  await p.route(/\/api\/ai\/chat$/, async (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'POST, OPTIONS' } });
    hits++; const n = next || { status: 200, body: { text: 'ok', proposals: [] } };
    await r.fulfill({ status: n.status, contentType: n.ct || 'application/json', headers: { 'access-control-allow-origin': '*' }, body: n.raw ?? JSON.stringify(n.body) });
  });
  await p.goto(APP); await p.waitForTimeout(800);
  await p.click('[data-act="au-go"][data-id="login"]').catch(() => {}); await p.waitForTimeout(300); await p.fill('#f-email', em); await p.fill('#f-password', pw); await p.click('button[type="submit"]');
  await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.click('[data-act="ai"]'); await p.waitForTimeout(900);
  const send = async (txt) => { await p.fill('#aiText', txt); await p.click('.ev-send'); await p.waitForTimeout(900); };
  const page = async () => await p.locator('body').innerText();

  next = { status: 429, body: { error: 'quota_exceeded', reason: 'calls', text: 'วันนี้คุณใช้ AI ครบ 40 ครั้งแล้ว โควตาจะรีเซ็ตตอนเที่ยงคืน (00:00 น.)', proposals: [] } };
  await send('สวัสดี'); let txt = await page();
  t('1 เห็นข้อความโควตาจากเซิร์ฟเวอร์', /ครบ 40 ครั้งแล้ว/.test(txt) && /00:00/.test(txt));
  t('1 ไม่ใช่ error ทั่วไป/เชื่อมต่อไม่ได้/ใช้งานไม่ได้ชั่วคราว', !/เกิดข้อผิดพลาด|เชื่อมต่อ AI ไม่ได้|ใช้งานไม่ได้ชั่วคราว/.test(txt));
  next = { status: 429, body: { error: 'quota_exceeded', reason: 'global', text: 'วันนี้ผู้ใช้ AI เยอะมากจนระบบเต็มชั่วคราว ลองใหม่หลังเที่ยงคืน (00:00 น.) หรือพรุ่งนี้นะ', proposals: [] } };
  await send('ขอถามอีกที'); txt = await page(); t('2 ข้อความ global ต่างจาก calls', /ระบบเต็มชั่วคราว/.test(txt));
  next = { status: 429, raw: '<html>Too Many Requests</html>', ct: 'text/html' };
  await send('ทดสอบอีก'); txt = await page(); t('3 body ไม่ใช่ JSON: ข้อความสำรองเรื่องโควตา', /ครบโควตาแล้ว/.test(txt));
  next = { status: 200, body: { text: 'ตอบปกติแล้วนะ', proposals: [] } };
  await send('ลองใหม่'); txt = await page(); t('4 หลัง 429 กลับมาคุยได้', /ตอบปกติแล้วนะ/.test(txt));
  next = { status: 503, body: { error: 'ai_unavailable', text: 'ตอนนี้ AI ใช้งานไม่ได้ชั่วคราว ลองใหม่ภายหลังนะ', proposals: [] } };
  await send('ทดสอบ503'); txt = await page(); t('5 503 ยังเป็นข้อความเดิม', /ใช้งานไม่ได้ชั่วคราว/.test(txt));
  next = { status: 500, body: { error: 'ai_error' } };
  await send('ทดสอบ500'); txt = await page(); t('5 500 ยังเป็น error ทั่วไป', /เกิดข้อผิดพลาด/.test(txt));
  t('6 คำขอออกจริงครบ 6 ครั้ง', hits === 6, String(hits));
  t('7 ไม่มี pageerror', errs.length === 0, errs.join('|').slice(0, 200));
} catch (e) { console.log('ERR', String(e.stack || e).slice(0, 500)); ok = false; }
finally { if (uid) await fetch(SB + '/auth/v1/admin/users/' + uid, { method: 'DELETE', headers: adm }); await b.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1); }

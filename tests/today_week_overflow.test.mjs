/* บั๊ก: หน้า Today กดเลื่อนสัปดาห์ "ไปข้างหน้า" แล้วหน้าเว็บขยายเกินขนาดจอชั่วครู่แล้วกลับมาปกติ (เลื่อนถอยหลังไม่เป็น)
   ต้นเหตุที่สงสัย: .ev-week[data-dir="1"] ใช้ keyframes wkL เริ่มที่ translateX(+28px) ดันแถบสัปดาห์ล้นขอบ "ขวา" ซึ่งทำให้พื้นที่เลื่อนแนวนอนของเอกสารขยาย
   ส่วน data-dir="-1" (wkR) ดันไป "ซ้าย" ซึ่งเบราว์เซอร์ไม่นับเป็นพื้นที่เลื่อน จึงไม่เป็นปัญหา = ไม่สมมาตรตรงกับอาการ
   สิ่งที่วัด (สิ่งที่ผู้ใช้เห็น): ความกว้าง scroll ของเอกสาร (scrollWidth) ต้องไม่เกินความกว้างจอตลอดช่วงอนิเมชั่น ทั้งไปข้างหน้าและถอยหลัง
   รัน: node tests/today_week_overflow.test.mjs   (ต้อง build ก่อน: npm run build:web:forge, ต้องมี openssl) */
import { chromium } from 'playwright'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import https from 'node:https';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { makeTestUser, seedItems, API } from './live_user.mjs'; import { SEED_ITEMS } from './seed_items.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); const DIR = path.join(root, 'build/web');
const HOST = 'evarel-app-forge.nontakorn2600.workers.dev';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'week-overflow-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', tmp + '/k.pem', '-out', tmp + '/c.pem', '-days', '1', '-subj', '/CN=' + HOST, '-addext', 'subjectAltName=DNS:' + HOST], { stdio: 'ignore' });
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2', txt: 'text/plain' };
const srv = https.createServer({ key: fs.readFileSync(tmp + '/k.pem'), cert: fs.readFileSync(tmp + '/c.pem') }, (q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'https://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = DIR + p;
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': mime[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' }); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const PORT = srv.address().port;
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/'; const exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1:${PORT}`, '--ignore-certificate-errors'] }); let user = null;
try {
  user = await makeTestUser('weekoverflow'); await seedItems(user.session, SEED_ITEMS);
  const W = 412;
  const ctx = await b.newContext({ viewport: { width: W, height: 915 }, serviceWorkers: 'block', ignoreHTTPSErrors: true, hasTouch: true, isMobile: true });
  await ctx.addInitScript(([a, s]) => { window.EVAREL_API = a; if (s && !localStorage.getItem('evarel-session-v2')) localStorage.setItem('evarel-session-v2', JSON.stringify(s)); localStorage.setItem('evarel-perf-pref', 'full'); }, [API, user.session]);   /* โหมดอนิเมชั่น "เต็มรูปแบบ" เหมือนเครื่องจริงของ Master (เครื่องจำลองตรวจว่าช้าแล้วตัดเป็น lite ทำให้อนิเมชั่นไม่เล่นเลย = ทดสอบว่างเปล่า) */
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`https://${HOST}/index.html`); await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 25000 }); await p.waitForTimeout(2500);
  await p.waitForSelector('.ev-week', { timeout: 8000 });

  /* ตัวสุ่มตัวอย่างทุกเฟรมระหว่างอนิเมชั่น: scrollWidth ของเอกสาร/body เทียบ viewport + ตำแหน่งขวาสุดของแถบสัปดาห์ */
  const sample = async (act, label) => {
    await p.evaluate(() => { window.__w = []; window.__run = true; const vw = document.documentElement.clientWidth; const tick = () => { if (!window.__run) return; const wk = document.querySelector('.ev-week'); const r = wk ? wk.getBoundingClientRect() : null; window.__w.push({ dir: wk ? wk.dataset.dir : null, sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, vw, right: r ? Math.round(r.right) : null, cx: window.scrollX }); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await p.click(`[data-act="wk"][data-id="${act}"]`); await p.waitForTimeout(700);   /* อนิเมชั่น .32s + เผื่อ */
    const r = await p.evaluate(() => { window.__run = false; return window.__w; });
    const over = r.filter((s) => s.sw > s.vw || s.bw > s.vw);
    const maxSw = Math.max(...r.map((s) => s.sw)), maxRight = Math.max(...r.map((s) => s.right || 0)), moved = r.some((s) => s.dir !== '0' && s.dir != null);
    return { label, n: r.length, maxSw, vw: r[0]?.vw, maxRight, overFrames: over.length, moved };
  };
  const live = await p.evaluate(() => ({ perf: document.documentElement.dataset.perf }));
  ok('ตั้งต้น: อยู่โหมดอนิเมชั่นเต็มรูปแบบ (ไม่งั้นอนิเมชั่นไม่เล่นและทดสอบว่างเปล่า)', live.perf === 'full', JSON.stringify(live));
  const fwd = await sample(1, 'ไปข้างหน้า');
  await p.waitForTimeout(500);
  const back = await sample(-1, 'ถอยหลัง');
  await p.waitForTimeout(500);
  const fwd2 = await sample(1, 'ไปข้างหน้า(ซ้ำ)');

  ok('อนิเมชั่นเล่นจริง (data-dir ถูกตั้ง) ทั้งสองทิศ ไม่ใช่ทดสอบว่างเปล่า', fwd.moved && back.moved, JSON.stringify({ fwd: fwd.moved, back: back.moved }));
  ok('เลื่อนไปข้างหน้า: เอกสารไม่กว้างเกินจอในทุกเฟรมของอนิเมชั่น', fwd.overFrames === 0, JSON.stringify(fwd));
  ok('เลื่อนถอยหลัง: เอกสารไม่กว้างเกินจอ (อ้างอิง ต้องผ่านอยู่แล้ว)', back.overFrames === 0, JSON.stringify(back));
  ok('เลื่อนไปข้างหน้าซ้ำ: ยังไม่กว้างเกินจอ', fwd2.overFrames === 0, JSON.stringify(fwd2));
  ok('หน้าไม่ถูกเลื่อนแนวนอนค้างหลังอนิเมชั่น (scrollX = 0)', (await p.evaluate(() => window.scrollX)) === 0);
  ok('ไม่มี pageerror', errs.length === 0, errs.slice(0, 2).join(' | '));
} catch (e) { fail++; console.log('FAIL exception :: ' + String(e.message).slice(0, 240)); }
finally { try { await b.close(); } catch {} srv.close(); if (user) console.log('ลบผู้ใช้ทดสอบ ->', await user.cleanup()); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

/* บั๊ก: bottom sheet "การใช้งาน AI" เปิดมาแล้วแถบขีดจำกัดขึ้นปกติ แต่ราว 1 วินาทีต่อมาแถบเล่นอนิเมชั่นเลื่อน/จางเข้าอีกรอบ
   ต้นเหตุ: usagePaint() เขียน innerHTML ทับทั้งก้อน -> แถบเป็น node ใหม่ -> เริ่มที่ 0 แล้ววิ่งซ้ำ (ทั้งตอนเปิดและตอนโควตาจริงมาถึง)
   หลักที่ต้องเป็น (ตรงกับที่ patch()/growBars ใช้กับ UI ส่วนอื่น): แถบเล่นเข้าครั้งเดียวตอนเปิด แล้วอัปเดตค่าใหม่โดยคง node เดิม
   สิ่งที่วัด (สิ่งที่ผู้ใช้เห็น ไม่ใช่โค้ดภายใน): (1) node ของแถบถูกแทนที่หลังเปิดไหม (2) ความกว้างแถบตกกลับไปใกล้ 0 หลังเคยโตแล้วไหม (3) มี .ev-in ถูกเติมใหม่บนการ์ดหลังเปิดไหม
   รัน: node tests/usage_sheet_motion.test.mjs   (ต้อง build ก่อน: npm run build:web:forge, ต้องมี openssl) */
import { chromium } from 'playwright'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import https from 'node:https';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { makeTestUser, API } from './live_user.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); const DIR = path.join(root, 'build/web');
const HOST = 'evarel-app-forge.nontakorn2600.workers.dev';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-motion-'));
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
  user = await makeTestUser('usagemotion');
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', ignoreHTTPSErrors: true });
  await ctx.addInitScript(([a, s]) => { window.EVAREL_API = a; if (s && !localStorage.getItem('evarel-session-v2')) localStorage.setItem('evarel-session-v2', JSON.stringify(s)); localStorage.setItem('evarel-perf-pref', 'full'); }, [API, user.session]);   /* โหมดอนิเมชั่น "เต็มรูปแบบ" เหมือนเครื่องจริงของ Master (เครื่องจำลองตรวจว่าช้าแล้วตัดเป็น lite ทำให้อนิเมชั่นไม่เล่นเลย = ทดสอบว่างเปล่า) */
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));

  /* โควตาจริงมาช้า 1.2 วินาที (เลียนแบบเครือข่ายจริงที่ผู้ใช้เจอ: เปิด sheet แล้วรอข้อมูล) */
  const QUOTA = { calls: { used: 12, limit: 40 }, tokens: { used: 30000, limit: 100000 }, resetAt: new Date(Date.now() + 5 * 3600e3).toISOString(), unknown: false };
  await p.route(/\/ai\/quota/, async (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'GET, OPTIONS' } });
    await new Promise((x) => setTimeout(x, 1200));
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(QUOTA) });
  });

  await p.goto(`https://${HOST}/index.html`); await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 25000 }); await p.waitForTimeout(2500);
  /* สถานการณ์จริง: ผู้ใช้เปิดหน้า AI ก่อน (ได้โควตาแล้ว 12/40) แล้วกดเปิด sheet ขีดจำกัด -> แถบวาดทันทีด้วยค่าเดิม -> รีเฟรชเบื้องหลังได้ค่าใหม่ (13/40) */
  await p.evaluate((q) => { window.ST.QUOTA = { day: '', resetAt: q.resetAt, blocked: false, calls: { used: 12, limit: 40, remaining: 28 }, tokens: { used: 30000, limit: 100000, remaining: 70000 } }; }, QUOTA);
  QUOTA.calls = { used: 20, limit: 40 };   /* ค่าที่เซิร์ฟเวอร์จะตอบทีหลัง ต่างจากเดิม เพื่อพิสูจน์ว่าแถบ "เปลี่ยนค่า" ไม่ใช่ "เล่นใหม่" */
  await p.evaluate(() => window.ACTIONS['ai-usage']()); await p.waitForSelector('#usageSheet i[data-to]', { timeout: 8000 });

  /* ตัวสังเกต: จดทุกครั้งที่ node ของแถบ/การ์ดถูกเพิ่มเข้ามาใหม่ในเชต และจดความกว้างแถบทุกเฟรม */
  await p.evaluate(() => {
    window.__m = { added: [], widths: [], inAdded: 0, t0: performance.now() };
    const root = document.getElementById('usageSheet');
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; const bars = n.matches?.('i[data-to]') ? [n] : [...(n.querySelectorAll?.('i[data-to]') || [])]; if (bars.length) window.__m.added.push({ t: Math.round(performance.now() - window.__m.t0), n: bars.length }); } for (const m of ms) if (m.type === 'attributes' && m.attributeName === 'class' && m.target.classList.contains('ev-in')) window.__m.inAdded++; }).observe(document.getElementById('usageSheet').parentElement || root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    const tick = () => { const i = document.querySelector('#usageSheet i[data-to]'); if (i) window.__m.widths.push({ t: Math.round(performance.now() - window.__m.t0), w: Math.round(i.getBoundingClientRect().width), full: Math.round(i.parentElement.getBoundingClientRect().width) }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await p.waitForTimeout(3500);   /* ครอบคลุมช่วงโควตาจริงมาถึง (~1.2 วินาที) และอนิเมชั่นของแถบ (0.5 วินาที) */
  const r = await p.evaluate(() => { const m = window.__m; const bars = [...document.querySelectorAll('#usageSheet i[data-to]')].map((i) => ({ to: +i.dataset.to, w: Math.round(i.getBoundingClientRect().width), full: Math.round(i.parentElement.getBoundingClientRect().width) })); return { added: m.added, widths: m.widths, bars, inAdded: m.inAdded }; });

  /* หา "ถอยกลับ": ความกว้างเคยสูงกว่า 20% ของราง แล้วตกลงต่ำกว่า 5% ของราง ภายหลัง = แถบเริ่มวิ่งใหม่จาก 0 */
  let peak = 0, regress = false; for (const s of r.widths) { const f = s.full ? s.w / s.full : 0; if (f > peak) peak = f; if (peak > 0.2 && f < 0.05) regress = true; }
  const lateAdds = r.added.filter((a) => a.t > 150);   /* node แถบถูกสร้างใหม่หลังเปิดไปแล้ว (นอกช่วงตั้งต้น) */
  const want = r.bars.length >= 2 && r.bars.every((x) => Math.abs(x.w / x.full * 100 - x.to) < 2) && r.bars[0].to === 50;

  ok('แถบเปลี่ยนเป็นค่าใหม่จากเซิร์ฟเวอร์ (12/40 -> 20/40 = 50%) ครบ 2 แถบ', want, JSON.stringify(r.bars));
  ok('แถบไม่ถูกสร้างใหม่หลังเปิด sheet (ไม่เล่นอนิเมชั่นซ้ำตอนโควตามาถึง)', lateAdds.length === 0, JSON.stringify(r.added));
  ok('ความกว้างแถบไม่ถอยกลับไป 0 หลังเคยโตแล้ว', !regress, `peak=${peak.toFixed(2)}`);
  ok('ไม่มีการเติม .ev-in ซ้ำบนเนื้อหาในการ์ดหลังเปิด', r.inAdded === 0, String(r.inAdded));
  ok('ไม่มี pageerror', errs.length === 0, errs.slice(0, 2).join(' | '));
} catch (e) { fail++; console.log('FAIL exception :: ' + String(e.message).slice(0, 240)); }
finally { try { await b.close(); } catch {} srv.close(); if (user) console.log('ลบผู้ใช้ทดสอบ ->', await user.cleanup()); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

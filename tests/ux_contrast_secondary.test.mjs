/* คอนทราสต์ข้อความรองต้องผ่าน WCAG 1.4.3 (4.5:1) ในทุกแท็บของแอปที่ล็อกอินแล้ว
   ที่มา: axe พบข้อความวันที่ใต้ปฏิทินเป็น 3.05:1 เพราะ .ev-sec-head .ev-group span มี opacity:.7 ซ้อนบนสี --c-muted
   ทำไมไม่เชื่อ axe อย่างเดียว: axe ข้ามตัวเลขหลักเดียวในแท็บ "รายการ" (4 จุดใช้กฎเดียวกัน) จึงคำนวณเองจากสีที่เบราว์เซอร์ใช้จริง
   วิธีคำนวณ: ผสม color*opacity กับพื้นหลังจริงของตัวห่อที่ทึบ (ไล่ขึ้นไปหาพื้นที่ไม่โปร่งใส) แล้วคิดสัดส่วนความสว่างตามสูตร WCAG
   รัน: node tests/ux_contrast_secondary.test.mjs   (ต้อง build ก่อน: npm run build:web:forge, ต้องมี openssl) */
import { chromium } from 'playwright'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import https from 'node:https';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { makeTestUser, seedItems, API } from './live_user.mjs'; import { SEED_ITEMS } from './seed_items.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); const DIR = path.join(root, 'build/web');
const HOST = 'evarel-app-forge.nontakorn2600.workers.dev';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-contrast-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', tmp + '/k.pem', '-out', tmp + '/c.pem', '-days', '1', '-subj', '/CN=' + HOST, '-addext', 'subjectAltName=DNS:' + HOST], { stdio: 'ignore' });
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2', txt: 'text/plain' };
const srv = https.createServer({ key: fs.readFileSync(tmp + '/k.pem'), cert: fs.readFileSync(tmp + '/c.pem') }, (q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'https://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = DIR + p;
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': mime[f.split('.').pop()] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const PORT = srv.address().port;
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/'; const exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1:${PORT}`, '--ignore-certificate-errors'] }); let user = null;
const lum = ([r, g, b2]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b2); };
const ratio = (a, c) => { const [hi, lo] = [Math.max(lum(a), lum(c)), Math.min(lum(a), lum(c))]; return (hi + 0.05) / (lo + 0.05); };
try {
  user = await makeTestUser('uxcontrast'); await seedItems(user.session, SEED_ITEMS);
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: 'block', ignoreHTTPSErrors: true, hasTouch: true, isMobile: true, timezoneId: 'Asia/Bangkok' });
  await ctx.addInitScript(([a, s]) => { window.EVAREL_API = a; if (s && !localStorage.getItem('evarel-session-v2')) localStorage.setItem('evarel-session-v2', JSON.stringify(s)); localStorage.setItem('evarel-perf-pref', 'full'); }, [API, user.session]);
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
  const p = await ctx.newPage(); await p.goto(`https://${HOST}/index.html`); await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 25000 }); await p.waitForTimeout(3000);
  let total = 0, skippedAll = 0;
  for (const tab of ['today', 'all', 'calendar', 'stats']) {
    await p.click(`[data-tab="${tab}"]`).catch(() => {}); await p.waitForTimeout(1500);
    // ข้อความรองทุกจุดที่เป็น "ข้อความจริง" บนหน้า: ตัวห่อที่ opacity<1 หรือสี --c-muted (ข้อความรอง) วัดสีที่ผสมกับพื้นแล้ว
    const rows = await p.evaluate(() => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const x = m[1].split(',').map((v) => parseFloat(v)); return { r: x[0], g: x[1], b: x[2], a: x[3] === undefined ? 1 : x[3] }; };
      // พื้นหลังจริง: สีทึบ หรือ gradient (ใช้สีจุดหยุดที่ใกล้สีตัวอักษรที่สุด = กรณีเลวร้ายสุด) | รูปภาพ/พื้นที่ประเมินไม่ได้ = null (ข้าม ไม่ตัดสิน แล้วนับให้เห็น)
      const bgOf = (e, fg) => { let x = e; while (x) { const cs = getComputedStyle(x); const c = parse(cs.backgroundColor); if (c && c.a >= 0.99) return [c.r, c.g, c.b];
        const bi = cs.backgroundImage; if (bi && bi !== 'none') { if (!/gradient/.test(bi)) return null; const cols = [...bi.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((q) => q && q.a >= 0.99); if (!cols.length) return null;
          const L = (q) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(q.r) + 0.7152 * f(q.g) + 0.0722 * f(q.b); }; const lf = L({ r: fg[0], g: fg[1], b: fg[2] });
          cols.sort((a, b2) => Math.abs(L(a) - lf) - Math.abs(L(b2) - lf)); return [cols[0].r, cols[0].g, cols[0].b]; }
        x = x.parentElement; } return [245, 244, 249]; };
      const effOpacity = (e) => { let o = 1, x = e; while (x) { o *= parseFloat(getComputedStyle(x).opacity); x = x.parentElement; } return o; };
      const out = []; let skipped = 0;
      for (const e of document.querySelectorAll('main *, .ev-main *, header *')) {
        if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const c = parse(cs.color); if (!c) continue; const o = effOpacity(e) * c.a; const bg = bgOf(e, [c.r, c.g, c.b]); if (!bg) { skipped++; continue; }
        const mix = [c.r, c.g, c.b].map((v, i) => Math.round(o * v + (1 - o) * bg[i]));
        const fs = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
        out.push({ t: e.textContent.trim().slice(0, 24), mix, bg, fs, large: fs >= 24 || (fs >= 18.66 && bold), cls: (typeof e.className === 'string' ? e.className : '').split(' ')[0] });
      }
      out.skipped = skipped; return out;
    });
    const bad = rows.filter((x) => ratio(x.mix, x.bg) < (x.large ? 3 : 4.5));
    total += rows.length; skippedAll += rows.skipped || 0;
    ok(`แท็บ ${tab}: ข้อความทุกจุดผ่านคอนทราสต์ (ตรวจ ${rows.length} จุด ข้าม ${rows.skipped || 0} จุดที่พื้นเป็นรูปภาพ/ประเมินไม่ได้)`, bad.length === 0, bad.slice(0, 4).map((x) => `"${x.t}" ${x.cls} ${ratio(x.mix, x.bg).toFixed(2)}:1`).join(' | '));
  }
  ok('ตรวจจริงมากกว่า 0 จุด (กันทดสอบว่างเปล่า)', total > 20, String(total));
  console.log('หมายเหตุ: จุดที่ข้าม (พื้นเป็นรูปภาพ ตัดสินด้วยเครื่องไม่ได้ ต้องให้ตาคนดู) รวม ' + skippedAll + ' จุด');
} catch (e) { fail++; console.log('FAIL exception :: ' + String(e.message).slice(0, 240)); }
finally { try { await b.close(); } catch {} srv.close(); if (user) console.log('ลบผู้ใช้ทดสอบ ->', await user.cleanup()); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

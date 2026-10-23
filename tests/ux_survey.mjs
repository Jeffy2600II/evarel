/* สำรวจทุกหน้าและแผ่นของ Evarel (ล็อกอินแล้ว) สองขนาดจอ: ถ่ายภาพ + วัด axe + เป้าสัมผัส + ล้นจอ + เส้นเวลาการแสดงผล
   รัน: node tests/ux_survey.mjs <โฟลเดอร์ผลลัพธ์> [--only today,settings]   (ต้อง build ก่อน: npm run build:web:forge, ต้องมี openssl)
   ผล: <โฟลเดอร์>/<ขนาด>-<หน้า>.png และ survey.json (ใช้เทียบก่อน/หลังการแก้) */
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
const AXE = fs.readFileSync('/app/.agents/.state/tools/visual/node_modules/axe-core/axe.min.js', 'utf8');
const OUT = process.argv[2] || '/tmp/ux-survey'; fs.mkdirSync(OUT, { recursive: true });
const only = (process.argv.find((x) => x.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const STEPS = [
  ['today', async (p) => {}],
  ['all', async (p) => { await p.click('[data-tab="all"]'); }],
  ['calendar', async (p) => { await p.click('[data-tab="calendar"]'); }],
  ['stats', async (p) => { await p.click('[data-tab="stats"]'); }],
  ['detail', async (p) => { await p.click('[data-tab="today"]'); await p.waitForTimeout(500); await p.click('[data-act="open"]'); }],
  ['timer', async (p) => { await p.click('[data-tab="today"]'); await p.waitForTimeout(500); await p.click('[data-act="timeropen"]'); }],
  ['add', async (p) => { await p.click('[data-tab="today"]'); await p.waitForTimeout(500); await p.click('[data-act="add"]'); }],
  ['settings', async (p) => { await p.click('[data-tab="today"]'); await p.waitForTimeout(500); await p.click('[data-act="settings"]'); }],
  ['ai', async (p) => { await p.click('[data-tab="today"]'); await p.waitForTimeout(500); await p.click('[data-act="ai"]'); }],
];
const result = {};
try {
  user = await makeTestUser('uxsurvey'); await seedItems(user.session, SEED_ITEMS);
  for (const [sz, vp] of [['m375', { width: 375, height: 812 }], ['d1280', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block', ignoreHTTPSErrors: true, hasTouch: sz === 'm375', isMobile: sz === 'm375', timezoneId: 'Asia/Bangkok' });
    await ctx.addInitScript(([a, s]) => { window.EVAREL_API = a; if (s && !localStorage.getItem('evarel-session-v2')) localStorage.setItem('evarel-session-v2', JSON.stringify(s)); localStorage.setItem('evarel-perf-pref', 'full'); }, [API, user.session]);
    await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
    for (const [name, go] of STEPS) {
      if (only.length && !only.includes(name)) continue;
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
      await p.goto(`https://${HOST}/index.html`); await p.waitForFunction(() => document.body.dataset.auth === 'in', null, { timeout: 25000 }); await p.waitForTimeout(2500);
      try { await go(p); } catch (e) { result[sz + '-' + name] = { error: 'เข้าหน้าไม่ได้: ' + String(e).slice(0, 100) }; await p.close(); continue; }
      await p.waitForTimeout(1600); await p.addStyleTag({ content: '*{animation:none!important;transition:none!important}' }); await p.waitForTimeout(150);
      await p.screenshot({ path: `${OUT}/${sz}-${name}.png` });
      await p.evaluate(AXE);
      const r = await p.evaluate(async () => {
        const ax = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
        const small = [...document.querySelectorAll('button,a,[role=button],input,select,textarea')].filter((e) => e.offsetParent !== null && !(e.tagName === 'A' && !e.hasAttribute('href'))).map((e) => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.width > 0 && (r.width < 24 || r.height < 24)).map(([e, r]) => (e.getAttribute('aria-label') || e.className.split(' ')[0] || e.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        return { viol: ax.violations.map((v) => v.id + '(' + v.impact + ')x' + v.nodes.length), overflow: document.documentElement.scrollWidth > innerWidth + 1, small, h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length };
      });
      result[sz + '-' + name] = { ...r, errs };
      console.log(`${sz}/${name}`.padEnd(18), 'axe:', r.viol.join(',') || '-', '| ล้น:', r.overflow, '| เล็ก:', r.small.length, r.small.slice(0, 3).join(';'), '| h1/main:', r.h1 + '/' + r.main, '| err:', errs.length);
      await p.close();
    }
    await ctx.close();
  }
  fs.writeFileSync(OUT + '/survey.json', JSON.stringify(result, null, 1));
} finally { try { await b.close(); } catch {} srv.close(); if (user) await user.cleanup(); fs.rmSync(tmp, { recursive: true, force: true }); }

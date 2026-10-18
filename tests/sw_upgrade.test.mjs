/* ตรวจการอัปเดต service worker จากรุ่นที่ผู้ใช้มีอยู่ไปรุ่นใหม่ (ความเสี่ยงของ S3: ชื่อไฟล์โมดูลเปลี่ยน ผู้ใช้มีแคชเก่า)
   seam ที่ตรวจ = สิ่งที่ผู้ใช้เห็น: แคชหลังอัปเดต, แอปบูตด้วยข้อมูล API จริง, เปิดออฟไลน์ได้ ไม่ตรวจโค้ดภายใน SW
   ใช้เซิร์ฟเวอร์ HTTPS จริงในเครื่อง ไม่ใช้ playwright route เพราะ route ไม่สกัดคำขอ sw.js ของ service worker เอง
   รัน: node tests/sw_upgrade.test.mjs [commit รุ่นเก่า]   (ค่าเริ่มต้น = commit ที่ forge เสิร์ฟ evarel-v46-push)
   ต้อง build ก่อน: npm run build:web:forge  ต้องมี openssl */
import { chromium } from 'playwright'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import https from 'node:https';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { makeTestUser, seedItems, API } from './live_user.mjs'; import { SEED_ITEMS } from './seed_items.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OLD_COMMIT = process.argv[2] || process.env.SW_OLD_COMMIT || '2fbd765'; const NEW = process.env.SW_NEW_DIR || path.join(root, 'build/web');
const HOST = 'evarel-app-forge.nontakorn2600.workers.dev';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-upgrade-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', tmp + '/k.pem', '-out', tmp + '/c.pem', '-days', '1', '-subj', '/CN=' + HOST, '-addext', 'subjectAltName=DNS:' + HOST], { stdio: 'ignore' });
fs.mkdirSync(tmp + '/old'); execFileSync('sh', ['-c', `git -C "${root}" archive ${OLD_COMMIT} app/web | tar -x -C "${tmp}/old"`]); const OLD = tmp + '/old/app/web';
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon', txt: 'text/plain' };
let DIR = OLD;
const srv = https.createServer({ key: fs.readFileSync(tmp + '/k.pem'), cert: fs.readFileSync(tmp + '/c.pem') }, (q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'https://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = DIR + p;
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': mime[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' }); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const PORT = srv.address().port;
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/'; const exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const verOf = (dir) => fs.readFileSync(dir + '/sw.js', 'utf8').match(/const VERSION = '([^']+)'/)[1];
const orderOf = (dir) => JSON.parse(fs.readFileSync(dir + '/js/m/_order.json', 'utf8')).order.map((o) => o.file);   // ค่าที่คาดมาจากไฟล์ลำดับ ไม่ฝังเลขตายตัว
const OLDV = verOf(OLD), NEWV = verOf(NEW);
const b = await chromium.launch({ executablePath: exe, args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1:${PORT}`, '--ignore-certificate-errors'] }); let user = null;
try {
  ok('ตั้งต้น: รุ่นเก่ากับรุ่นใหม่ต้องมี VERSION ต่างกัน (ลืม bump = ผู้ใช้ไม่ได้ของใหม่)', OLDV !== NEWV, `${OLDV} -> ${NEWV}`);
  user = await makeTestUser('swup'); await seedItems(user.session, SEED_ITEMS);
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'allow', ignoreHTTPSErrors: true });
  await ctx.addInitScript(([a, s]) => { window.EVAREL_API = a; if (s && !localStorage.getItem('evarel-session-v2')) localStorage.setItem('evarel-session-v2', JSON.stringify(s)); }, [API, user.session]);
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`https://${HOST}/index.html`); await p.waitForTimeout(5000);
  const s1 = await p.evaluate(async () => ({ keys: await caches.keys(), ctrl: !!navigator.serviceWorker.controller }));
  ok('รุ่นเก่าติดตั้ง SW และมีแคชเฉพาะรุ่นเก่า', s1.ctrl && s1.keys.length === 1 && s1.keys[0] === OLDV, JSON.stringify(s1));
  DIR = NEW;
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  let done = null; for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); done = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { k: await caches.keys(), a: r.active && r.active.state, w: !!r.waiting, i: !!r.installing }; }); if (done.k.length === 1 && done.k[0] === NEWV && done.a === 'activated' && !done.w && !done.i) break; }
  ok('หลังอัปเดต: SW ใหม่ activate และแคชเก่าถูกล้าง เหลือเฉพาะรุ่นใหม่', done.k.length === 1 && done.k[0] === NEWV && done.a === 'activated', JSON.stringify(done));
  await p.reload(); await p.waitForTimeout(4000);
  /* N3: รองรับสองสถาปัตยกรรม — เส้นทางเดิมมี js/m/_order.json ตรวจลำดับตรงๆ | build ของ Next ไม่มี js/m (บันเดิล) ตรวจ seam เดียวกันผ่านสิ่งที่ผู้ใช้เห็น */
  const nextMode = !fs.existsSync(NEW + '/js/m/_order.json');
  const want = nextMode ? null : orderOf(NEW);
  const s2 = await p.evaluate(async (nextMode) => { const k = await caches.keys(); const c = await caches.open(k[0]); const have = new Set((await c.keys()).map((r) => new URL(r.url).pathname)); const need = [...document.scripts].filter((s) => s.src).map((s) => new URL(s.src).pathname).filter((x) => x.includes(nextMode ? '/_next/' : '/js/m/')); return { missing: need.filter((x) => !have.has(x)), loaded: need.map((x) => x.split('/').pop()), auth: document.body.dataset.auth, items: S.items.length }; }, nextMode);
  ok('แอปบูตหลังอัปเดต: ล็อกอินและได้รายการจาก API ครบตามที่ใส่ไว้', s2.auth === 'in' && s2.items === SEED_ITEMS.length, `auth=${s2.auth} items=${s2.items}/${SEED_ITEMS.length}`);
  if (nextMode) {
    /* build Next: chunk ทุกอันที่หน้าอ้างต้องอยู่ในแคชรุ่นใหม่ (สเกลของ js/m คือ _next chunk) */
    ok('chunk ทุกอันของ Next อยู่ในแคชรุ่นใหม่', s2.missing.length === 0, JSON.stringify(s2.missing.slice(0, 3)));
  } else {
    const diffAt = s2.loaded.map((x, i) => (x === want[i] ? null : `#${i} โหลด ${x} คาด ${want[i]}`)).filter(Boolean);
    ok('โหลดโมดูลครบตามลำดับของ _order.json (ไม่ค้างชื่อไฟล์เก่า)', JSON.stringify(s2.loaded) === JSON.stringify(want), diffAt.length ? `ต่างที่ ${diffAt.slice(0, 3).join(' | ')}` : `โหลด ${s2.loaded.length} ครบ`);
    ok('โมดูลทุกไฟล์อยู่ในแคชรุ่นใหม่', s2.missing.length === 0, JSON.stringify(s2.missing.slice(0, 3)));
  }
  await ctx.setOffline(true); let navErr = null; try { await p.reload({ waitUntil: 'domcontentloaded', timeout: 15000 }); } catch (e) { navErr = String(e.message).slice(0, 100); } await p.waitForTimeout(3500);
  const off = await p.evaluate((nextMode) => ({ app: !!document.getElementById('app'), eng: typeof window.ST === 'object' && typeof window.UI === 'object', scripts: [...document.scripts].filter((s) => s.src && s.src.includes(nextMode ? '/_next/' : '/js/m/')).length })).catch((e) => ({ err: String(e.message).slice(0, 80) }));
  ok('ออฟไลน์หลังอัปเดต: หน้าโหลดจากแคชและเครื่องยนต์ครบ', !navErr && off.app && (nextMode ? off.eng : off.scripts === want.length), JSON.stringify({ navErr, ...off }));
  ok('ไม่มี pageerror ตลอดกระบวนการ', errs.length === 0, errs.slice(0, 2).join(' | '));
} catch (e) { fail++; console.log('FAIL exception :: ' + String(e.message).slice(0, 220)); }
finally { try { await b.close(); } catch {} srv.close(); if (user) console.log('ลบผู้ใช้ทดสอบ ->', await user.cleanup()); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

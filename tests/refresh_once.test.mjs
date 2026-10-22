/* พิสูจน์เป้าหมายของระบบอัปเดต: ผู้ใช้ที่ถือรุ่นเก่า รีเฟรช "ครั้งเดียว" แล้วได้ HTML + CSS รุ่นใหม่ครบ
   และไม่มีการเปลี่ยนรุ่นกลางทางระหว่างใช้งาน (ไม่เรียลไทม์)
   กรณีทดสอบหลัก: รุ่นใหม่ต่างจากรุ่นเก่า "เฉพาะเนื้อหา app.css" (ชื่อไฟล์เดิม) ซึ่งเป็นกรณีที่เคยทำให้ต้อง refresh สองรอบ
   วิธี: รุ่น A = build/web ปัจจุบัน | รุ่น B = สำเนาของ A ที่แก้เนื้อหา app.css + ?v= + ASSET_V ให้เป็นรุ่นถัดไป
   รัน: node tests/refresh_once.test.mjs   (ต้อง build ก่อน: npm run build:web:forge, ต้องมี openssl) */
import { chromium } from 'playwright'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import https from 'node:https';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); const A = path.join(root, 'build/web');
const HOST = 'evarel-app-forge.nontakorn2600.workers.dev';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-once-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', tmp + '/k.pem', '-out', tmp + '/c.pem', '-days', '1', '-subj', '/CN=' + HOST, '-addext', 'subjectAltName=DNS:' + HOST], { stdio: 'ignore' });

/* สร้างรุ่น B จาก A: เปลี่ยนเฉพาะเนื้อหา app.css แล้วคำนวณรหัสใหม่ให้ตรงกันทุกที่ (HTML ?v=, __EV_BUILD__, sw.js ASSET_V + VERSION, release.json) */
const B = tmp + '/B'; fs.cpSync(A, B, { recursive: true });
const oldV = fs.readFileSync(A + '/sw.js', 'utf8').match(/const ASSET_V = '([a-f0-9]+)'/)[1]; const newV = 'ffffffffffff';
const MARK = 'REFRESH-ONCE-MARK'; fs.appendFileSync(B + '/styles/app.css', `\n/* ${MARK} */\nbody{--refresh-once:"b"}\n`);
const swapAll = (dir) => { for (const f of fs.readdirSync(dir, { recursive: true })) { const p = path.join(dir, f); if (!fs.statSync(p).isFile() || !/\.(html|txt|json)$|(^|[\\/])sw\.js$/.test(f)) continue; const t = fs.readFileSync(p, 'utf8'); if (t.includes(oldV)) fs.writeFileSync(p, t.split(oldV).join(newV)); } };
swapAll(B);
const swB = fs.readFileSync(B + '/sw.js', 'utf8').replace(/const VERSION = 'evarel-next-[a-f0-9]+';/, "const VERSION = 'evarel-next-bbbbbbbbbbbb';"); fs.writeFileSync(B + '/sw.js', swB);
const relB = JSON.parse(fs.readFileSync(B + '/release.json', 'utf8')); const oldVer = relB.version; const newVer = '2099.9.9-forge';
relB.build = 'bbbbbbbbbbbb'; relB.assets = newV; relB.version = newVer; relB.title = 'ทดสอบ'; relB.notes = [{ type: 'new', text: 'ฟีเจอร์ทดสอบ' }, { type: 'fix', text: 'แก้ทดสอบ' }];
fs.writeFileSync(B + '/release.json', JSON.stringify(relB));
/* ฝังเลขเวอร์ชันใหม่ใน HTML ของ B ด้วย (เหมือนที่ build จริงทำ) */
for (const f of fs.readdirSync(B, { recursive: true })) { const q = path.join(B, f); if (fs.statSync(q).isFile() && /\.(html|txt)$/.test(f)) { const t = fs.readFileSync(q, 'utf8'); if (t.includes(oldVer)) fs.writeFileSync(q, t.split(oldVer).join(newVer)); } }
/* รุ่น C = B + แก้ไฟล์ CSS อีกครั้ง แต่ "เลขเวอร์ชันเท่าเดิม" (ไม่มีอะไรใหม่ให้บอกผู้ใช้) */
const C = tmp + '/C'; fs.cpSync(B, C, { recursive: true }); const cV = 'eeeeeeeeeeee';
fs.appendFileSync(C + '/styles/app.css', '\nbody{--refresh-once:"c"}\n');
for (const f of fs.readdirSync(C, { recursive: true })) { const q = path.join(C, f); if (fs.statSync(q).isFile() && /\.(html|txt|json)$|(^|[\\/])sw\.js$/.test(f)) { const t = fs.readFileSync(q, 'utf8'); if (t.includes(newV)) fs.writeFileSync(q, t.split(newV).join(cV)); } }
const relC = JSON.parse(fs.readFileSync(C + '/release.json', 'utf8')); relC.assets = cV; relC.build = 'cccccccccccc'; fs.writeFileSync(C + '/release.json', JSON.stringify(relC));
fs.writeFileSync(C + '/sw.js', fs.readFileSync(C + '/sw.js', 'utf8').replace(/const VERSION = 'evarel-next-[a-f0-9]+';/, "const VERSION = 'evarel-next-cccccccccccc';"));

const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2', txt: 'text/plain' };
let DIR = A;
const srv = https.createServer({ key: fs.readFileSync(tmp + '/k.pem'), cert: fs.readFileSync(tmp + '/c.pem') }, (q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'https://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = DIR + p;
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': mime[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' }); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const PORT = srv.address().port;
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/'; const exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1:${PORT}`, '--ignore-certificate-errors'] });
try {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'allow', ignoreHTTPSErrors: true });
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const state = () => p.evaluate(async () => ({ ev: window.__EV_BUILD__, ver: window.__EV_VERSION__, dlg: (document.querySelector('#dialog .ev-upd h3')||{}).textContent || '', dlgText: (document.querySelector('#dialog .ev-upd')||{}).textContent || '', css: getComputedStyle(document.body).getPropertyValue('--refresh-once').trim(), href: document.querySelector('link[rel=stylesheet][href*="app.css"]')?.getAttribute('href') || '' }));

  await p.goto(`https://${HOST}/index.html`); await p.waitForTimeout(4500);
  const s1 = await state();
  ok('ผู้ใช้ได้รุ่นเก่า (A) ตอนเปิดครั้งแรก', s1.ev === oldV && s1.css === '', JSON.stringify(s1));

  DIR = B;   /* ปล่อยรุ่นใหม่ขึ้นเซิร์ฟเวอร์ ผู้ใช้ยังเปิดแอปอยู่ */
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await p.waitForTimeout(3500);
  const mid = await state();
  ok('ไม่เรียลไทม์: ระหว่างใช้งานหน้ายังเป็นรุ่นเก่า ไม่ถูกเปลี่ยนเอง', mid.ev === oldV && mid.css === '', JSON.stringify(mid));

  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500);   /* รีเฟรช "ครั้งเดียว" */
  const s2 = await state();
  ok('รีเฟรชครั้งเดียว: ได้ HTML รุ่นใหม่ (__EV_BUILD__ + ?v=)', s2.ev === newV && s2.href.endsWith('?v=' + newV), JSON.stringify(s2));
  ok('รีเฟรชครั้งเดียว: ได้เนื้อหา CSS รุ่นใหม่ (ไฟล์ชื่อเดิม)', s2.css === '"b"', JSON.stringify(s2));
  /* ---- What's New: บอกว่าเวอร์ชันนี้เปลี่ยนอะไร (ไม่ใช่แจ้งว่าอัปเดตสำเร็จ) ---- */
  /* ผู้ใช้ใหม่ครั้งแรก (เปิดรุ่น A) ไม่ขึ้น | รุ่น B เวอร์ชันใหม่ = ขึ้นหนึ่งครั้ง */
  ok('What\'s New ขึ้นเมื่อเลขเวอร์ชันใหม่', s2.dlg === 'มีอะไรใหม่', JSON.stringify({ dlg: s2.dlg }));
  ok('What\'s New บอกเลขเวอร์ชันสาธารณะ (ไม่เห็นช่อง -forge) + รายการที่เปลี่ยน', /2099\.9\.9/.test(s2.dlgText) && !/-forge/.test(s2.dlgText) && /ฟีเจอร์ทดสอบ/.test(s2.dlgText) && /แก้ทดสอบ/.test(s2.dlgText), s2.dlgText.slice(0, 120));
  ok('ไม่ใช้ถ้อยคำแจ้งว่าอัปเดตสำเร็จ/ให้กดอัปเดต', !/อัปเดตเรียบร้อย|อัปเดตเลย|ไว้ทีหลัง|มีเวอร์ชันใหม่/.test(s2.dlgText), s2.dlgText.slice(0, 80));
  await p.click('#dialog [data-upd="ok"]').catch(() => {}); await p.waitForTimeout(500);
  /* การ์ด เกี่ยวกับ ในหน้าตั้งค่า: ต้องแสดงเลขรุ่น + วันที่ + build ที่หน้ารันอยู่จริง ไม่ค้าง "ตรวจสอบรุ่น…" (บั๊กที่เคยหลุดเมื่อเปลี่ยนชื่อ API ใน boot.js โดยไม่ตามผู้เรียก) */
  await p.evaluate(() => { window.ACTIONS && window.ACTIONS.settings(); }); await p.waitForSelector('#appVerNum', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(2500);
  const about = await p.evaluate(() => ({ num: (document.getElementById('appVerNum') || {}).textContent || '', sub: (document.getElementById('appVerSub') || {}).textContent || '' }));
  ok('การ์ดเกี่ยวกับแสดงเลขรุ่นที่รันอยู่จริง', about.num.trim() === newVer, JSON.stringify(about));
  ok('การ์ดเกี่ยวกับแสดงวันที่ + build ไม่ค้าง "ตรวจสอบรุ่น…"', !/ตรวจสอบรุ่น/.test(about.sub) && about.sub.includes('build ' + newV) && /\d{4}-\d{2}-\d{2}/.test(about.sub), JSON.stringify(about));
  await p.keyboard.press('Escape').catch(() => {}); await p.evaluate(() => { history.back && 0; }); await p.waitForTimeout(500);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3000);
  const s3 = await state();
  ok('รีเฟรชซ้ำเวอร์ชันเดิม: ไม่ขึ้น What\'s New ซ้ำ', s3.dlg === '' && s3.ver === newVer, JSON.stringify({ dlg: s3.dlg, ver: s3.ver }));
  DIR = C;   /* แก้เฉพาะไฟล์ ไม่ขยับเลขเวอร์ชัน */
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); }); await p.waitForTimeout(3000);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500);
  const s4 = await state();
  ok('แก้เฉพาะไฟล์ (เลขเวอร์ชันเท่าเดิม): ได้ไฟล์ใหม่ แต่ไม่ขึ้น What\'s New', s4.ev === cV && s4.css === '"c"' && s4.dlg === '', JSON.stringify({ ev: s4.ev, css: s4.css, dlg: s4.dlg }));
  ok('ไม่มี pageerror ตลอดกระบวนการ', errs.length === 0, errs.slice(0, 2).join(' | '));
} catch (e) { fail++; console.log('FAIL exception :: ' + String(e.message).slice(0, 220)); }
finally { try { await b.close(); } catch {} srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

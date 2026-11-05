// พิสูจน์รอบ 2026.8.1 ในเบราว์เซอร์จริง (serve web/runtime + mock API ไม่ออกเน็ต):
//  A) ตรวจอีเมลสดหน้าสมัคร: พิมพ์→โน้ต, ลบแล้วหยุด→ต้องตรวจใหม่ (โจทย์ Master 3 พ.ย. 2026), จำผลไม่ยิงซ้ำ, ลบจนว่าง→โน้ตหาย, focusout→ตรวจทันที
//  B) ปุ่ม Google: จำจุดออก, กลับมาเอง (visibilitychange/pageshow) → ปุ่มคืนทันที+แจ้ง "ยกเลิก" (ไม่ใช่ error เครือข่าย), timer 5 วิ, boot เคส reload กลับมา
// ใช้: node tests/authflow_email_probe.mjs
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http'; import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..'), CL = path.join(ROOT, 'web/runtime');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
/* mock ฝังแทนสคริปต์ EVAREL_API ว่างของ index.html: ตอบ check-email ตาม prefix "taken@" + นับคำขอ */
const MOCK = `<script>
window.EVAREL_API='https://api.test';window.__chk=[];
const _f=window.fetch;
window.fetch=async(u,init)=>{const url=String(u),b=init&&init.body?JSON.parse(init.body):{};
 if(url.includes('/api/auth/check-email')){window.__chk.push(String(b.email).toLowerCase());
  return new Response(JSON.stringify({ok:true,exists:String(b.email).toLowerCase().startsWith('taken')}),{status:200,headers:{'Content-Type':'application/json'}})}
 if(url.includes('/api/items'))return new Response(JSON.stringify({items:[]}),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.includes('/api/auth/forgot')||url.includes('/api/auth/resend'))return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});
 if(url.includes('/api/auth/session'))return new Response(JSON.stringify({access_token:'a',refresh_token:'r',expires_at:4102444800,user:{id:7,email:'oauth@x.test',name:'O'}}),{status:200,headers:{'Content-Type':'application/json'}});
 return _f(url,init)};
</script>`;
const srv = http.createServer((q, s) => {
  const rel = q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0].replace(/^\/+/, '');
  const f = path.join(CL, rel);
  if (!f.startsWith(CL) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { s.writeHead(404); s.end(); return; }
  let body = fs.readFileSync(f);
  if (rel === 'index.html') body = Buffer.from(body.toString().replace('<script>window.EVAREL_API = window.EVAREL_API || \'\';</script>', MOCK));
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); s.end(body);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const U = 'http://127.0.0.1:' + srv.address().port + '/';

/* หา chromium แบบยืดหยุ่น: รุ่น pin ของ repo (1243) ก่อน แล้วตัวใดก็ได้ที่ติดตั้งไว้ในเครื่อง (โครงไดเรกทอรีต่างกันตามรุ่น) */
const findExe = () => {
  const base = process.env.HOME + '/.cache/ms-playwright/';
  const cands = ['chromium_headless_shell-1243', 'chromium-1243'];
  for (const d of fs.readdirSync(base).filter(d => /chromium/i.test(d)).sort().reverse()) cands.push(d); /* รุ่นใหม่ก่อน */
  for (const d of cands) {
    for (const sub of ['chrome-linux', 'chrome-linux64', 'chrome-headless-shell-linux64']) {
      for (const name of ['chrome-headless-shell', 'chrome']) {
        const f = path.join(base, d, sub, name);
        if (fs.existsSync(f)) return f;
      }
    }
  }
  return null;
};
const exe = findExe(); if (!exe) { console.error('ไม่พบ chromium ใน ms-playwright cache'); process.exit(2); }
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const out = []; const ok = (n, c, v = '') => { out.push((c ? 'PASS ' : 'FAIL ') + n + (v ? ' | ' + v : '')) };
const ctx = await b.newContext({ viewport: { width: 412, height: 915 } }); const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_BLOCKED/.test(m.text())) errs.push('console:' + m.text()) });
await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort()); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());

await p.goto(U); await p.waitForTimeout(1400);
ok('A0 บูตถึงหน้า welcome', await p.evaluate(() => UI.auth.screen === 'welcome' && UI.auth.status === 'out'));
await p.click('[data-act="au-go"][data-id="signup"]'); await p.waitForTimeout(350);
ok('A1 หน้า signup มี div โน้ตของตัวเอง #n-email (แยกจาก #e-email)', await p.evaluate(() => !!document.querySelector('#n-email') && !!document.querySelector('#e-email')));

const note = () => p.evaluate(() => { const n = document.querySelector('#n-email'); return n && !n.hidden ? n.textContent.trim() : '' });
const calls = () => p.evaluate(() => window.__chk.length);

/* A2 พิมพ์อีเมลที่มีบัญชี (taken@...) ทีละตัว → หยุด → โน้ต "มีบัญชีอยู่แล้ว" */
await p.click('#f-email'); await p.type('#f-email', 'taken@x.test', { delay: 25 }); await p.waitForTimeout(950);
ok('A2 พิมพ์อีเมลมีบัญชีแล้วหยุด → โน้ตแสดง + ยิงตรวจ 1 ครั้ง', (await note()).includes('มีบัญชีอยู่แล้ว') && (await calls()) === 1, `note="${(await note()).slice(0, 30)}" calls=${await calls()}`);

/* A3 หัวใจของรอบนี้: ลบ 1 ตัวอักษร (ค่ายังเป็นอีเมลครบ) แล้ว "หยุดพัก" → ระบบต้องตรวจค่าใหม่ (เดิมไม่ตรวจ) */
await p.press('#f-email', 'Backspace'); await p.waitForTimeout(950);
ok('A3 ลบตัวอักษรแล้วหยุดพัก → ตรวจค่าใหม่ (เพิ่มเป็น 2 คำขอ) + โน้ตยังตรงกับผล', (await calls()) === 2 && (await note()).includes('มีบัญชีอยู่แล้ว'), `calls=${await calls()} note="${(await note()).slice(0, 24)}"`);

/* A4 พิมพ์คืนตัวอักษรเดิม → ค่านี้เคยตรวจแล้ว = วาดโน้ตทันทีจากที่จำไว้ ไม่ยิงเครือข่ายซ้ำ */
await p.type('#f-email', 't', { delay: 25 }); await p.waitForTimeout(350);
ok('A4 พิมพ์คืนเป็นอีเมลที่เพิ่งตรวจ → โน้ตกลับมาทันที ไม่ยิงซ้ำ', (await calls()) === 2 && (await note()).includes('มีบัญชีอยู่แล้ว'), `calls=${await calls()} (<350ms)`);

/* A5 ลบจนอีเมลไม่ครบ (ไม่ผ่านรูปแบบ) → โน้ตหายทันทีไม่รอตรวจ */
for (let i = 0; i < 4; i++) await p.press('#f-email', 'Backspace');
await p.waitForTimeout(120);
ok('A5 ลบจนอีเมลไม่ครบ → โน้ตหายทันที', (await note()) === '' && (await calls()) === 2, `calls=${await calls()}`);

/* A6 อีเมลใหม่ที่ไม่มีบัญชี → ตรวจแล้วเงียบ (ไม่มีโน้ต) — ไม่ชี้ทางให้เดา */
await p.fill('#f-email', 'fresh@x.test'); await p.waitForTimeout(950);
ok('A6 อีเมลที่ยังไม่มีบัญชี → ตรวจแล้วเงียบ (โน้ตว่าง)', (await calls()) === 3 && (await note()) === '', `calls=${await calls()}`);

/* A7 focusout = ตรวจทันที ไม่รอ 650ms */
await p.fill('#f-email', 'taken2@x.test'); await p.click('body'); await p.waitForTimeout(200);
ok('A7 ออกจากช่อง (focusout) → ตรวจทันทีภายใน 200ms', (await calls()) === 4 && (await note()).includes('มีบัญชีอยู่แล้ว'), `calls=${await calls()}`);

/* B — ปุ่ม Google */
await p.evaluate(() => { Auth.signInGoogle = () => new Promise(() => {}) }); /* เลียน: ออกไปหน้า Google แล้ว promise ค้าง (หน้าจริงเปลี่ยนไปก่อน) */
await p.evaluate(() => { UI.auth.screen = 'welcome'; renderAuthRoot() }); await p.waitForTimeout(250);
await p.click('[data-act="au-google"]');
const st1 = await p.evaluate(() => ({ dis: document.querySelector('[data-act="au-google"]').disabled, out: sessionStorage.getItem('evarel-oauth-out') }));
ok('B1 กด Google → ปุ่มสปินเนอร์ + จำจุดออกไว้ (evarel-oauth-out)', st1.dis && !!st1.out, JSON.stringify({ dis: st1.dis, hasOut: !!st1.out }));
/* B2 กลับมาเองแบบ PWA สลับแอป (visibilitychange) → ปุ่มคืนทันที + แจ้ง "ยกเลิก" ไม่ใช่เครือข่าย */
await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(250);
const st2 = await p.evaluate(() => ({ dis: document.querySelector('[data-act="au-google"]').disabled, toast: document.querySelector('#toast').textContent.trim(), out: sessionStorage.getItem('evarel-oauth-out') }));
ok('B2 สลับกลับมาหน้าเว็บ → ปุ่มคืนทันที + แจ้ง "ยกเลิกการเข้าสู่ระบบด้วย Google" (ไม่ใช่ปัญหาเครือข่าย)', !st2.dis && st2.toast.includes('ยกเลิก') && !st2.toast.includes('อินเทอร์เน็ต') && !st2.out, JSON.stringify({ dis: st2.dis, toast: st2.toast.slice(0, 40) }));
/* B3 bfcache ย้อนกลับ (pageshow persisted) — หลักเดียวกัน */
await p.click('[data-act="au-google"]'); await p.waitForTimeout(150);
await p.evaluate(() => { const ev = new Event('pageshow'); Object.defineProperty(ev, 'persisted', { value: true }); document.dispatchEvent(ev) }); await p.waitForTimeout(250);
const st3 = await p.evaluate(() => ({ dis: document.querySelector('[data-act="au-google"]').disabled, toast: document.querySelector('#toast').textContent.trim() }));
ok('B3 ย้อนกลับผ่าน bfcache (pageshow persisted) → ปุ่มคืน + แจ้งยกเลิก', !st3.dis && st3.toast.includes('ยกเลิก'), JSON.stringify({ dis: st3.dis, toast: st3.toast.slice(0, 40) }));
/* B4 เคสหน้าไม่ไปไหนเลยจริง ๆ → timer 5 วิ คืนปุ่มและแจ้งเครือข่าย */
await p.click('[data-act="au-google"]'); await p.waitForTimeout(5300);
const st4 = await p.evaluate(() => ({ dis: document.querySelector('[data-act="au-google"]').disabled, toast: document.querySelector('#toast').textContent.trim() }));
ok('B4 ไปหน้า Google ไม่สำเร็จจริง → 5 วิ คืนปุ่ม + แจ้งตรวจอินเทอร์เน็ต', !st4.dis && st4.toast.includes('อินเทอร์เน็ต'), JSON.stringify({ dis: st4.dis, toast: st4.toast.slice(0, 40) }));
/* B5 กลับมาแบบโหลดหน้าใหม่ (ไม่ใช่ bfcache) โดยไม่มี token → boot แจ้งยกเลิก */
await p.evaluate(() => { sessionStorage.setItem('evarel-oauth-out', String(Date.now() - 1000)); localStorage.removeItem('evarel-session-v2'); localStorage.removeItem('evarel-oauth-park') });
await p.reload(); await p.waitForTimeout(1600);
const st5 = await p.evaluate(() => ({ screen: UI.auth.screen, status: UI.auth.status, toast: document.querySelector('#toast').textContent.trim(), out: sessionStorage.getItem('evarel-oauth-out') }));
ok('B5 กลับมาแบบ reload ไม่มี token → แจ้งยกเลิก 1 ครั้ง + ล้างจุดจำ + อยู่หน้า welcome', st5.screen === 'welcome' && st5.status === 'out' && st5.toast.includes('ยกเลิก') && !st5.out, JSON.stringify({ screen: st5.screen, toast: st5.toast.slice(0, 36) }));
/* B6 refresh ธรรมดาหลังล้างจุดจำแล้ว → ไม่แจ้งยกเลิกซ้ำ */
await p.reload(); await p.waitForTimeout(1600);
const st6 = await p.evaluate(() => document.querySelector('#toast').textContent.trim());
ok('B6 refresh อีกครั้ง → ไม่แจ้งยกเลิกซ้ำ (จุดจำถูกล้างแล้ว)', !st6.includes('ยกเลิก'), `toast="${st6.slice(0, 24)}"`);

ok('Z ไม่มี pageerror/console error ตลอดการทดสอบ', errs.length === 0, errs.slice(0, 2).join(' ; ').slice(0, 160));
console.log(out.join('\n')); console.log('ผ่าน', out.filter(l => l.startsWith('PASS')).length + '/' + out.length);
await b.close(); srv.close();

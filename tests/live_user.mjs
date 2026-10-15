/* ตัวช่วยกลางของประตูทดสอบ: สร้างผู้ใช้ทดสอบที่ยืนยันแล้วผ่าน Supabase Admin API
   ล็อกอินผ่าน API จริง (evarel-api-forge) แล้วคืนฟังก์ชันลบผู้ใช้ทิ้ง ไม่ยิงอีเมล ไม่ทิ้งขยะ */
import fs from 'fs';
const envText = fs.readFileSync('/app/.agents/.env', 'utf-8');
const pick = k => { const m = envText.match(new RegExp('^\\s*(?:export\\s+)?' + k + '\\s*=\\s*(.*)$', 'm')); return m ? m[1].trim().replace(/^\$'(.*)'$/s, '$1').replace(/^["']|["']$/g, '') : ''; };
export const SB = 'https://vdbmwmmsfrgpaauzspup.supabase.co';
export const API = process.env.EVAREL_TEST_API || 'https://evarel-api-forge.nontakorn2600.workers.dev';
const KEY = pick('SUPABASE_SERVICE_KEY');
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', 'User-Agent': 'evarel-test/1.0' };

export async function makeTestUser(tag = 'gate') {
  const rnd = Math.random().toString(36).slice(2, 8);
  const email = `gate-${tag}-${rnd}@example.com`, password = 'Passw0rd!' + Math.random().toString(36).slice(2, 8);
  const c = await fetch(SB + '/auth/v1/admin/users', { method: 'POST', headers: H, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: 'Nontakorn' } }) });
  if (!c.ok) throw new Error('สร้างผู้ใช้ทดสอบไม่สำเร็จ ' + c.status);
  const user = await c.json();
  const l = await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!l.ok) { await fetch(SB + '/auth/v1/admin/users/' + user.id, { method: 'DELETE', headers: H }); throw new Error('ล็อกอินผ่าน API ไม่สำเร็จ ' + l.status); }
  const session = await l.json();
  /* เส้นล็อกอินคืนแค่ {id,email} (ไม่มีชื่อ) ส่วนแอปจริงได้ชื่อจากตอนสมัคร จึงเติมชื่อให้ session ทดสอบเหมือนกัน */
  session.user = { ...session.user, name: 'Nontakorn', provider: 'email' };
  const cleanup = async () => (await fetch(SB + '/auth/v1/admin/users/' + user.id, { method: 'DELETE', headers: H })).status;
  return { id: user.id, email, password, session, cleanup };
}

/* เสิร์ฟโค้ดในเครื่องภายใต้โดเมน forge จริง เพื่อให้ผ่าน CORS ของ API โดยไม่ต้องเปิดช่องให้ localhost
   (ทดสอบโค้ดที่แก้อยู่ แต่เบราว์เซอร์เห็น origin = evarel-app-forge) */
export const APP_ORIGIN = 'https://evarel-app-forge.nontakorn2600.workers.dev';
export async function serveLocalAs(ctx, webDir = process.env.EVAREL_WEB_DIR || '/tmp/evarel-repo/app/web') {
  const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon' };
  await ctx.route(APP_ORIGIN + '/**', async route => {
    let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p.endsWith('/')) p += 'index.html';
    const f = webDir + p;
    if (!f.startsWith(webDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, contentType: mime[f.split('.').pop()] || 'application/octet-stream', body: fs.readFileSync(f), headers: { 'cache-control': 'no-store' } });
  });
}

/* ใส่รายการเริ่มต้นให้ผู้ใช้ทดสอบผ่าน API จริง (PUT /api/items/:id) ตรวจรูปแบบโดยเซิร์ฟเวอร์เอง */
export async function seedItems(session, items) {
  for (const it of items) {
    const r = await fetch(API + '/api/items/' + it.id, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(it) });
    if (!r.ok) throw new Error('seed รายการไม่สำเร็จ id=' + it.id + ' ' + r.status + ' ' + (await r.text()).slice(0, 120));
  }
}

/* เปิดบริบทเบราว์เซอร์ที่ล็อกอินเป็นผู้ใช้จริง เสิร์ฟโค้ดในเครื่องภายใต้โดเมน forge */
export async function openAsUser(browser, user, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Bangkok', ...opts });
  await ctx.addInitScript(([a, s]) => { window.EVAREL_API = a; if (s && !localStorage.getItem('evarel-session-v2')) localStorage.setItem('evarel-session-v2', JSON.stringify(s)); }, [API, user && user.session ? user.session : null]);
  await serveLocalAs(ctx);
  return ctx;
}

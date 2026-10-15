/* ประตูสมัครรับ Web Push (15 ต.ค. 2026) | จับบั๊ก "อนุญาตแล้วแต่แจ้งเตือนไม่เด้ง" เพราะเครื่องไม่เคยลงทะเบียนกับ Worker
   ต่างจากเทสต์เดิมที่รันโหมดเดโม (ไม่มีหลังบ้าน จึงไม่เคยแตะเส้นทาง Push) เทสต์นี้ตั้ง EVAREL_API และจำลองหลังบ้านครบ
   ตรวจ "สัญญา" ระหว่างแอปกับ Worker: คำขอที่ส่งออกต้องมี endpoint + keys.p256dh + keys.auth และ Authorization: Bearer
   รัน: node tests/notify_push.test.mjs [url] (ต้องเปิดเซิร์ฟเวอร์ไฟล์ของ build/web หรือ app/web ที่พอร์ต 8776 ก่อน) */
import { chromium } from 'playwright'; import fs from 'fs';
const U = process.argv[2] || 'http://localhost:8776/index.html';
const API = 'https://api.test.invalid';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/'; const exe = d + fs.readdirSync(d).find((x) => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + ' :: ' + String(e.message || e).slice(0, 220)); } };
const eq = (a, c, m = '') => { if (JSON.stringify(a) !== JSON.stringify(c)) throw new Error(m + ' ได้ ' + JSON.stringify(a) + ' ควรเป็น ' + JSON.stringify(c)); };
const VAPID = 'BNK8NQIzZGgJgNyV69-6rFGd-NdRzuiMtJcjGPfdHNKbJxqp-u0B9FC2hKMCzJm9GTIU99dyD_nm6-DuO7pa2o0'; // กุญแจสาธารณะจริงของ forge (ยาว 65 ไบต์ ขึ้นต้น 0x04 = จุด P-256 แบบไม่บีบอัด) ไม่ใช่ความลับ

/* สร้างหน้าใหม่พร้อมหลังบ้านจำลอง mode: ok | key500 | sub500 | sub401 | sub403 */
async function open(mode, perm) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Bangkok', serviceWorkers: 'block' });
  const calls = [];
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr/, (r) => r.abort());
  await ctx.route(API + '/**', async (r) => {
    const rq = r.request(), path = new URL(rq.url()).pathname; calls.push({ path, method: rq.method(), auth: rq.headers()['authorization'] || '', body: rq.postData() || '' });
    const J = (s, o) => r.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(o) });
    if (rq.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (path === '/api/push/key') return mode === 'key500' ? J(500, { error: 'x' }) : J(200, { publicKey: VAPID });
    if (path === '/api/push/subscribe') return mode === 'sub500' ? J(500, { error: 'x' }) : mode === 'sub401' ? J(401, { error: 'x' }) : mode === 'sub403' ? J(403, { error: 'limit' }) : J(200, { ok: true });
    if (path === '/api/items') return J(200, { items: [] });
    return J(200, {});
  });
  await ctx.addInitScript(({ API, perm }) => {
    window.EVAREL_API = API;
    localStorage.setItem('evarel-session-v2', JSON.stringify({ access_token: 'tok-abc', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1', email: 'a@b.c', name: 'N', provider: 'email' } }));
    /* จำลอง Notification + PushManager (headless ไม่มีบริการ push จริง) เก็บสิ่งที่แอปส่งให้ pushManager ไว้ตรวจ */
    let p = perm; window.__asked = 0; window.__subOpts = null; window.__unsub = 0; let cur = null;
    Object.defineProperty(Notification, 'permission', { get: () => p, configurable: true });
    Notification.requestPermission = async () => { window.__asked++; p = perm === 'default' ? 'granted' : perm; return p; };
    const mkSub = (key) => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/TESTENDPOINT', options: { applicationServerKey: key.buffer }, unsubscribe: async () => { window.__unsub++; cur = null; return true; }, toJSON() { return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: 'P256DHKEY', auth: 'AUTHKEY' } }; } });
    const pm = { getSubscription: async () => cur, subscribe: async (o) => { window.__subOpts = { userVisibleOnly: o.userVisibleOnly, keyLen: o.applicationServerKey.length, first: o.applicationServerKey[0] }; cur = mkSub(o.applicationServerKey); return cur; } };
    const fakeReg = { pushManager: pm, active: {}, showNotification: async () => {} };
    Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve(fakeReg), register: async () => fakeReg, getRegistration: async () => fakeReg, addEventListener() {}, controller: null }, configurable: true });
    window.PushManager = window.PushManager || function () {};
    window.__setCur = (k) => { cur = k ? mkSub(new Uint8Array(k)) : null; };
  }, { API, perm });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  await p.goto(U); await p.waitForSelector('[data-tab="all"]', { timeout: 10000 }); await p.waitForTimeout(1200);
  return { ctx, p, calls, errs };
}
const clear = (calls) => calls.splice(0, calls.length);

/* ---------- A: urlB64ToU8 (ฟังก์ชันล้วน) ---------- */
{
  const { ctx, p } = await open('ok', 'default');
  await t('P1 urlB64ToU8: base64url (มี - และ _) แปลงเป็นไบต์ถูก', async () => eq(await p.evaluate(() => Array.from(urlB64ToU8('-_8'))), [251, 255]));
  await t('P2 urlB64ToU8: กุญแจ VAPID จริงยาว 65 ไบต์ ขึ้นต้น 0x04', async () => { const r = await p.evaluate((k) => { const u = urlB64ToU8(k); return [u.length, u[0]]; }, VAPID); eq(r, [65, 4]); });
  await t('P3 urlB64ToU8: ค่าว่าง/ไม่ใช่ข้อความ -> throw (ไม่ส่งกุญแจเสียให้เบราว์เซอร์)', async () => eq(await p.evaluate(() => { let n = 0; for (const v of ['', null, undefined, 5]) { try { urlB64ToU8(v); } catch (e) { n++; } } return n; }), 4));
  await ctx.close();
}

/* ---------- B: เส้นทางสำเร็จ (อนุญาตแล้ว = เครื่องของ Master) ---------- */
{
  const { ctx, p, calls, errs } = await open('ok', 'granted');
  await p.waitForTimeout(1500); // pushAutoSync ทำงานเองหลังบูต
  await t('P4 เปิดแอปครั้งแรก (อนุญาตแล้ว ยังไม่เคยลงทะเบียน): ลงทะเบียนเองอัตโนมัติ ไม่ต้องกดปุ่ม', async () => { const s = calls.filter((c) => c.path === '/api/push/subscribe'); eq(s.length, 1, 'จำนวนคำขอ subscribe'); });
  await t('P5 คำขอ subscribe: POST + Bearer โทเคนผู้ใช้ + endpoint + keys.p256dh + keys.auth ครบ (สัญญากับ Worker)', async () => { const s = calls.find((c) => c.path === '/api/push/subscribe'); eq(s.method, 'POST'); eq(s.auth, 'Bearer tok-abc'); const o = JSON.parse(s.body); eq(o.endpoint, 'https://fcm.googleapis.com/fcm/send/TESTENDPOINT'); eq(o.keys, { p256dh: 'P256DHKEY', auth: 'AUTHKEY' }); });
  await t('P6 pushManager.subscribe ถูกเรียกด้วย userVisibleOnly=true และกุญแจ VAPID 65 ไบต์', async () => eq(await p.evaluate(() => window.__subOpts), { userVisibleOnly: true, keyLen: 65, first: 4 }));
  await t('P7 ไม่ขอสิทธิ์ซ้ำเมื่ออนุญาตอยู่แล้ว (ไม่เด้งหน้าต่างขอสิทธิ์ตอนเปิดแอป)', async () => eq(await p.evaluate(() => window.__asked), 0));
  await t('P8 จำสถานะลงเครื่อง (pushSavedState) หลังสำเร็จ', async () => eq(await p.evaluate(() => !!pushSavedState()), true));
  clear(calls); await p.reload(); await p.waitForSelector('[data-tab="all"]'); await p.waitForTimeout(1500);
  await t('P9 เปิดแอปรอบสอง (ลงทะเบียนแล้ว): ไม่ยิง subscribe ซ้ำ (ไม่เปลือง quota ฟรี)', async () => eq(calls.filter((c) => c.path === '/api/push/subscribe').length, 0));
  await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(600);
  await t('P10 หน้าตั้งค่า: สถานะ "อนุญาตแล้ว" + พร้อมรับ และไม่มีปุ่ม (ลงทะเบียนครบ)', async () => { const x = await p.evaluate(() => document.body.innerText); eq(/เครื่องนี้พร้อมรับการแจ้งเตือน/.test(x), true); eq(await p.locator('[data-act="notify"]').count(), 0); });
  await t('P11 ไม่มี error ของหน้าเว็บ', async () => eq(errs, []));
  await ctx.close();
}

/* ---------- C: สถานะต้องไม่โกหก: อนุญาตแล้วแต่ลงทะเบียนไม่สำเร็จ ---------- */
{
  const { ctx, p } = await open('sub500', 'granted'); await p.waitForTimeout(1500);
  await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(600);
  await t('P12 ลงทะเบียนไม่สำเร็จ (เซิร์ฟเวอร์ 500): ห้ามบอก "พร้อมรับ" ต้องบอกว่ายังไม่ได้ลงทะเบียน + มีปุ่มให้ลองใหม่', async () => { const x = await p.evaluate(() => document.body.innerText); eq(/เครื่องนี้พร้อมรับการแจ้งเตือน/.test(x), false, 'โกหกว่าพร้อม'); eq(/ยังไม่ได้ลงทะเบียน/.test(x), true); eq(await p.locator('[data-act="notify"]').innerText(), 'ลงทะเบียนเครื่องนี้'); });
  await t('P13 ไม่บันทึกสถานะเมื่อล้ม (ไม่จำว่าสำเร็จ)', async () => eq(await p.evaluate(() => pushSavedState()), null));
  await ctx.close();
}

/* ---------- D: ผู้ใช้กดปุ่ม (ยังไม่เคยอนุญาต) ---------- */
{
  const { ctx, p, calls } = await open('ok', 'default');
  await t('P14 ยังไม่อนุญาต: เปิดแอปแล้วไม่ลงทะเบียนเองและไม่ขอสิทธิ์ (ต้องรอผู้ใช้กด)', async () => { eq(calls.filter((c) => c.path.startsWith('/api/push')).length, 0); eq(await p.evaluate(() => window.__asked), 0); });
  await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(500);
  await t('P15 หน้าตั้งค่ามีปุ่ม "อนุญาตการแจ้งเตือน"', async () => eq(await p.locator('[data-act="notify"]').innerText(), 'อนุญาตการแจ้งเตือน'));
  await p.click('[data-act="notify"]'); await p.waitForTimeout(1500);
  await t('P16 กดปุ่ม: ขอสิทธิ์ 1 ครั้ง แล้วลงทะเบียนกับ Worker จริง (นี่คือจุดที่เดิมขาดไป)', async () => { eq(await p.evaluate(() => window.__asked), 1); eq(calls.filter((c) => c.path === '/api/push/subscribe').length, 1); });
  await t('P17 หลังกด: สถานะเปลี่ยนเป็นพร้อมรับ และปุ่มหาย', async () => { const x = await p.evaluate(() => document.body.innerText); eq(/เครื่องนี้พร้อมรับการแจ้งเตือน/.test(x), true); eq(await p.locator('[data-act="notify"]').count(), 0); });
  await ctx.close();
}

/* ---------- E: กรณีผิดพลาดต้องบอกผู้ใช้ตามจริง ไม่ throw ---------- */
for (const [mode, why] of [['key500', 'no-key'], ['sub401', 'auth'], ['sub403', 'limit'], ['sub500', 'server']]) {
  const { ctx, p } = await open(mode, 'default');
  await t(`P18 ${mode}: pushSubscribe คืน {ok:false, why:'${why}'} ไม่ throw`, async () => eq(await p.evaluate(() => pushSubscribe(true)), { ok: false, why }));
  await ctx.close();
}
{
  const { ctx, p } = await open('ok', 'denied');
  await t('P19 ผู้ใช้ปิดสิทธิ์ไว้ (denied): ไม่ลงทะเบียน ไม่ขอสิทธิ์ซ้ำ คืน why=denied', async () => { eq(await p.evaluate(() => pushSubscribe(true)), { ok: false, why: 'denied' }); eq(await p.evaluate(() => window.__asked), 0); });
  await ctx.close();
}

/* ---------- F: กุญแจ VAPID เปลี่ยน (เช่นสลับชุด forge/production) ---------- */
{
  const { ctx, p, calls } = await open('ok', 'granted'); await p.waitForTimeout(1200);
  await p.evaluate(() => { pushSaveState(null); window.__setCur(new Array(65).fill(7)); }); clear(calls);
  await t('P20 มีการสมัครเก่าที่ใช้กุญแจคนละดอก: ยกเลิกของเก่าแล้วสมัครใหม่ด้วยกุญแจปัจจุบัน (ไม่งั้น Push ไม่มีวันถึง)', async () => { const r = await p.evaluate(() => pushSubscribe(false)); eq(r, { ok: true }); eq(await p.evaluate(() => window.__unsub), 1, 'unsubscribe ของเก่า'); eq(await p.evaluate(() => window.__subOpts.first), 4); });
  await ctx.close();
}

await b.close(); console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

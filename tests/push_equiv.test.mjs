/* พิสูจน์ F6 (10-services__notify ส่วน Web Push): ตรรกะสมัคร push ที่ย้ายไป core/notify (pushSubscribeOf/urlB64ToU8/PUSH_WHY) ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบไฟล์เก่า (อ่าน Notification/navigator/fetch ตรง) กับไฟล์ใหม่ (ตัวห่อส่ง deps เข้า core) บนเบราว์เซอร์จริง จำลองสิทธิ์/กุญแจ/การ์ด push/เครือข่าย ล็อกการเรียกทุกครั้ง
   ใช้: node tests/push_equiv.test.mjs <ไฟล์ 10-services__notify.js เดิม> <ไฟล์ core/notify.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..8 node tests/push_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/notify_m10_at_head.js', 'utf8');
const OLDCORE = fs.readFileSync(process.argv[3] || '/tmp/notify_core_at_head.js', 'utf8');
const NEWM = fs.readFileSync('app/web/js/m/10-services__notify.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/m/core/notify.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

/* ฉีดความผิดลงโค้ดจริง (ฝั่งใหม่) ทีละแบบ — เทสต์ต้องจับให้ได้ทุกแบบ */
function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/r\.status === 403/, 'r.status === 402'); /* เดารหัส 403 ผิด -> limit หาย */
  if (which === 2) return R(/if \(have\.length !== want\.length \|\| have\.some\(\(v[^)]*\)\s*=>\s*v !== want\[i\]\)\)/, 'if (false)'); /* ไม่ยกเลิกสมัครเดิมเมื่อกุญแจเปลี่ยน */
  if (which === 3) return R(/4 - b64\.length % 4/, '4 - b64.length % 3'); /* คำนวณ padding ผิด -> กุญแจเพี้ยน */
  if (which === 4) return R(/catch \((?:e|err)\)\s*\{\s*return\s*\{\s*ok:\s*false,\s*why:\s*["']auth["']\s*\}\s*;?\s*\}/, 'catch (e) { return { ok: true } }'); /* token ล้มแต่บอกว่าสำเร็จ */
  if (which === 5) return R(/save:\s*pushSaveState/, 'save: () => {}'); /* ไม่บันทึกสถานะหลังสมัคร */
  if (which === 6) return R(/if \(deps\.permission\(\) === ['"]denied['"]\)/, 'if (false)'); /* ข้ามตรวจถูกปิดสิทธิ์ */
  if (which === 7) return R(/return \{\s*ok:\s*false,\s*why:\s*p === ['"]denied['"] \? ['"]denied['"] : ['"]not-asked['"]\s*\}/, 'return { ok: true }'); /* ผู้ใช้ปฏิเสธแต่บอกว่าสำเร็จ */
  if (which === 8) return R(/if \(!deps\.api\(\)\)/, 'if (false)'); /* ข้ามตรวจโหมดไม่มีหลังบ้าน */
  return src;
}
const NEWMi = inj === 5 ? inject(NEWM, 5) : NEWM; /* 5 ฉีดที่ตัวห่อ (deps.save) — จุดฉีดอื่นอยู่ใน core ทั้งหมด */
const NEWCOREi = inj && inj !== 5 ? inject(NEWCORE, inj) : NEWCORE;

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');

/* คีย์ VAPID ปลอม (base64url) — ฝั่งเก่า/ใหม่ถอดด้วย atob เดียวกัน */
const KEY = 'BQabC9-_-def1234', KEY2 = 'BQzz_9876xyz';

/* ซากเรียกที่บันทึก: fetch + subscribe + unsubscribe + ขอสิทธิ์ */
const HARNESS = `
/* global ที่โมดูลอ่าน "ตอนโหลด" (ในแอปจริง 01-core__constants ปักไว้ก่อน m/10 โหลด) ต้องมีก่อน import */
window.REM_PRESETS = [0, 10, 30, 60, 1440];
Date.now = () => 1700000000000; /* ล็อกเวลา: สถานะที่จำมี at จาก Date.now() เทียบกันต้องได้เลขเดียวกัน */
window.__KEY_RULE = [{ path: '/push/key', json: { publicKey: 'BQabC9-_-def1234' } }, { path: '/push/subscribe', json: { ok: true } }];
window.__reset = (perm, rules, existingSubKey) => {
  window.SUPA_API = 'https://api.test'; window.ST = { Repo: { token: async () => { if (window.__tokenThrow) throw new Error('tok'); return 'TK' } } };
  window.PushManager = {};
  window.__calls = []; window.__subCount = 0; window.__unsubCount = 0; window.__permReq = 0;
  window.__perm = perm; window.__askResult = null; window.__rules = rules; window.__subKey = existingSubKey; window.__subThrow = false; window.__tokenThrow = false; window.__swThrow = false;
  window.Notification = { get permission() { return window.__perm }, requestPermission: async () => { window.__permReq++; return window.__askResult ?? window.__perm } };
  const u8 = (k) => { const pad = '='.repeat((4 - k.length % 4) % 4), raw = atob((k + pad).replace(/-/g, '+').replace(/_/g, '/')); return new Uint8Array([...raw].map(c => c.charCodeAt(0))) };
  window.__u8 = u8;
  const reg = { pushManager: {
    getSubscription: async () => window.__subKey ? { endpoint: 'https://push.test/ep-' + window.__subKey.slice(0, 6), options: { applicationServerKey: u8(window.__subKey) }, unsubscribe: async () => { window.__unsubCount++; return true }, toJSON: () => ({ endpoint: 'https://push.test/ep-' + window.__subKey.slice(0, 6), keys: { p256dh: 'k', auth: 'a' } }) } : null,
    subscribe: async (o) => { if (window.__subThrow) throw new TypeError('no sw'); window.__subCount++; return { endpoint: 'https://push.test/ep-new', options: o, toJSON: () => ({ endpoint: 'https://push.test/ep-new', keys: { p256dh: 'k', auth: 'a' } }) } }
  } };
  Object.defineProperty(navigator, 'serviceWorker', { value: { get ready() { if (window.__swThrow) throw new TypeError('sw down'); return reg } }, configurable: true });
  globalThis.fetch = async (url, init) => {
    const u = String(url), r = window.__rules.find(x => u.includes(x.path));
    window.__calls.push({ url: u.replace(window.SUPA_API, ''), method: init?.method || 'GET', auth: init?.headers?.Authorization || '', body: init?.body ?? null });
    if (!r) throw new TypeError('no rule for ' + u);
    if (r.netfail) throw new TypeError('down');
    return new Response(r.text !== undefined ? r.text : JSON.stringify(r.json ?? {}), { status: r.status || 200, headers: { 'Content-Type': 'application/json' } });
  };
  localStorage.clear();
};
window.__snapshot = async () => ({ saved: localStorage.getItem('evarel-push-sub'), calls: window.__calls, subCount: window.__subCount, unsubCount: window.__unsubCount, permReq: window.__permReq });
`;
await p.evaluate(HARNESS);

const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
const load = async (tag, mSrc, coreSrc) => {
  /* สร้าง blob URL ในเพจเท่านั้น (blob:nodedata ของ Node ที่เบราว์เซอร์ fetch ไม่ได้) */
  const err = await p.evaluate(async ({ mSrc, coreSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const coreU = mk(coreSrc + '\n//core ' + tag);
    const src = mSrc.replace(/\.\/core\/notify\.js/g, coreU);
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 400) }
  }, { mSrc, coreSrc, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};
const KEY_RULE = [{ path: '/push/key', json: { publicKey: KEY } }, { path: '/push/subscribe', json: { ok: true } }];

/* สถานการณ์ทั้งหมด: [ชื่อ, ตั้งค่า stub ก่อนเรียก, askPermission] — ฝั่งเก่า/ใหม่เรียกเหมือนกันเป๊ะ */
const SCN = [
  ['เบราว์เซอร์ไม่รองรับ', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE); delete window.Notification; delete window.PushManager }) }, undefined],
  ['ไม่มีหลังบ้าน', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE); window.SUPA_API = '' }) }, undefined],
  ['สิทธิ์ถูกปิด', async () => { await p.evaluate(() => { window.__reset('denied', window.__KEY_RULE) }) }, undefined],
  ['ยังไม่อนุญาต และไม่ขอสิทธิ์', async () => { await p.evaluate(() => { window.__reset('default', window.__KEY_RULE) }) }, false],
  ['ขอสิทธิ์แล้วถูกปฏิเสธ', async () => { await p.evaluate(() => { window.__reset('default', window.__KEY_RULE); window.__askResult = 'denied' }) }, true],
  ['ขอสิทธิ์แล้วยังไม่ตัดสินใจ', async () => { await p.evaluate(() => { window.__reset('default', window.__KEY_RULE); window.__askResult = 'default' }) }, true],
  ['สมัครใหม่สำเร็จครบวงจร', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE) }) }, undefined],
  ['token ล้ม -> auth', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE); window.__tokenThrow = true }) }, undefined],
  ['/push/key ตอบ 500 -> no-key', async () => { await p.evaluate(() => { window.__reset('granted', [{ path: '/push/key', status: 500, json: {} }]) }) }, undefined],
  ['/push/key เครือข่ายล้ม -> no-key', async () => { await p.evaluate(() => { window.__reset('granted', [{ path: '/push/key', netfail: true }]) }) }, undefined],
  ['serviceWorker ล้ม -> subscribe', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE); window.__swThrow = true }) }, undefined],
  ['มีสมัครเดิมกุญแจตรง -> ไม่สมัครซ้ำ', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE, 'KEY') }) }, undefined],
  ['มีสมัครเดิมกุญแจเปลี่ยน -> ยกเลิกแล้วสมัครใหม่', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE); window.__subKey = null }) }, undefined],
  ['pushManager.subscribe โยน -> subscribe', async () => { await p.evaluate(() => { window.__reset('granted', window.__KEY_RULE); window.__subThrow = true }) }, undefined],
  ['POST /push/subscribe 403 -> limit', async () => { await p.evaluate(() => { window.__reset('granted', [{ path: '/push/key', json: { publicKey: 'BQabC9-_-def1234' } }, { path: '/push/subscribe', status: 403, json: {} }]) }) }, undefined],
  ['POST /push/subscribe 401 -> auth', async () => { await p.evaluate(() => { window.__reset('granted', [{ path: '/push/key', json: { publicKey: 'BQabC9-_-def1234' } }, { path: '/push/subscribe', status: 401, json: {} }]) }) }, undefined],
  ['POST /push/subscribe 500 -> server', async () => { await p.evaluate(() => { window.__reset('granted', [{ path: '/push/key', json: { publicKey: 'BQabC9-_-def1234' } }, { path: '/push/subscribe', status: 500, json: {} }]) }) }, undefined],
  ['POST /push/subscribe เครือข่ายล้ม -> server', async () => { await p.evaluate(() => { window.__reset('granted', [{ path: '/push/key', json: { publicKey: 'BQabC9-_-def1234' } }, { path: '/push/subscribe', netfail: true }]) }) }, undefined],
];

/* ตั้งค่าคีย์สมัครเดิมต่อสถานการณ์ (สถานการณ์ 'กุญแจตรง' ใช้ KEY เดียวกับ /push/key; 'กุญแจเปลี่ยน' ต้องถูกตั้งที่ __reset แล้วทับเป็น KEY2) */
const SUB_KEY_AT_RESET = { 11: 'KEY', 12: 'KEY2' };

let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')) } };
const recs = {};
for (const [tag, mSrc, coreSrc] of [['old', OLDM, OLDCORE], ['new', NEWMi, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const list = [];
  for (let i = 0; i < SCN.length; i++) {
    const [name, setup, ask] = SCN[i];
    await setup();
    await p.evaluate((k) => { if (k === 'KEY' || k === 'KEY2') { const u8 = window.__u8; /* ตั้งสมัครเดิมหลัง reset: ทับ reg ด้วย key ที่กำหนด */ window.__subKey = k === 'KEY' ? 'BQabC9-_-def1234' : 'BQzz_9876xyz' } }, String(SUB_KEY_AT_RESET[i] || ''));
    const r = await p.evaluate(async (ask) => { const out = await window.pushSubscribe(ask); return { out: JSON.parse(JSON.stringify(out)), snap: await window.__snapshot() } }, ask);
    /* กุญแจสมัครเดิมของสถานการณ์ 11 ต้องเป็นกุญแจเดียวกับ /push/key (จึงไม่สมัครซ้ำ) — สถานการณ์ 12 ตั้ง KEY2 แล้ว /push/key ให้ KEY ใหม่ */
    list.push({ name, r });
  }
  /* pushWhyText + urlB64ToU8 เทียบตรง ๆ (ห่อ try ให้ความผิดของ urlB64ToU8 โดนตัวเทียบจับ ไม่ใช่ crash) */
  const extra = await p.evaluate(async () => {
    const whys = ['unsupported', 'denied', 'no-backend', 'not-asked', 'auth', 'no-key', 'subscribe', 'server', 'limit', 'xyz'];
    const texts = whys.map(w => window.pushWhyText(w));
    let bytes = null, bytesThrows = false; try { bytes = [...window.urlB64ToU8('BQabC9-_-def1234')] } catch (e) { bytesThrows = true }
    let emptyThrows = false; try { window.urlB64ToU8('') } catch (e) { emptyThrows = true }
    return { texts, bytes, bytesThrows, emptyThrows };
  });
  recs[tag] = { list, extra };
}
for (let i = 0; i < SCN.length; i++) {
  const A = recs.old.list[i], B = recs.new.list[i];
  t(A.name + ' | ค่าที่คืน', JSON.stringify(A.r.out) === JSON.stringify(B.r.out), JSON.stringify(A.r.out) + ' vs ' + JSON.stringify(B.r.out));
  t(A.name + ' | สถานะที่จำ+การเรียกทั้งหมด', JSON.stringify(A.r.snap) === JSON.stringify(B.r.snap), JSON.stringify(A.r.snap) + ' vs ' + JSON.stringify(B.r.snap));
}
t('pushWhyText คืนข้อความเดิมทุกรหัส', JSON.stringify(recs.old.extra.texts) === JSON.stringify(recs.new.extra.texts), JSON.stringify(recs.old.extra.texts) + ' vs ' + JSON.stringify(recs.new.extra.texts));
t('urlB64ToU8 ถอดไบต์เดียวกัน', JSON.stringify(recs.old.extra.bytes) === JSON.stringify(recs.new.extra.bytes) && recs.old.extra.bytes !== null && recs.old.extra.bytes.length > 0, JSON.stringify(recs.old.extra.bytes) + ' vs ' + JSON.stringify(recs.new.extra.bytes));
t('urlB64ToU8 สตริงว่างโยนทั้งสองฝั่ง', recs.old.extra.emptyThrows === recs.new.extra.emptyThrows && recs.old.extra.emptyThrows);
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);

/* เทสต์ตัวส่งจริง: พิสูจน์ว่าข้อความที่เข้ารหัสแล้ว "ถอดรหัสกลับได้ตรงเดิม" ด้วยกุญแจฝั่งผู้รับที่สร้างเองตามมาตรฐาน RFC 8291 (aes128gcm)
   ไม่พิสูจน์ว่า FCM/Apple ยอมรับ -> ต้องยืนยันที่ forge กับเครื่องจริง */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild /tmp/evarel-repo/app/api/src/systems/notify/sender.ts --bundle --format=esm --outfile=/tmp/notify-sender-bundle.mjs --log-level=error --alias:webpush-webcrypto=/tmp/evarel-deploy/node_modules/webpush-webcrypto/lib/webpush.js`);
const M = await import(pathToFileURL('/tmp/notify-sender-bundle.mjs').href + '?v=' + Date.now());
const wp = await import(pathToFileURL('/tmp/evarel-deploy/node_modules/webpush-webcrypto/lib/webpush.js').href);
wp.setWebCrypto(crypto.webcrypto);
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' :: ' + String(e.message || e).slice(0, 240)); } };
const b64u = (b) => Buffer.from(b).toString('base64url');
// ผู้รับ (เบราว์เซอร์จำลอง): คู่กุญแจ ECDH P-256 + auth secret 16 ไบต์
const rcv = crypto.createECDH('prime256v1'); rcv.generateKeys(); const auth = crypto.randomBytes(16);
const subRow = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', p256dh: b64u(rcv.getPublicKey()), auth: b64u(auth) };
const vk = await wp.ApplicationServerKeys.generate(); const VAPID = JSON.stringify(await vk.toJSON());
const hkdf = (salt, ikm, info, len) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len));
/* ไลบรารีนี้ใช้รูปแบบ aesgcm (draft-ietf-webpush-encryption-04) ไม่ใช่ aes128gcm: salt อยู่ใน header Encryption, กุญแจผู้ส่งอยู่ใน Crypto-Key (dh=)
   ผ่านบน Android จริงเมื่อ 9 ต.ค. 2026 | ความเสี่ยง: บริการ Push อื่น (เช่น Apple) อาจไม่รับรูปแบบเก่า ยังไม่ได้พิสูจน์ */
function decrypt(headers, body) {
  const H = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const salt = Buffer.from(/salt=([\w-]+)/.exec(H.encryption)[1], 'base64url');
  const asPub = Buffer.from(/dh=([\w-]+)/.exec(H['crypto-key'])[1], 'base64url');
  const secret = rcv.computeSecret(asPub);
  const lenPre = (b) => { const l = Buffer.alloc(2); l.writeUInt16BE(b.length); return Buffer.concat([l, b]); };
  const prk = hkdf(auth, secret, Buffer.from('Content-Encoding: auth\0'), 32);
  const ctx = Buffer.concat([Buffer.from('P-256\0'), lenPre(rcv.getPublicKey()), lenPre(asPub)]);
  const cek = hkdf(salt, prk, Buffer.concat([Buffer.from('Content-Encoding: aesgcm\0'), ctx]), 16);
  const nonce = hkdf(salt, prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), ctx]), 12);
  const buf = Buffer.from(body); const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(buf.subarray(buf.length - 16));
  const pt = Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]);
  const pad = pt.readUInt16BE(0); return pt.subarray(2 + pad).toString('utf8');   // 2 ไบต์แรก = ความยาว padding
}
await t('E1 เข้ารหัสแล้วผู้รับถอดกลับได้ข้อความเดิม (ภาษาไทย)', async () => {
  let got; const f = async (url, o) => { got = { url, o }; return new Response(null, { status: 201 }); };
  const send = M.makeSender({ VAPID_KEYS_JSON: VAPID }, f); const r = await send(subRow, { title: 'Evarel', body: 'ประชุมทีม 09:00', tag: 't1' });
  assert.equal(r.status, 201); assert.equal(got.url, subRow.endpoint);
  assert.deepEqual(JSON.parse(decrypt(got.o.headers, got.o.body)), { title: 'Evarel', body: 'ประชุมทีม 09:00', tag: 't1' });
});
await t('E2 header ครบ: Authorization(WebPush jwt), Content-Encoding aesgcm, TTL', async () => {
  let h; const f = async (u, o) => { h = o.headers; return new Response(null, { status: 201 }); };
  await M.makeSender({ VAPID_KEYS_JSON: VAPID }, f)(subRow, { title: 'a', body: 'b', tag: 'c' });
  const L = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
  assert.ok(/^WebPush [\w-]+\.[\w-]+\.[\w-]+$/.test(L.authorization), 'รูปแบบ Authorization'); assert.equal(L['content-encoding'], 'aesgcm'); assert.equal(String(L.ttl), '14400');
});
await t('E2b นโยบาย TTL: 4 ชั่วโมง ครอบคลุมออฟไลน์ช่วงเรียน/เดินทาง แต่ไม่ปล่อยเตือนเก่าเกินครึ่งวัน', async () => {
  assert.equal(M.PUSH_TTL_SECONDS, 4 * 3600);
  assert.ok(M.PUSH_TTL_SECONDS > 600, 'ต้องยาวกว่าค่าเดิม 10 นาที ไม่งั้นออฟไลน์เกิน 10 นาทีพลาดเตือน');
  assert.ok(M.PUSH_TTL_SECONDS < 12 * 3600, 'ต้องสั้นกว่าครึ่งวัน ไม่งั้นเด้งเตือนเก่าที่หมดประโยชน์แล้ว');
});
await t('E3 ไม่รั่ว private key ของ VAPID ลงในคำขอที่ส่งออก', async () => {
  let all = ''; const f = async (u, o) => { all = JSON.stringify(o.headers) + Buffer.from(o.body).toString('latin1'); return new Response(null, { status: 201 }); };
  await M.makeSender({ VAPID_KEYS_JSON: VAPID }, f)(subRow, { title: 'a', body: 'b', tag: 'c' });
  assert.ok(!all.includes(JSON.parse(VAPID).privateKey), 'private key อยู่ในคำขอ');
});
await t('E4 บริการ Push ค้าง: ยกเลิกตาม timeout แล้วคืนสถานะล้มชั่วคราว (0) ไม่ค้างทั้งรอบ', async () => {
  const f = (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('aborted'))));
  const orig = M.SEND_TIMEOUT_MS; const t0 = Date.now();
  const r = await M.makeSender({ VAPID_KEYS_JSON: VAPID }, f)(subRow, { title: 'a', body: 'b', tag: 'c' });
  assert.equal(r.status, 0); assert.ok(Date.now() - t0 < orig + 2500, 'ใช้เวลา ' + (Date.now() - t0));
});
await t('E5 เครือข่ายล้ม (fetch throw) -> สถานะ 0 ไม่ throw', async () => {
  const r = await M.makeSender({ VAPID_KEYS_JSON: VAPID }, async () => { throw new Error('net'); })(subRow, { title: 'a', body: 'b', tag: 'c' }); assert.equal(r.status, 0);
});
await t('E6 สถานะจากบริการ Push ส่งต่อตามจริง (404/410/429/500)', async () => {
  for (const code of [404, 410, 429, 500]) { const r = await M.makeSender({ VAPID_KEYS_JSON: VAPID }, async () => new Response(null, { status: code }))(subRow, { title: 'a', body: 'b', tag: 'c' }); assert.equal(r.status, code); }
});
await t('E7 VAPID พัง (JSON เสีย) -> ตัวสร้างตัวส่ง throw ชัดเจนตั้งแต่ต้น ไม่ใช่ล้มเงียบตอนส่ง', async () => {
  assert.throws(() => M.makeSender({ VAPID_KEYS_JSON: '{broken' }, fetch));
});
await t('E8 กุญแจ VAPID เปลี่ยน -> ใช้กุญแจใหม่ (ไม่ติดแคชเก่า)', async () => {
  const vk2 = await wp.ApplicationServerKeys.generate(); const V2 = JSON.stringify(await vk2.toJSON()); const auths = [];
  const f = async (u, o) => { auths.push(o.headers.Authorization || o.headers.authorization); return new Response(null, { status: 201 }); };
  await M.makeSender({ VAPID_KEYS_JSON: VAPID }, f)(subRow, { title: 'a', body: 'b', tag: 'c' }); await M.makeSender({ VAPID_KEYS_JSON: V2 }, f)(subRow, { title: 'a', body: 'b', tag: 'c' });
  const pay = (a) => JSON.parse(Buffer.from(a.split(' ')[1].split('.')[1], 'base64url').toString()); assert.ok(auths[0] !== auths[1], 'JWT ต้องต่างเมื่อกุญแจต่าง'); assert.ok(pay(auths[0]).aud && pay(auths[1]).aud);
});
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);

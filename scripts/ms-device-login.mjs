/* ล็อกอิน Microsoft ครั้งเดียวแบบ device code เพื่อรับ refresh token สำหรับส่งเมลผ่าน Graph
   ใช้: MS_CLIENT_ID=<client id> [MS_TENANT=<tenant id หรือ common>] node scripts/ms-device-login.mjs
   สิ่งที่พิมพ์: URL กับรหัสให้ผู้ใช้เอาไปกรอก (รหัสไม่ใช่ความลับระยะยาว)
   สิ่งที่บันทึก: /tmp/ordivel-ms-refresh-token.txt (โหมด 600) — เอาไปตั้งเป็น Worker secret ชื่อ MS_REFRESH_TOKEN
   ไม่พิมพ์ refresh token ออกหน้าจอเด็ดขาด */
import fs from 'node:fs';

const CLIENT_ID = process.env.MS_CLIENT_ID || '';
const SCOPE = 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access';
/* tenant: 'common' ใช้ได้กับแอปที่รองรับทั้งบัญชีองค์กรและบัญชีส่วนตัว (กรณีจดทะเบียนแอปใน tenant ของเรา)
   'consumers' ใช้เมื่อแอปตั้งรองรับเฉพาะบัญชีส่วนตัว — เลือกผ่าน MS_TENANT */
const TENANT = process.env.MS_TENANT || 'common';
if (!CLIENT_ID) { console.error('ต้องตั้ง MS_CLIENT_ID ก่อน (Application (client) ID จาก Entra)'); process.exit(2); }

const post = async (url, params) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const dc = await post(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`, { client_id: CLIENT_ID, scope: SCOPE });
if (!dc.body.device_code) { console.error('ขอรหัสอุปกรณ์ไม่สำเร็จ:', dc.status, JSON.stringify(dc.body).slice(0, 300)); process.exit(1); }

console.log('\n=== ขั้นที่ต้องทำเอง (ครั้งเดียว) ===');
console.log('1) เปิด:', dc.body.verification_uri);
console.log('2) กรอกรหัส:', dc.body.user_code);
console.log('3) ล็อกอินด้วยบัญชีที่ต้องการใช้ส่งเมล แล้วกดยอมรับสิทธิ์');
console.log(`(รหัสหมดอายุใน ${Math.round((dc.body.expires_in || 900) / 60)} นาที)\nกำลังรอ...`);

const interval = Number(dc.body.interval || 5);
const deadline = Date.now() + (Number(dc.body.expires_in || 900) * 1000);
for (;;) {
  await new Promise((r) => setTimeout(r, interval * 1000));
  if (Date.now() > deadline) { console.error('หมดเวลารอ'); process.exit(1); }
  const t = await post(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, { grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: CLIENT_ID, device_code: dc.body.device_code });
  if (t.body.access_token) {
    fs.writeFileSync('/tmp/ordivel-ms-refresh-token.txt', String(t.body.refresh_token || ''), { mode: 0o600 });
    console.log('สำเร็จ: ได้โทเคนแล้ว');
    console.log('บันทึก refresh token ไว้ที่ /tmp/ordivel-ms-refresh-token.txt (ยาว', String(t.body.refresh_token || '').length, 'ตัวอักษร)');
    console.log('ต่อไป: ตั้งเป็น Worker secret ชื่อ MS_REFRESH_TOKEN และ MS_CLIENT_ID (ไม่ใช่ความลับ แต่เก็บคู่กัน)');
    break;
  }
  if (t.body.error === 'authorization_pending') continue;
  if (t.body.error === 'slow_down') { await new Promise((r) => setTimeout(r, 5000)); continue; }
  console.error('ล้มเหลว:', t.body.error, String(t.body.error_description || '').slice(0, 200));
  process.exit(1);
}

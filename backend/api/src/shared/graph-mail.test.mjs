/* เทสต์ตัวส่งเมลผ่าน Microsoft Graph แบบไม่ต่อเครือข่าย: ฉีด fetch ปลอมเข้าไป
   ครอบ: ลำดับการเรียก (ขอโทเคน -> ส่งเมล), รูปแบบคำขอ, การหมุน refresh token, และการล้มแบบบอกเหตุ
   ใช้: node backend/api/src/shared/graph-mail.test.mjs */
import assert from 'node:assert/strict';
import { sendGraphMail, graphConfigured } from './graph-mail.js';

const jsonRes = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

/* 1) สำเร็จ: ต้องขอโทเคนก่อน แล้วส่งเมลด้วย Bearer ที่ได้ และเก็บ refresh token ชุดใหม่ที่ Microsoft หมุนให้ */
{
  const calls = [];
  const deps = { fetch: async (url, init) => {
    calls.push({ url, init });
    if (url.includes('login.microsoftonline.com')) return jsonRes({ access_token: 'AT1', refresh_token: 'RT2', expires_in: 3600 });
    if (url.includes('graph.microsoft.com')) return jsonRes({}, 202);
    throw new Error('ไม่ควรเรียก ' + url);
  } };
  const r = await sendGraphMail({ clientId: 'cid', refreshToken: 'RT1', from: 'verify.ordivel@outlook.com' }, { to: 'user@example.com', subject: 'รหัสยืนยัน', text: 'รหัส 123456' }, deps);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.via, 'graph');
  assert.equal(r.rotatedRefreshToken, 'RT2', 'ต้องคืน refresh token ชุดใหม่ให้ผู้เรียกเก็บ');
  assert.equal(calls.length, 2, 'ต้องเรียกสองครั้ง: โทเคนแล้วส่งเมล');
  assert.match(calls[0].init.body, /grant_type=refresh_token/);
  assert.match(calls[0].init.body, /Mail\.Send/);
  assert.equal(calls[1].init.headers.Authorization, 'Bearer AT1');
  const body = JSON.parse(calls[1].init.body);
  assert.equal(body.message.toRecipients[0].emailAddress.address, 'user@example.com');
  assert.equal(body.message.from.emailAddress.address, 'verify.ordivel@outlook.com');
  assert.equal(body.message.subject, 'รหัสยืนยัน');
  assert.equal(body.message.body.contentType, 'Text');
  assert.equal(body.saveToSentItems, false, 'ไม่ต้องเก็บสำเนาในกล่องผู้ส่ง');
}

/* 2) ขอโทเคนไม่สำเร็จ (refresh token หมดอายุ/ถูกเพิกถอน): ต้องล้มพร้อมบอกเหตุ ไม่พยายามส่งต่อ */
{
  const deps = { fetch: async (url) => url.includes('login') ? jsonRes({ error: 'invalid_grant', error_description: 'AADSTS70000: token expired' }, 400) : jsonRes({}, 202) };
  const r = await sendGraphMail({ clientId: 'cid', refreshToken: 'RTbad', from: 'a@outlook.com' }, { to: 'b@example.com', subject: 's', text: 't' }, deps);
  assert.equal(r.ok, false);
  assert.match(r.error, /โทเคน/);
  assert.equal(r.code, 400);
}

/* 3) ผู้รับผิดรูปแบบ: ต้องไม่ยิงคำขอเลย (กันการยิงไปที่ผิด) */
{
  let called = 0;
  const r = await sendGraphMail({ clientId: 'cid', refreshToken: 'RT', from: 'a@outlook.com' }, { to: 'not-an-email', subject: 's', text: 't' }, { fetch: async () => { called++; return jsonRes({}); } });
  assert.equal(r.ok, false);
  assert.equal(called, 0, 'ต้องไม่เรียกเครือข่ายเมื่อผู้รับผิดรูปแบบ');
}

/* 4) graphConfigured: ต้องเปิดเฉพาะเมื่อมีครบ */
{
  assert.equal(graphConfigured({ MS_CLIENT_ID: 'c', MS_REFRESH_TOKEN: 'r', MAIL_FROM: 'a@b.co' }), true);
  assert.equal(graphConfigured({ MS_CLIENT_ID: 'c', MS_REFRESH_TOKEN: 'r' }), false, 'ไม่มีผู้ส่ง = ยังไม่พร้อม');
  assert.equal(graphConfigured({ MS_CLIENT_ID: 'c', MAIL_FROM: 'a@b.co' }), false, 'ไม่มี refresh token = ยังไม่พร้อม');
  assert.equal(graphConfigured({}), false);
}

console.log('GRAPH-MAIL PASS: 4 กลุ่ม (สำเร็จ/โทเคนล้ม/ผู้รับผิด/เงื่อนไขเปิดใช้)');

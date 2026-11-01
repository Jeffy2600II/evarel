/* เทสต์ตัวส่งเมล SMTP ที่ไม่ต้องต่อเครือข่ายจริง: ป้อนคำตอบตามสคริปต์ผ่านซ็อกเก็ตปลอม
   ครอบ 3 เรื่องที่ระบบเดิมไม่มีเทสต์เลย: TLS ตั้งแต่เชื่อม (ค่าเดิม gmail), STARTTLS (outlook 587), และกรณีเซิร์ฟเวอร์ไม่ประกาศ STARTTLS
   ใช้: node backend/api/src/shared/smtp-mail.test.mjs */
import assert from 'node:assert/strict';
import { sendMail, buildMessage } from './smtp-mail.js';

const enc = new TextEncoder(), dec = new TextDecoder();

/* ซ็อกเก็ตปลอม: คำตอบถูกอ่านตามลำดับจากสคริปต์เดียว ทุกคำสั่งที่เขียนเข้าไปกินคำตอบหนึ่งก้อน
   startTls() คืนซ็อกเก็ตใหม่ที่ใช้สคริปต์ตัวเดียวกันต่อ (เหมือนของจริงที่ตัวเก่าปิดถาวร) */
function scripted(script) {
  const state = { i: 0, log: [], tlsCalls: 0, closed: 0 };
  const make = () => {
    let ctrl;
    const readable = new ReadableStream({ start(c) { ctrl = c; } });
    const push = (s) => ctrl.enqueue(enc.encode(s));
    const writable = new WritableStream({
      write(chunk) {
        const line = dec.decode(chunk);
        state.log.push(line.replace(/\r\n$/, ''));
        const r = script[state.i++];
        if (Array.isArray(r)) r.forEach(push); else if (r) push(r);
      },
    });
    const sock = {
      readable, writable, push,
      startTls() { state.tlsCalls++; sock.closedByUpgrade = true; return make(); },
      close() { state.closed++; return Promise.resolve(); },
    };
    return sock;
  };
  const first = make();
  first.push(script[0]); /* ทักทายแรกมาถึงทันทีที่เชื่อม (ไม่ได้เกิดจากการเขียนคำสั่ง) */
  state.i = 1;
  return { first, state, connect: () => first };
}

const baseMail = { to: 'someone@example.com', subject: 'ทดสอบ', text: 'รหัส 123456' };

/* 1) TLS ตั้งแต่เชื่อม: พฤติกรรมเดิม (gmail 465) ต้องเหมือนเดิมทุกคำสั่ง */
{
  const { first, state, connect } = scripted([
    '220 smtp.gmail.com ESMTP\r\n',
    '250-smtp.gmail.com at your service\r\n250 AUTH PLAIN\r\n',
    '235 2.7.0 Accepted\r\n',
    '250 2.1.0 Ok\r\n',
    '250 2.1.5 Ok\r\n',
    '354 Go ahead\r\n',
    '250 2.0.0 Ok: queued as ABC\r\n',
    '221 Bye\r\n',
  ]);
  let opts = null;
  const deps = { connect: (addr, o) => { opts = { addr, ...o }; return first; } };
  const r = await sendMail({ user: 'u@example.com', pass: 'p a s s' }, baseMail, deps);
  assert.equal(r.ok, true, 'TLS ตั้งแต่เชื่อมต้องสำเร็จ: ' + JSON.stringify(r));
  assert.equal(opts.secureTransport, 'on', 'ค่าเริ่มต้นต้องเป็น TLS ตั้งแต่เชื่อม');
  assert.equal(state.tlsCalls, 0, 'โหมดนี้ไม่ต้องเรียก startTls');
  assert.match(state.log.join('|'), /AUTH PLAIN/, 'ต้องล็อกอินแบบ AUTH PLAIN');
  assert.ok(!r.trace.some((t) => t.cmd === 'STARTTLS'), 'โหมดนี้ต้องไม่มีขั้น STARTTLS');
  assert.ok(r.trace.every((t) => !String(t.text || '').includes('p a s s')), 'ห้ามมีรหัสผ่านใน trace');
}

/* 2) STARTTLS: ลำดับต้องเป็น EHLO -> STARTTLS(220) -> ยกระดับ -> EHLO ใหม่ -> AUTH
      และต้องอ่าน/เขียนผ่านซ็อกเก็ตใหม่หลังยกระดับเท่านั้น (ของจริงตัวเก่าใช้ไม่ได้แล้ว) */
{
  const { first, state, connect } = scripted([
    '220 outlook.office365.com Microsoft ESMTP MAIL Service ready\r\n',
    '250-ORDIVEL Hello\r\n250-STARTTLS\r\n250 AUTH LOGIN PLAIN\r\n', /* EHLO ก่อนยกระดับ */
    '220 2.0.0 SMTP server ready\r\n', /* ตอบ STARTTLS */
    '250-ORDIVEL Hello\r\n250 AUTH LOGIN PLAIN\r\n', /* EHLO หลังยกระดับ */
    '235 2.7.0 Authentication successful\r\n',
    '250 2.1.0 Sender OK\r\n',
    '250 2.1.5 Recipient OK\r\n',
    '354 Start mail input\r\n',
    '250 2.0.0 Accepted\r\n',
    '221 2.0.0 Bye\r\n',
  ]);
  let opts = null;
  const deps = { connect: (addr, o) => { opts = { addr, ...o }; return first; } };
  const r = await sendMail({ user: 'verify.ordivel@outlook.com', pass: 'apppass', from: 'verify.ordivel@outlook.com', host: 'smtp-mail.outlook.com', port: 587, secure: 'starttls' }, baseMail, deps);
  assert.equal(r.ok, true, 'STARTTLS ต้องสำเร็จ: ' + JSON.stringify(r));
  assert.equal(opts.secureTransport, 'starttls', 'ต้องขอ starttls ตั้งแต่เชื่อม');
  assert.equal(opts.addr.hostname, 'smtp-mail.outlook.com');
  assert.equal(opts.addr.port, 587);
  assert.equal(state.tlsCalls, 1, 'ต้องยกระดับครั้งเดียว');
  const seq = r.trace.filter((t) => t.cmd !== 'CONNECT').map((t) => t.cmd === 'END-OF-DATA' ? 'BODY' : t.cmd);
  assert.deepEqual(seq.slice(0, 6), ['EHLO', 'STARTTLS', 'EHLO', 'AUTH PLAIN', 'MAIL', 'RCPT'], 'ลำดับคำสั่งต้องถูก: ' + seq.join(' -> '));
  assert.ok(state.log.length >= 8, 'ต้องมีคำสั่งครบตามลำดับ');
}

/* 3) เซิร์ฟเวอร์ไม่ประกาศ STARTTLS: ต้องล้มแบบบอกเหตุ ไม่ใช่ส่งต่อแบบไม่เข้ารหัส */
{
  const { first } = scripted(['220 ok\r\n', '250-HELLO\r\n250 AUTH PLAIN\r\n']);
  const r = await sendMail({ user: 'u@example.com', pass: 'x', secure: 'starttls' }, baseMail, { connect: () => first });
  assert.equal(r.ok, false, 'ต้องไม่สำเร็จ');
  assert.match(String(r.error), /STARTTLS/, 'ข้อความต้องบอกว่าเรื่อง STARTTLS: ' + r.error);
}

/* 4) จากผู้เรียก: From ต้องใช้ค่าที่กำหนด ไม่ใช่ชื่อผู้ใช้ SMTP เสมอ */
{
  const msg = buildMessage({ from: 'verify.ordivel@outlook.com', ...baseMail });
  assert.match(msg, /^From: .*verify\.ordivel@outlook\.com/m, 'หัว From ต้องเป็นที่อยู่ที่กำหนด');
}

console.log('SMTP-MAIL PASS: 4 กลุ่ม (TLS ตั้งแต่เชื่อม / STARTTLS / ไม่มี STARTTLS / หัว From)');

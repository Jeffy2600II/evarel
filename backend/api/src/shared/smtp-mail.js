// smtp-mail.js : โมดูลส่งเมลผ่าน SMTP (TLS ตั้งแต่เริ่ม พอร์ต 465) สำหรับ Cloudflare Workers
// อินเทอร์เฟซแคบ 2 จุด: buildMessage(m) ฟังก์ชันบริสุทธิ์ และ sendMail(cfg, m, deps) ที่รับ connect เข้ามา
// ไม่มีโค้ดตัวไหนอ่านหรือพิมพ์รหัสผ่านนอกจากคำสั่ง AUTH ในฟังก์ชันเดียว

const CRLF = "\r\n";
const enc = new TextEncoder();
const dec = new TextDecoder();

// ---- ส่วนบริสุทธิ์ (ทดสอบได้โดยไม่ใช้เครือข่าย) ----

// กัน header injection: ห้ามมีบรรทัดใหม่ในค่าที่ใช้ในหัวเมล/คำสั่ง SMTP
export function assertSingleLine(label, v) {
  if (typeof v !== "string" || v.length === 0) throw new Error(label + " ว่าง");
  if (/[\r\n\0]/.test(v)) throw new Error(label + " มีอักขระต้องห้าม");
  return v;
}

export function assertAddress(label, v) {
  assertSingleLine(label, v);
  if (!/^[^\s<>@"']+@[^\s<>@"']+\.[^\s<>@"']+$/.test(v)) throw new Error(label + " รูปแบบอีเมลไม่ถูกต้อง");
  return v;
}

function b64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// RFC 2047: หัวเรื่อง UTF-8 -> =?UTF-8?B?...?= ตัดเป็นท่อนไม่เกิน ~45 ไบต์ ไม่ผ่าตัวอักษรกลางตัว
export function encodeHeaderWord(text) {
  assertSingleLine("subject", text);
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const chars = Array.from(text);
  const words = [];
  let cur = "";
  for (const ch of chars) {
    if (enc.encode(cur + ch).length > 45) { words.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) words.push(cur);
  return words.map((w) => "=?UTF-8?B?" + b64(enc.encode(w)) + "?=").join(CRLF + " ");
}

function wrap76(s) { return (s.match(/.{1,76}/g) || []).join(CRLF); }

// สร้างข้อความ MIME multipart/alternative (text + html) ทั้งหมดเป็น 7bit/base64
export function buildMessage({ from, to, subject, text, html, messageId, date }) {
  assertAddress("from", from); assertAddress("to", to);
  const boundary = "evarel-" + (messageId || "b").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  const head = [
    "From: Evarel <" + from + ">",
    "To: <" + to + ">",
    "Subject: " + encodeHeaderWord(subject),
    "Date: " + (date || new Date()).toUTCString(),
    "Message-ID: <" + (messageId || "m" + Date.now()) + "@evarel.local>",
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
  ].join(CRLF);
  const part = (type, body) =>
    "--" + boundary + CRLF + "Content-Type: " + type + "; charset=UTF-8" + CRLF +
    "Content-Transfer-Encoding: base64" + CRLF + CRLF + wrap76(b64(enc.encode(body))) + CRLF;
  const body = part("text/plain", text || "") + (html ? part("text/html", html) : "") + "--" + boundary + "--" + CRLF;
  return head + CRLF + CRLF + body;
}

// dot-stuffing ตาม RFC 5321 : บรรทัดที่ขึ้นต้นด้วยจุดต้องเติมจุดอีกหนึ่งตัว
export function dotStuff(msg) { return msg.replace(/(^|\r\n)\./g, "$1.."); }

// ตัวอ่านคำตอบ SMTP (รองรับตอบหลายบรรทัด "250-..." จบที่ "250 ...")
export function parseReplyLines(buf) {
  const lines = buf.split(CRLF).filter((l) => l.length);
  if (!lines.length) return null;
  const last = lines[lines.length - 1];
  if (!/^\d{3} /.test(last) && !/^\d{3}$/.test(last)) return null; // ยังมาไม่ครบ
  return { code: parseInt(last.slice(0, 3), 10), text: lines.join(" | ") };
}

// ซ่อนรหัสผ่านก่อนบันทึกผลทุกครั้ง (ใช้กับผลลัพธ์ที่คืนให้ผู้เรียก)
export function redact(s, secrets) {
  let out = String(s);
  for (const x of secrets) if (x) out = out.split(x).join("[REDACTED]").split(b64(enc.encode(x))).join("[REDACTED]");
  return out;
}

// ---- ส่วนเครือข่าย (รับ connect เข้ามา จึงทดสอบด้วยตัวปลอมได้) ----

export async function sendMail(cfg, mail, deps) {
  const { host = "smtp.gmail.com", port = 465, user, pass } = cfg;
  assertAddress("user", user); assertSingleLine("pass", pass);
  const message = buildMessage({ from: user, ...mail });
  const trace = [];
  const t0 = Date.now();
  const sock = deps.connect({ hostname: host, port }, { secureTransport: "on", allowHalfOpen: false });
  const reader = sock.readable.getReader();
  const writer = sock.writable.getWriter();
  let buf = "";

  const readReply = async () => {
    for (;;) {
      const r = parseReplyLines(buf);
      if (r) { buf = ""; return r; }
      const { value, done } = await reader.read();
      if (done) throw new Error("การเชื่อมต่อถูกปิดก่อนได้รับคำตอบ");
      buf += dec.decode(value, { stream: true });
    }
  };
  const send = async (line, mask) => {
    await writer.write(enc.encode(line + CRLF));
    const r = await readReply();
    trace.push({ cmd: mask || line.split(" ")[0], code: r.code, text: redact(r.text, [pass]).slice(0, 160) });
    return r;
  };
  const expect = (r, ok, step) => { if (r.code !== ok) { const e = new Error("SMTP " + step + " ล้มเหลว: " + r.code); e.code = r.code; throw e; } };

  try {
    const greet = await readReply();
    trace.push({ cmd: "CONNECT", code: greet.code, text: redact(greet.text, [pass]).slice(0, 120) });
    expect(greet, 220, "greeting");
    expect(await send("EHLO evarel.local"), 250, "EHLO");
    // AUTH PLAIN : ข้อความลับถูกส่งในคำสั่งเดียว และไม่ถูกบันทึกลง trace
    const plain = b64(enc.encode("\0" + user + "\0" + pass));
    expect(await send("AUTH PLAIN " + plain, "AUTH PLAIN"), 235, "AUTH");
    expect(await send("MAIL FROM:<" + user + ">"), 250, "MAIL FROM");
    expect(await send("RCPT TO:<" + mail.to + ">"), 250, "RCPT TO");
    expect(await send("DATA"), 354, "DATA");
    await writer.write(enc.encode(dotStuff(message) + CRLF + "." + CRLF));
    const done = await readReply();
    trace.push({ cmd: "END-OF-DATA", code: done.code, text: redact(done.text, [pass]).slice(0, 160) });
    expect(done, 250, "END-OF-DATA");
    try { await send("QUIT"); } catch (_) { /* ปิดฝั่งเซิร์ฟเวอร์ก่อนก็ไม่เป็นไร */ }
    return { ok: true, ms: Date.now() - t0, trace };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: redact(e.message, [pass]), code: e.code || null, trace };
  } finally {
    try { await writer.close(); } catch (_) {}
    try { await sock.close(); } catch (_) {}
  }
}

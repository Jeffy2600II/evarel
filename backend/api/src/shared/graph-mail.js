/* graph-mail.js : ส่งเมลผ่าน Microsoft Graph (HTTPS ล้วน ไม่ใช้ซ็อกเก็ต SMTP)
   ใช้เมื่อ Microsoft ปิด SMTP AUTH พื้นฐานของกล่อง (outlook.com ตอบ 535 5.7.139 SmtpClientAuthentication is disabled)
   อินเทอร์เฟซ: sendGraphMail(cfg, mail, deps) — deps.fetch ฉีดได้เพื่อทดสอบโดยไม่แตะเครือข่าย
   ต้องมี: clientId, refreshToken (จากล็อกอินครั้งเดียวแบบ device code), from (ที่อยู่ผู้ส่ง)
   ผลลัพธ์: { ok, ms, error?, code?, rotatedRefreshToken? } — ไม่คืนค่าโทเคนออกไปข้างนอก */
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const GRAPH_URL = 'https://graph.microsoft.com/v1.0/me/sendMail';
const SCOPE = 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access';

export function graphConfigured(env) {
  return !!(env && env.MS_CLIENT_ID && env.MS_REFRESH_TOKEN && (env.MAIL_FROM || env.SMTP_FROM || env.SMTP_USER));
}

/* ขอ access token ใหม่จาก refresh token; คืนทั้ง token และ refresh token ชุดใหม่ถ้า Microsoft หมุนให้ */
export async function refreshAccessToken(cfg, deps = {}) {
  const f = deps.fetch || fetch;
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    grant_type: 'refresh_token',
    refresh_token: cfg.refreshToken,
    scope: SCOPE,
  });
  const r = await f(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    const desc = String(j.error_description || j.error || '').slice(0, 180);
    const e = new Error('ขอโทเคน Microsoft ไม่สำเร็จ: ' + (r.status || '') + ' ' + desc);
    e.code = r.status || null;
    throw e;
  }
  return { token: j.access_token, rotatedRefreshToken: j.refresh_token || null };
}

export async function sendGraphMail(cfg, mail, deps = {}) {
  const f = deps.fetch || fetch;
  const t0 = Date.now();
  try {
    if (!cfg.clientId) throw new Error('ไม่มี MS_CLIENT_ID');
    if (!cfg.refreshToken) throw new Error('ไม่มี MS_REFRESH_TOKEN');
    const from = cfg.from;
    if (!from) throw new Error('ไม่มีที่อยู่ผู้ส่ง');
    const to = String(mail.to || '');
    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(to)) throw new Error('ที่อยู่ผู้รับไม่ถูกต้อง');
    const { token, rotatedRefreshToken } = await refreshAccessToken(cfg, deps);
    const payload = {
      message: {
        subject: String(mail.subject || ''),
        body: { contentType: 'Text', content: String(mail.text || '') },
        toRecipients: [{ emailAddress: { address: to } }],
        from: { emailAddress: { address: from } },
      },
      saveToSentItems: false,
    };
    const r = await f(GRAPH_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok && r.status !== 202) {
      const t = await r.text().catch(() => '');
      const e = new Error('Graph sendMail ล้มเหลว: ' + r.status + ' ' + t.slice(0, 140));
      e.code = r.status;
      throw e;
    }
    return { ok: true, ms: Date.now() - t0, via: 'graph', rotatedRefreshToken: rotatedRefreshToken || null };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, via: 'graph', error: String(e.message || e).slice(0, 200), code: e.code || null };
  }
}

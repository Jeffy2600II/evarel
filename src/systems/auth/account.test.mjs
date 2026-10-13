/* ชุดทดสอบสัญญา account.ts (สมัคร/ลืมรหัส/ยืนยันรหัส/ส่งซ้ำ/ตั้งรหัสใหม่) | Supabase Auth admin และ SMTP จำลอง
   ใช้ล็อกพฤติกรรมเดิมก่อนแก้ (evarel-email-own) และพิสูจน์ว่าสัญญากับแอปไม่เปลี่ยนหลังแก้
   โหมดทดสอบ: process.env.ACCOUNT_MODE = 'legacy' (Supabase ส่งเมลเอง) | 'own' (รหัสและเมลของเรา) */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const MODE = process.env.ACCOUNT_MODE || 'legacy'; const own = MODE === 'own';
const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = async (src, dst) => { execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, src)} --bundle --format=esm --alias:cloudflare:sockets=/tmp/_cf_sockets_stub.mjs --outfile=${dst} --log-level=error`); return import(pathToFileURL(dst).href + '?t=' + Date.now()); };
const A = await bundle('./account.ts', '/tmp/auth-account-bundle.mjs');
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, o) => { if (String(url).endsWith('/auth/v1/.well-known/jwks.json')) return new Response(JSON.stringify({ keys: [PUBJWK] }), { status: 200 }); throw new Error('คำขอเครือข่ายจริงต้องไม่เกิดในเทสต์: ' + url); };
let pass = 0, fail = 0, skip = 0; class Skip extends Error {}
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { if (e instanceof Skip) { skip++; console.log('SKIP', name); } else { fail++; console.log('FAIL', name, '::', String(e.message).slice(0, 260)); } } };
const needOwn = () => { if (!own) throw new Skip(); };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const req = (body, extra = {}) => new Request('https://w.test/x', { method: 'POST', headers: { 'content-type': 'application/json', ...(extra.headers || {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) });

const b64u = (b) => Buffer.from(b).toString('base64url');
const KP = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const PUBJWK = { ...(await crypto.subtle.exportKey('jwk', KP.publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
const SB_URL = 'https://x.supabase.co';
async function signJWT(claims) {
  const h = b64u(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'k1' })), p = b64u(JSON.stringify(claims));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, KP.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + b64u(new Uint8Array(sig));
}
/* โลกจำลองเดียว: Supabase Auth (admin users, token, verify, generate_link) + RPC รหัสตาม 004 + กล่องเมลออก */
function world(opts = {}) {
  const w = { users: new Map(), mails: [], log: [], rows: [], now: Date.now(), smtpFail: !!opts.smtpFail, smtpDelayMs: opts.smtpDelayMs || 0, bg: [], dbDown: !!opts.dbDown, nextUid: 1 };
  const mkUser = (email, o = {}) => { const u = { id: 'u' + w.nextUid++, email, email_confirmed_at: o.confirmed ? '2026-01-01' : null, app_metadata: { providers: o.providers || ['email'], provider: (o.providers || ['email'])[0] }, user_metadata: { name: o.name || '' }, password: o.password || 'pw-12345678' }; w.users.set(email, u); return u; };
  w.mkUser = mkUser;
  const sess = async (u) => ({ access_token: await signJWT({ sub: u.id, email: u.email, aud: 'authenticated', iss: SB_URL + '/auth/v1', exp: Math.floor(Date.now() / 1000) + 3600 }), refresh_token: 'RT.' + u.id, expires_at: 9999999999, user: u });
  w.fetch = async (url, o = {}) => {
    const U = new URL(url); const p = U.pathname; const body = o.body ? JSON.parse(o.body) : {}; w.log.push({ m: o.method || 'GET', p, q: U.search, body });
    if (p === '/auth/v1/admin/users' && (o.method || 'GET') === 'GET') { const f = (U.searchParams.get('filter') || '').toLowerCase(); return json({ users: [...w.users.values()].filter((u) => u.email.includes(f)) }); }
    if (p === '/auth/v1/admin/users' && o.method === 'POST') { if (w.users.has(body.email)) return json({ error_code: 'email_exists' }, 422); const u = mkUser(body.email, { confirmed: !!body.email_confirm, name: body.user_metadata?.name, password: body.password }); return json(u); }
    { const m = p.match(/^\/auth\/v1\/admin\/users\/([^/]+)$/); if (m && o.method === 'PUT') { const u = [...w.users.values()].find((x) => x.id === m[1]); if (!u) return json({ error_code: 'user_not_found' }, 404); if (body.email_confirm) u.email_confirmed_at = u.email_confirmed_at || 'now'; return json(u); } }
    if (p === '/auth/v1/token' && U.searchParams.get('grant_type') === 'password') { const u = w.users.get(body.email); if (!u || u.password !== body.password) return json({ error_code: 'invalid_credentials' }, 400); return json(await sess(u)); }
    if (p === '/auth/v1/resend' || p === '/auth/v1/recover') { w.log.push({ supabaseSentMail: true, p }); return json({}); }
    if (p === '/auth/v1/verify' && body.type === 'magiclink') { const e = w.linkTokens?.get(body.token_hash); if (!e) return json({ error_code: 'otp_expired' }, 403); w.linkTokens.delete(body.token_hash); return json(await sess(w.users.get(e))); }
    if (p === '/auth/v1/verify') { w.log.push({ legacyVerify: true }); return json({ error_code: 'otp_expired' }, 403); }
    if (p === '/auth/v1/admin/generate_link') { const u = w.users.get(body.email); if (!u) return json({ error_code: 'user_not_found' }, 404); w.linkTokens ||= new Map(); const h = 'H' + crypto.randomBytes(6).toString('hex'); w.linkTokens.set(h, u.email); return json({ hashed_token: h, email: u.email, id: u.id }); }
    if (p === '/auth/v1/user' && o.method === 'PUT') { const id = JSON.parse(Buffer.from((o.headers.Authorization || '').replace('Bearer ', '').split('.')[1] || 'e30', 'base64url').toString()).sub; const u = [...w.users.values()].find((x) => x.id === id); if (!u) return json({}, 401); u.password = body.password; if (!u.email_confirmed_at) u.email_confirmed_at = 'now'; return json(u); }
    if (p.startsWith('/rest/v1/rpc/')) {
      if (w.dbDown) throw new Error('db down'); const name = p.split('/rpc/')[1];
      if (name === 'rl_hit' && w.rlThrows) throw new Error('network reset');
      if (name === 'rl_hit') { w.rl ||= {}; const k = body.p_bucket + '|' + body.p_key; if (w.rlBroken) return json({ message: 'boom' }, 500); w.rl[k] = (w.rl[k] || 0) + 1; return json([{ ok: w.rl[k] <= body.p_limit, hits: w.rl[k], retry_after: 3600 }]); }
      if (name === 'ac_issue') { for (const r of w.rows) if (r.eh === body.p_email_hash && r.pu === body.p_purpose && !r.used) r.used = true; w.rows.push({ eh: body.p_email_hash, pu: body.p_purpose, ch: body.p_code_hash, salt: body.p_salt, att: 0, exp: w.now + body.p_ttl_sec * 1000, used: false }); return json(w.rows.length); }
      if (name === 'ac_salt') { const r = [...w.rows].reverse().find((x) => x.eh === body.p_email_hash && x.pu === body.p_purpose && !x.used && x.exp > w.now); return json(r ? r.salt : null); }
      if (name === 'ac_check') { const r = [...w.rows].reverse().find((x) => x.eh === body.p_email_hash && x.pu === body.p_purpose && !x.used); if (!r) return json('none'); if (r.exp <= w.now) { r.used = true; return json('expired'); } if (r.att >= body.p_max_attempts) { r.used = true; return json('locked'); } r.att++; if (r.ch === body.p_code_hash_try) { r.used = true; return json('ok'); } if (r.att >= body.p_max_attempts) { r.used = true; return json('locked'); } return json('invalid'); }
    }
    return json({ error: 'unexpected ' + p }, 404);
  };
  w.sendMail = async (cfg, mail) => { if (w.smtpDelayMs) await new Promise((r) => setTimeout(r, w.smtpDelayMs)); if (w.smtpFail) return { ok: false, error: 'smtp down', ms: 1 }; w.mails.push({ cfg, mail }); return { ok: true, ms: 1 }; };
  w.env = (extra = {}) => ({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'sb_secret_t', CUSTOM_FETCH: w.fetch, CUSTOM_SEND_MAIL: w.sendMail, SMTP_USER: 'evarel.support@gmail.com', SMTP_PASS: 'pppp pppp pppp pppp', SMTP_FROM: 'Evarel <evarel.support@gmail.com>', REQUIRE_EMAIL_VERIFICATION: 'true', ...extra });
  w.ctx = () => ({ waitUntil: (p) => { w.bg.push(Promise.resolve(p).catch(() => {})); } });
  w.drain = async () => { await Promise.all(w.bg.splice(0)); };
  return w;
}
const codeFrom = (w) => { const m = w.mails.at(-1); return m && (m.mail.text.match(/\b\d{6}\b/) || [])[0]; };
const call = async (fn, w, body, envExtra, hdr) => { const r = await fn(req(body, { headers: hdr }), w.env(envExtra), w.ctx()); return { s: r.status, j: await r.json().catch(() => null) }; };

await t('A1 สมัคร (verify เปิด) -> status verify และมีการส่งรหัส' + (own ? ' ผ่านเมลของเรา' : ' ผ่าน Supabase'), async () => {
  const w = world(); const r = await call(A.handleSignup, w, { email: 'new@x.test', password: 'password123', name: 'N' }); await w.drain();
  assert.equal(r.s, 200); assert.deepEqual(r.j, { status: 'verify', email: 'new@x.test' });
  if (own) { assert.equal(w.mails.length, 1); assert.match(codeFrom(w), /^\d{6}$/); assert.equal(w.log.filter((x) => x.supabaseSentMail).length, 0, 'ห้ามให้ Supabase ส่งเมล'); }
  else assert.equal(w.log.filter((x) => x.supabaseSentMail).length, 1);
});
await t('A2 สมัคร (verify ปิด) -> เข้าได้ทันทีได้ session ไม่ส่งเมล', async () => {
  const w = world(); const r = await call(A.handleSignup, w, { email: 'new@x.test', password: 'password123' }, { REQUIRE_EMAIL_VERIFICATION: 'false' }); await w.drain();
  assert.equal(r.s, 200); assert.equal(r.j.status, 'ok'); assert.ok(r.j.access_token && r.j.refresh_token); assert.equal(w.mails.length, 0);
});
await t('A3 สมัครอีเมลซ้ำ: ยืนยันแล้ว -> needs_link 409 | ยังไม่ยืนยัน -> email_taken 409 | ไม่ส่งเมล', async () => {
  const w = world(); w.mkUser('c@x.test', { confirmed: true }); w.mkUser('u@x.test', { confirmed: false });
  const a = await call(A.handleSignup, w, { email: 'c@x.test', password: 'password123' }); const b = await call(A.handleSignup, w, { email: 'u@x.test', password: 'password123' }); await w.drain();
  assert.deepEqual([a.s, a.j.code, b.s, b.j.code], [409, 'needs_link', 409, 'email_taken']); assert.equal(w.mails.length, 0);
});
await t('A4 สมัครด้วย Google เดิม -> needs_link', async () => {
  const w = world(); w.mkUser('g@x.test', { confirmed: true, providers: ['google'] }); const r = await call(A.handleSignup, w, { email: 'g@x.test', password: 'password123' });
  assert.deepEqual([r.s, r.j.code], [409, 'needs_link']);
});
await t('A5 ตรวจอินพุตสมัคร: อีเมลผิดรูป / รหัสสั้น / รหัสยาว / ชนิดผิด -> 400 unknown', async () => {
  const w = world(); for (const b of [{ email: 'bad', password: 'password123' }, { email: 'a@x.test', password: 'short' }, { email: 'a@x.test', password: 'x'.repeat(73) }, { email: 1, password: 'password123' }, 'not json', '{}']) { const r = await call(A.handleSignup, w, b); assert.deepEqual([r.s, r.j.code], [400, 'unknown'], JSON.stringify(b)); }
});
await t('B1 forgot ตอบ {status:sent} 200 เสมอ ทั้งอีเมลที่มีและไม่มี', async () => {
  const w = world(); w.mkUser('has@x.test', { confirmed: true }); const a = await call(A.handleForgot, w, { email: 'has@x.test' }); const b = await call(A.handleForgot, w, { email: 'none@x.test' }); await w.drain();
  assert.deepEqual([a.s, a.j, b.s, b.j], [200, { status: 'sent' }, 200, { status: 'sent' }]);
});
await t('B2 forgot: ส่งเมลเฉพาะอีเมลที่มีบัญชี', async () => {
  const w = world(); w.mkUser('has@x.test', { confirmed: true }); await call(A.handleForgot, w, { email: 'has@x.test' }); await call(A.handleForgot, w, { email: 'none@x.test' }); await w.drain();
  if (own) { assert.equal(w.mails.length, 1); assert.equal(w.mails[0].cfg.to ?? w.mails[0].mail.to, 'has@x.test'); }
  else assert.equal(w.log.filter((x) => x.supabaseSentMail).length, 2);
});
await t('B3 forgot: อีเมลผิดรูป -> 400 unknown', async () => { const w = world(); for (const b of [{ email: 'bad' }, {}, { email: 5 }]) { const r = await call(A.handleForgot, w, b); assert.deepEqual([r.s, r.j.code], [400, 'unknown']); } });
await t('B4 forgot: ส่งเมลล้มเหลว -> ยังตอบ sent 200 (ไม่เปิดเผยว่าอีเมลมีหรือไม่)', async () => {
  const w = world({ smtpFail: true }); w.mkUser('has@x.test', { confirmed: true }); const r = await call(A.handleForgot, w, { email: 'has@x.test' }); await w.drain();
  assert.deepEqual([r.s, r.j], [200, { status: 'sent' }]);
});
await t('B5 forgot: ฐานข้อมูลรหัสล่ม -> ยังตอบ sent 200', async () => {
  const w = world({ dbDown: true }); w.mkUser('has@x.test', { confirmed: true }); const r = await call(A.handleForgot, w, { email: 'has@x.test' }); await w.drain(); assert.deepEqual([r.s, r.j], [200, { status: 'sent' }]);
});
await t('C1 verify signup: รหัสถูก -> {status:ok, session} และบัญชีถูกยืนยัน', async () => {
  needOwn(); const w = world(); await call(A.handleSignup, w, { email: 'n@x.test', password: 'password123' }); await w.drain(); const code = codeFrom(w);
  const r = await call(A.handleVerify, w, { email: 'n@x.test', code, type: 'signup' }); assert.equal(r.s, 200); assert.equal(r.j.status, 'ok'); assert.ok(r.j.access_token && r.j.refresh_token && r.j.user?.email === 'n@x.test');
  assert.ok(w.users.get('n@x.test').email_confirmed_at, 'ต้องตั้งยืนยันอีเมลแล้ว');
});
await t('C2 verify: รหัสผิด -> 400 code_invalid | ผิดจนล็อก -> 429 too_many_requests', async () => {
  needOwn(); const w = world(); await call(A.handleSignup, w, { email: 'n@x.test', password: 'password123' }); await w.drain(); const good = codeFrom(w); const bad = good === '000000' ? '000001' : '000000';
  const rs = []; for (let i = 0; i < 5; i++) rs.push(await call(A.handleVerify, w, { email: 'n@x.test', code: bad, type: 'signup' }));
  assert.deepEqual(rs.slice(0, 4).map((x) => [x.s, x.j.code]), Array(4).fill([400, 'code_invalid'])); assert.deepEqual([rs[4].s, rs[4].j.code], [429, 'too_many_requests']);
  const after = await call(A.handleVerify, w, { email: 'n@x.test', code: good, type: 'signup' }); assert.notEqual(after.j?.status, 'ok');
});
await t('C3 verify: หมดอายุ -> 400 code_expired | รหัสไม่ใช่ 6 หลัก -> 400 code_invalid', async () => {
  needOwn(); const w = world(); await call(A.handleSignup, w, { email: 'n@x.test', password: 'password123' }); await w.drain(); const code = codeFrom(w); w.now += 700000;
  const r = await call(A.handleVerify, w, { email: 'n@x.test', code, type: 'signup' }); assert.deepEqual([r.s, r.j.code], [400, 'code_expired']);
  const q = await call(A.handleVerify, w, { email: 'n@x.test', code: 'abc', type: 'signup' }); assert.deepEqual([q.s, q.j.code], [400, 'code_invalid']);
});
await t('C4 verify recovery: รหัสถูก -> session แล้วตั้งรหัสใหม่ได้ ล็อกอินด้วยรหัสใหม่ได้', async () => {
  needOwn(); const w = world(); w.mkUser('has@x.test', { confirmed: true, password: 'old-password-1' }); await call(A.handleForgot, w, { email: 'has@x.test' }); await w.drain(); const code = codeFrom(w);
  const v = await call(A.handleVerify, w, { email: 'has@x.test', code, type: 'recovery' }); assert.equal(v.j.status, 'ok');
  const sp = await A.handleSetPassword(new Request('https://w.test/p', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + v.j.access_token }, body: JSON.stringify({ password: 'brand-new-pass-9' }) }), w.env());
  assert.equal(sp.status, 200); assert.equal(w.users.get('has@x.test').password, 'brand-new-pass-9');
});
await t('C5 verify: รหัส recovery ใช้เป็น signup ไม่ได้ และกลับกัน', async () => {
  needOwn(); const w = world(); w.mkUser('has@x.test', { confirmed: true }); await call(A.handleForgot, w, { email: 'has@x.test' }); await w.drain(); const code = codeFrom(w);
  const r = await call(A.handleVerify, w, { email: 'has@x.test', code, type: 'signup' }); assert.notEqual(r.j?.status, 'ok');
});
await t('C6 verify: ใช้รหัสเดียวซ้ำไม่ได้ (ครั้งที่สองไม่ได้ session)', async () => {
  needOwn(); const w = world(); await call(A.handleSignup, w, { email: 'n@x.test', password: 'password123' }); await w.drain(); const code = codeFrom(w);
  const a = await call(A.handleVerify, w, { email: 'n@x.test', code, type: 'signup' }); const b = await call(A.handleVerify, w, { email: 'n@x.test', code, type: 'signup' }); assert.equal(a.j.status, 'ok'); assert.notEqual(b.j?.status, 'ok'); assert.equal(b.s, 400);
});
await t('C7 verify: พร้อมกัน 6 คำขอรหัสถูก ได้ session ครั้งเดียว', async () => {
  needOwn(); const w = world(); await call(A.handleSignup, w, { email: 'n@x.test', password: 'password123' }); await w.drain(); const code = codeFrom(w);
  const rs = await Promise.all(Array.from({ length: 6 }, () => call(A.handleVerify, w, { email: 'n@x.test', code, type: 'signup' }))); assert.equal(rs.filter((x) => x.j?.status === 'ok').length, 1);
});
await t('C8 verify: อีเมลที่ไม่มีบัญชี ได้ผลเหมือนรหัสผิด (code_invalid 400) ไม่แยกสาเหตุ', async () => {
  needOwn(); const w = world(); const r = await call(A.handleVerify, w, { email: 'ghost@x.test', code: '123456', type: 'recovery' }); assert.deepEqual([r.s, r.j.code], [400, 'code_invalid']);
});
await t('C9 verify: ฐานข้อมูลรหัสล่ม -> ไม่ผ่าน (502 หรือ 400) ไม่เคยได้ session', async () => {
  needOwn(); const w = world({ dbDown: true }); const r = await call(A.handleVerify, w, { email: 'n@x.test', code: '123456', type: 'signup' }); assert.ok(r.s >= 400); assert.notEqual(r.j?.status, 'ok');
});
await t('C10 verify: รหัสผิดรูปแบบ (ไม่ใช่ 6 หลัก) ถูกตัดตั้งแต่ชั้น handler ไม่ยิงฐานข้อมูลรหัสเลย', async () => {
  needOwn(); const w = world(); for (const code of ['', '12345', '1234567', 'abcdef', ' 12345', '12345 ', 123456, null]) { const r = await call(A.handleVerify, w, { email: 'n@x.test', code, type: 'signup' }); assert.deepEqual([r.s, r.j.code], [400, 'code_invalid'], JSON.stringify(code)); }
  assert.equal(w.log.filter((x) => x.p?.includes('/rpc/')).length, 0, 'ไม่ควรมีการเรียกฐานข้อมูลรหัส');
});
await t('D1 resend: ตอบ sent 200 เสมอ | signup ที่ยืนยันแล้วหรือไม่มีบัญชีไม่ส่งเมล', async () => {
  const w = world(); w.mkUser('conf@x.test', { confirmed: true }); w.mkUser('pend@x.test', { confirmed: false });
  const a = await call(A.handleResend, w, { email: 'conf@x.test', type: 'signup' }); const b = await call(A.handleResend, w, { email: 'none@x.test', type: 'signup' }); const c = await call(A.handleResend, w, { email: 'pend@x.test', type: 'signup' }); await w.drain();
  assert.deepEqual([a.s, a.j, b.s, b.j, c.s, c.j], [200, { status: 'sent' }, 200, { status: 'sent' }, 200, { status: 'sent' }]); if (own) assert.equal(w.mails.length, 1);
});
await t('D2 resend: ขอซ้ำทำให้รหัสเก่าใช้ไม่ได้ รหัสใหม่ใช้ได้', async () => {
  needOwn(); const w = world(); w.mkUser('pend@x.test', { confirmed: false }); await call(A.handleResend, w, { email: 'pend@x.test', type: 'signup' }); await w.drain(); const c1 = codeFrom(w);
  await call(A.handleResend, w, { email: 'pend@x.test', type: 'signup' }); await w.drain(); const c2 = codeFrom(w);
  if (c1 !== c2) { const o = await call(A.handleVerify, w, { email: 'pend@x.test', code: c1, type: 'signup' }); assert.notEqual(o.j?.status, 'ok'); } const n = await call(A.handleVerify, w, { email: 'pend@x.test', code: c2, type: 'signup' }); assert.equal(n.j?.status, 'ok');
});
await t('E1 กันเดาอีเมลด้วยเวลา: ตอบทันทีไม่รอ SMTP (ส่งเมลหลังตอบ) แม้ SMTP ช้า 400ms', async () => {
  needOwn(); const w = world({ smtpDelayMs: 400 }); w.mkUser('has@x.test', { confirmed: true });
  const t0 = Date.now(); const a = await call(A.handleForgot, w, { email: 'has@x.test' }); const ta = Date.now() - t0; const t1 = Date.now(); const b = await call(A.handleForgot, w, { email: 'none@x.test' }); const tb = Date.now() - t1;
  assert.ok(ta < 300 && tb < 300, `ต้องตอบเร็ว ได้ ${ta}/${tb}ms`); assert.ok(Math.abs(ta - tb) < 150, `เวลาต่างกันเกินไป ${ta} vs ${tb}`); await w.drain();
});
await t('E2 ไม่มีรหัสหรือรหัสผ่านใน response / log ของคำขอ Supabase', async () => {
  needOwn(); const w = world(); const r = await A.handleSignup(req({ email: 'n@x.test', password: 'password123' }), w.env(), w.ctx()); const txt = await r.text(); await w.drain(); const code = codeFrom(w);
  assert.ok(!txt.includes(code) && !txt.includes('password123')); const sent = JSON.stringify(w.log.filter((x) => x.p?.includes('/rpc/'))); assert.ok(!sent.includes('"' + code + '"'), 'รหัสรั่วในคำขอ RPC');
});
await t('E3 เมลถูกส่งถึงผู้รับที่ถูกต้อง ผู้ส่งเป็นค่า SMTP_FROM และไม่รั่วรหัสผ่าน SMTP ในเนื้อเมล', async () => {
  needOwn(); const w = world(); await call(A.handleSignup, w, { email: 'n@x.test', password: 'password123' }); await w.drain(); const m = w.mails[0];
  assert.equal(m.mail.to, 'n@x.test'); assert.match(JSON.stringify(m.cfg.from ?? m.mail.from), /evarel\.support@gmail\.com/); assert.ok(!JSON.stringify(m.mail).includes('pppp'));
});
await t('E4 ขาด secret SMTP -> forgot/signup ยังตอบตามสัญญา (ไม่ crash ไม่เปิดเผย) และไม่ให้ session', async () => {
  needOwn(); const w = world(); const e = { SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: '' }; const a = await call(A.handleForgot, w, { email: 'x@x.test' }, e); await w.drain(); assert.deepEqual([a.s, a.j], [200, { status: 'sent' }]);
});
await t('F1 เพดานส่งรวมต่อวัน: เกินเพดานแล้วไม่ส่งเมลเพิ่ม แต่ยังตอบ sent เหมือนเดิม', async () => {
  needOwn(); const w = world(); for (let i = 0; i < 5; i++) w.mkUser('u' + i + '@x.test', { confirmed: true });
  const out = []; for (let i = 0; i < 5; i++) out.push(await call(A.handleForgot, w, { email: 'u' + i + '@x.test' }, { MAIL_DAILY_CAP: '3' })); await w.drain();
  assert.equal(w.mails.length, 3, 'ต้องส่งได้แค่ 3 ฉบับ ได้ ' + w.mails.length); assert.ok(out.every((x) => x.s === 200 && x.j.status === 'sent'), JSON.stringify(out.map((x) => x.j)));
});
await t('F2 เพดานนับเฉพาะเมลที่จะส่งจริง: อีเมลไม่มีบัญชีไม่กินโควตา', async () => {
  needOwn(); const w = world(); w.mkUser('real@x.test', { confirmed: true });
  for (let i = 0; i < 6; i++) await call(A.handleForgot, w, { email: 'ghost' + i + '@x.test' }, { MAIL_DAILY_CAP: '2' }); await call(A.handleForgot, w, { email: 'real@x.test' }, { MAIL_DAILY_CAP: '2' }); await w.drain();
  assert.equal(w.mails.length, 1, 'อีเมลจริงต้องยังส่งได้ ได้ ' + w.mails.length);
});
await t('F3 ตัวนับเพดานล่ม -> ไม่ส่งเมล (ล้มแบบปิด) แต่ยังตอบ sent', async () => {
  needOwn(); const w = world(); w.rlBroken = true; w.mkUser('u@x.test', { confirmed: true }); const r = await call(A.handleForgot, w, { email: 'u@x.test' }); await w.drain();
  assert.deepEqual([r.s, r.j], [200, { status: 'sent' }]); assert.equal(w.mails.length, 0);
});
await t('F4 ไม่ตั้ง MAIL_DAILY_CAP ใช้ค่าเริ่มต้น 400 (ส่งได้ต่ำกว่าเพดาน)', async () => {
  needOwn(); const w = world(); w.mkUser('u@x.test', { confirmed: true }); await call(A.handleForgot, w, { email: 'u@x.test' }); await w.drain();
  assert.equal(w.mails.length, 1); const h = w.log.find((x) => x.p?.endsWith('/rpc/rl_hit') && x.body.p_bucket === 'mail_daily'); assert.ok(h, 'ต้องเรียกตัวนับ'); assert.equal(h.body.p_limit, 400); assert.equal(h.body.p_window_sec, 86400);
});
await t('F5 ค่า MAIL_DAILY_CAP ผิดปกติ (ติดลบ/ตัวอักษร/เกิน) -> ใช้ค่าเริ่มต้น ไม่ปิดการส่งทั้งระบบ', async () => {
  needOwn(); for (const bad of ['-1', 'abc', '0', '1e9', '', ' ']) { const w = world(); w.mkUser('u@x.test', { confirmed: true }); await call(A.handleForgot, w, { email: 'u@x.test' }, { MAIL_DAILY_CAP: bad }); await w.drain(); assert.equal(w.mails.length, 1, 'cap=' + JSON.stringify(bad)); }
});
await t('F6 ตัวนับเพดานไม่ได้เก็บอีเมลหรือรหัสใดๆ (คีย์เป็นค่าคงที่)', async () => {
  needOwn(); const w = world(); w.mkUser('u@x.test', { confirmed: true }); await call(A.handleForgot, w, { email: 'u@x.test' }); await w.drain();
  const h = w.log.filter((x) => x.p?.endsWith('/rpc/rl_hit') && x.body.p_bucket === 'mail_daily'); assert.ok(h.length >= 1); assert.ok(h.every((x) => x.body.p_key === 'global' && !JSON.stringify(x.body).includes('u@x.test')));
});
await t('F7 ตัวนับเพดานโยน exception (เครือข่ายขาด) -> ไม่ส่งเมล (ล้มแบบปิด) แต่ยังตอบ sent', async () => {
  needOwn(); const w = world(); w.rlThrows = true; w.mkUser('u@x.test', { confirmed: true }); const r = await call(A.handleForgot, w, { email: 'u@x.test' }); await w.drain();
  assert.deepEqual([r.s, r.j], [200, { status: 'sent' }]); assert.equal(w.mails.length, 0);
});
console.log(`\nสรุป(${MODE}): ผ่านจริง ${pass} | ตก ${fail} | ข้าม ${skip} (ไม่นับเป็นผ่าน) | รวม ${pass + fail + skip}`); process.exit(fail ? 1 : 0);

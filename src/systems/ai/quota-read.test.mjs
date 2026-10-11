/* เทสต์ GET /api/ai/quota (evarel-quota-ui): อ่านอย่างเดียว ไม่หักโควตา ไม่เรียก LLM ไม่รั่วข้ามผู้ใช้ */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { webcrypto as wc } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, '../../index.ts')} --bundle --format=esm --outfile=/tmp/qread-bundle.mjs --log-level=error`);
const W = (await import(pathToFileURL('/tmp/qread-bundle.mjs').href + '?t=' + Date.now())).default;
let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fresh(); await fn(); pass++; console.log('PASS', n); } catch (e) { fail++; console.log('FAIL', n, '::', String(e.message).slice(0, 240)); } };

const b64u = (b) => Buffer.from(b).toString('base64url');
const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...(await wc.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
const SUPA = 'https://x.supabase.co';
async function mkJwt(sub) {
  const h = b64u(JSON.stringify({ alg: 'ES256', kid: 'k1', typ: 'JWT' })), now = Math.floor(Date.now() / 1000);
  const pl = b64u(JSON.stringify({ sub, iss: SUPA + '/auth/v1', aud: 'authenticated', exp: now + 3600, iat: now, role: 'authenticated' }));
  const sig = Buffer.from(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + pl)));
  return `${h}.${pl}.${b64u(sig)}`;
}
let SEQ = 0, JWT_USER = 'u-aaaa', UB = 'u-bbbb', TOK_A = '', TOK_B = '';
const fresh = async () => { SEQ++; JWT_USER = 'u-a' + SEQ; UB = 'u-b' + SEQ; TOK_A = await mkJwt(JWT_USER); TOK_B = await mkJwt(UB); };
/* โลกจำลอง: ตาราง ai_usage (RLS = กรองตาม user ใน JWT ที่ส่งมา), ตัวนับการเรียก LLM/rpc */
function world(o = {}) {
  const w = { llm: 0, rpcTake: 0, reads: [], rows: o.rows || [], env: null, rl: [], rlCount: {} };
  w.f = async (url, init = {}) => {
    const u = new URL(url); const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || '';
    if (u.pathname.includes('/.well-known/jwks')) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    if (u.pathname.includes('/rpc/rl_hit')) {
      const b = JSON.parse(init.body || '{}'); w.rl.push(b);
      if (o.rlDown) return new Response(JSON.stringify({ message: 'function not found' }), { status: 404 });
      const k = b.p_bucket + '|' + b.p_key; w.rlCount[k] = (w.rlCount[k] || 0) + 1;
      return new Response(JSON.stringify([w.rlCount[k] > b.p_limit ? { ok: false, retry_after: 7 } : { ok: true }]), { status: 200 });
    }
    if (u.pathname.includes('/rpc/ai_usage_take') || u.pathname.includes('/rpc/ai_usage_settle')) { w.rpcTake++; return new Response('[]', { status: 200 }); }
    if (u.pathname.includes('groq') || u.pathname.includes('openrouter') || u.pathname.includes('chat/completions')) { w.llm++; return new Response('{}', { status: 200 }); }
    if (u.pathname.endsWith('/rest/v1/ai_usage')) {
      w.reads.push({ q: u.search, auth });
      if (o.failFirst && w.reads.length === 1) return new Response('boom', { status: 500 });
      if (o.down) throw new Error('network down');
      if (o.status) return new Response(JSON.stringify({ message: 'x' }), { status: o.status });
      const uid = auth.includes(TOK_B) ? UB : JWT_USER;       /* RLS จำลอง: เห็นเฉพาะของเจ้าของ token */
      const day = (u.searchParams.get('day') || '').replace('eq.', '');
      const rows = w.rows.filter((r) => r.user_id === uid && (!day || r.day === day));
      return new Response(JSON.stringify(rows), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  };
  w.env = { SUPABASE_URL: SUPA, SUPABASE_SERVICE_KEY: 'svc', CUSTOM_FETCH: w.f, ALLOWED_ORIGIN: '*', ...(o.envExtra || {}) };
  return w;
}
const day = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const get = (w, hdr = { Authorization: 'Bearer ' + TOK_A }) => W.fetch(new Request('https://w/api/ai/quota', { method: 'GET', headers: hdr }), w.env);

await t('Q1 ไม่มี token -> 401', async () => { const w = world(); const r = await W.fetch(new Request('https://w/api/ai/quota'), w.env); assert.equal(r.status, 401); });
await t('Q2 เมธอดอื่น (POST) -> 405 หรือ 404 ไม่ใช่ 200', async () => { const w = world(); const r = await W.fetch(new Request('https://w/api/ai/quota', { method: 'POST', headers: { Authorization: 'Bearer ' + TOK_A } }), w.env); assert.ok([404, 405].includes(r.status), String(r.status)); });
await t('Q3 ผู้ใช้ใหม่ (ไม่มีแถว) = ใช้ 0 เหลือเต็ม', async () => {
  const w = world({ rows: [] }); const r = await get(w); assert.equal(r.status, 200); const j = await r.json();
  assert.equal(j.calls.used, 0); assert.equal(j.calls.limit, 40); assert.equal(j.tokens.used, 0); assert.equal(j.tokens.limit, 60000); assert.equal(j.blocked, false);
});
await t('Q4 มีการใช้: ตัวเลขตรงกับตาราง + remaining คำนวณถูก', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 13, tokens: 21000 }] }); const j = await (await get(w)).json();
  assert.equal(j.calls.used, 13); assert.equal(j.calls.remaining, 27); assert.equal(j.tokens.used, 21000); assert.equal(j.tokens.remaining, 39000); assert.equal(j.blocked, false);
});
await t('Q5 ครบ calls -> blocked + reason calls + resetAt', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 40, tokens: 100 }] }); const j = await (await get(w)).json();
  assert.equal(j.blocked, true); assert.equal(j.reason, 'calls'); assert.ok(/^\d{4}-\d\d-\d\dT/.test(j.resetAt)); assert.ok(+new Date(j.resetAt) > Date.now());
});
await t('Q6 โทเคนครบก่อน calls -> blocked reason tokens', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 5, tokens: 60000 }] }); const j = await (await get(w)).json();
  assert.equal(j.blocked, true); assert.equal(j.reason, 'tokens');
});
await t('Q7 อ่านอย่างเดียว: ไม่เรียก ai_usage_take/settle และไม่เรียก LLM', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 3, tokens: 1 }] }); await get(w); await get(w); await get(w);
  assert.equal(w.rpcTake, 0, 'หักโควตาตอนอ่าน'); assert.equal(w.llm, 0, 'เรียก LLM');
});
await t('Q8 ไม่รั่วข้ามผู้ใช้: token ของ B ไม่เห็นแถวของ A', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 39, tokens: 5 }] }); const j = await (await get(w, { Authorization: 'Bearer ' + TOK_B })).json();
  assert.equal(j.calls.used, 0, 'เห็นของคนอื่น');
});
await t('Q9 ใช้ JWT ของผู้ใช้ (RLS) ไม่ใช้ service key อ่านตาราง', async () => {
  const w = world({ rows: [] }); await get(w); assert.ok(w.reads.length === 1 && w.reads[0].auth.includes(TOK_A) && !w.reads[0].auth.includes('svc'), JSON.stringify(w.reads));
});
await t('Q10 ฐานล่ม -> 200 {unknown:true} (fail-open ไม่ล็อกผู้ใช้) ไม่ใช่ 500', async () => {
  const w = world({ down: true }); const r = await get(w); assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.unknown, true); assert.equal(j.blocked, false);
});
await t('Q11 ฐานตอบ 500 -> unknown เช่นกัน', async () => { const w = world({ status: 500 }); const j = await (await get(w)).json(); assert.equal(j.unknown, true); assert.equal(j.blocked, false); });
await t('Q12 ไม่เปิดเผยความลับ/ค่าส่วนกลาง (ไม่มี svc, global ใน body)', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 1, tokens: 1 }] }); const txt = await (await get(w)).text(); assert.ok(!/svc|global|eyJ|sb_secret/i.test(txt), txt);
});
await t('Q13 ค่าตัวเลขจาก env (AI_DAILY_CALLS=10) สะท้อนใน limit', async () => {
  const w = world({ rows: [], envExtra: { AI_DAILY_CALLS: '10', AI_DAILY_TOKENS: '5000' } }); const j = await (await get(w)).json(); assert.equal(j.calls.limit, 10); assert.equal(j.tokens.limit, 5000);
});
await t('Q14 /api/ai/chat 429 คืน tokens + resetAt เพื่อให้แอปอัปเดตชิปโดยไม่ยิงเพิ่ม', async () => {
  const src = (await import('node:fs')).readFileSync(path.resolve(here, 'routes.ts'), 'utf8');
  assert.ok(/quota:\s*\{[^}]*tokens/.test(src), 'ยังไม่ส่ง tokens ใน quota ของ 429/สำเร็จ');
});
await t('Q15 token ปลอม (ลายเซ็นผิด) -> 401 และไม่แตะฐานข้อมูล', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 1, tokens: 1 }] });
  const [h, p] = TOK_A.split('.'); const forged = `${h}.${p}.${Buffer.from('x'.repeat(64)).toString('base64url')}`;
  const r = await get(w, { Authorization: 'Bearer ' + forged }); assert.equal(r.status, 401); assert.equal(w.reads.length, 0, 'อ่านฐานทั้งที่ token ปลอม');
});
await t('Q16 token หมดอายุ -> 401', async () => {
  const w = world(); const h = b64u(JSON.stringify({ alg: 'ES256', kid: 'k1', typ: 'JWT' })), old = Math.floor(Date.now() / 1000) - 7200;
  const pl = b64u(JSON.stringify({ sub: 'u-aaaa', iss: SUPA + '/auth/v1', aud: 'authenticated', exp: old + 3600, iat: old, role: 'authenticated' }));
  const sig = Buffer.from(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + pl)));
  const r = await get(w, { Authorization: 'Bearer ' + `${h}.${pl}.${b64u(sig)}` }); assert.equal(r.status, 401); assert.equal(w.reads.length, 0);
});
await t('Q17 ทั้ง calls และ tokens เกิน -> reason ต้องเป็น calls (ตรงกับ ai_usage_take)', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 40, tokens: 70000 }] }); const j = await (await get(w)).json(); assert.equal(j.reason, 'calls');
});
await t('Q18 ใช้เกินเพดาน (45/40 หลังแอดมินลดค่า) -> remaining = 0 ไม่ติดลบ', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 45, tokens: 99999 }] }); const j = await (await get(w)).json();
  assert.equal(j.calls.remaining, 0); assert.equal(j.tokens.remaining, 0); assert.equal(j.blocked, true);
});
await t('Q19 ค่าขยะในตาราง (null/ติดลบ/สตริง) ไม่ทำให้พัง: ปัดเป็น 0', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: null, tokens: -5 }] }); const r = await get(w); assert.equal(r.status, 200); const j = await r.json();
  assert.equal(j.calls.used, 0); assert.equal(j.tokens.used, 0);
});
await t('Q20 ยิงถี่เกินเพดาน -> 429 + Retry-After และไม่อ่านฐานข้อมูลเพิ่ม', async () => {
  const w = world({ rows: [] }); let last, firstBlock = -1;
  for (let i = 1; i <= 40; i++) { last = await get(w); if (last.status === 429 && firstBlock < 0) firstBlock = i; }
  assert.ok(firstBlock > 1 && firstBlock <= 31, 'ต้องบล็อกหลังเพดานสมเหตุสมผล แต่บล็อกที่ครั้งที่ ' + firstBlock);
  assert.equal(last.status, 429); assert.ok(Number(last.headers.get('Retry-After')) >= 1);
  assert.ok(w.reads.length < 40, 'ยังอ่านฐานทุกครั้งแม้ถูกบล็อก ' + w.reads.length);
});
await t('Q21 คีย์จำกัดอัตราคือ user id (ไม่ใช่ไอพี): B ไม่ถูกบล็อกเพราะ A ยิงถี่', async () => {
  const w = world({ rows: [] }); for (let i = 0; i < 40; i++) await get(w);
  const r = await get(w, { Authorization: 'Bearer ' + TOK_B }); assert.equal(r.status, 200, 'B โดนลงโทษแทน A');
});
await t('Q22 token ปลอมไม่เข้าไปกินโควตา rl_hit (ตรวจ JWT ก่อนนับ)', async () => {
  const w = world(); const [h, p] = TOK_A.split('.'); const forged = `${h}.${p}.${Buffer.from('x'.repeat(64)).toString('base64url')}`;
  for (let i = 0; i < 5; i++) await get(w, { Authorization: 'Bearer ' + forged }); assert.equal(w.rl.length, 0, 'นับทั้งที่ token ปลอม');
});
await t('Q23 rl_hit ยังไม่ติดตั้ง (inactive) -> fail-open ยังตอบ 200 ไม่พัง', async () => {
  const w = world({ rows: [], rlDown: true }); const r = await get(w); assert.equal(r.status, 200);
});
await t('Q24 แคชสั้น: ยิงติดกัน 5 ครั้งอ่านฐานครั้งเดียว (ลดภาระฐานข้อมูลฟรีเทียร์)', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 2, tokens: 1 }] }); for (let i = 0; i < 5; i++) await get(w);
  assert.equal(w.reads.length, 1, 'อ่านฐาน ' + w.reads.length + ' ครั้ง');
});
await t('Q25 แคชไม่ข้ามผู้ใช้: B ไม่ได้ค่าที่แคชของ A', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 30, tokens: 1 }] }); await get(w);
  const j = await (await get(w, { Authorization: 'Bearer ' + TOK_B })).json(); assert.equal(j.calls.used, 0, 'B เห็นค่าแคชของ A');
});
await t('Q26 ฐานล่มครั้งแรกแล้วกลับมา -> ครั้งถัดไปได้ค่าจริงทันที (ไม่แคช unknown)', async () => {
  const w = world({ rows: [{ user_id: JWT_USER, day: day(), calls: 7, tokens: 1 }], failFirst: true });
  const j1 = await (await get(w)).json(); assert.equal(j1.unknown, true);
  const j2 = await (await get(w)).json(); assert.equal(j2.unknown, undefined, 'ยังติดค่า unknown จากแคช'); assert.equal(j2.calls.used, 7);
});
console.log(`\nผ่าน / ล้ม: ${pass} / ${fail}`); process.exit(fail ? 1 : 0);

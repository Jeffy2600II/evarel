/* ทดสอบการต่อสายจริงทั้งเส้น: handleAiChat (JWT ES256 จริง ตรวจด้วย verifyJWT ตัวจริง) -> reserve -> runAgent -> settle
   พิสูจน์สิ่งที่ unit test ครอบไม่ได้: 429 ไม่เรียก LLM เลย | LLM ล่มคืนโควตา | สำเร็จตัดโทเคนจริง | user id มาจากโทเคน */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { webcrypto as wc } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = async (src, dst) => { execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, src)} --bundle --format=esm --outfile=${dst} --log-level=error`); return import(pathToFileURL(dst).href + '?t=' + Date.now()); };
const R = await bundle('./routes.ts', '/tmp/ai-routes-wire.mjs');
const A = await bundle('../../shared/auth.ts', '/tmp/ai-auth-wire.mjs');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { A.clearJWKSCache?.(); await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.stack || e.message).slice(0, 260)); } };

const b64u = (b) => Buffer.from(b).toString('base64url');
const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...(await wc.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
const SUPA = 'https://x.supabase.co';
async function mkJwt(sub) {
  const h = b64u(JSON.stringify({ alg: 'ES256', kid: 'k1', typ: 'JWT' })), now = Math.floor(Date.now() / 1000);
  const p = b64u(JSON.stringify({ sub, iss: SUPA + '/auth/v1', aud: 'authenticated', exp: now + 3600, iat: now, role: 'authenticated' }));
  const sig = Buffer.from(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p)));
  return `${h}.${p}.${b64u(sig)}`;
}

/* โลกจำลอง: Supabase (JWKS + items + rpc โควตา) + LLM (นับครั้งที่ถูกเรียก) */
function world(o = {}) {
  const w = { rows: new Map(), llm: 0, rpc: [], bodies: [] };
  const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
  const lock = new Map();
  w.f = async (url, init = {}) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/.well-known/jwks.json')) return json({ keys: [jwk] });
    if (u.pathname.includes('/rpc/')) {
      const name = u.pathname.split('/rpc/')[1]; const b = JSON.parse(init.body); w.rpc.push({ name, b });
      if (o.rpcDown) throw new Error('down');
      const k = b.p_user + '|' + b.p_day;
      if (name === 'ai_usage_take') {
        // ล็อกแถวต่อคิว ซื่อตรงกับ 'select ... for update' ใน migrations-002 (ไม่ล็อก = SQL ไม่ atomic ซึ่งไม่ใช่สิ่งที่เราส่งมอบ)
        const prev = lock.get(k) || Promise.resolve(); let done; const cur = new Promise((r) => (done = r)); lock.set(k, prev.then(() => cur)); await prev;
        try {
          const row = w.rows.get(k) || { calls: 0, tokens: 0 };
          await new Promise((r) => setTimeout(r, 1)); // ช่องว่างอ่าน->เขียน: ถ้าล็อกไม่ทำงานจะเห็นค่าซ้ำและข้ามเพดาน
          if (row.calls >= b.p_calls_limit) return json([{ ok: false, reason: 'calls', calls: row.calls, tokens: row.tokens }]);
          row.calls++; w.rows.set(k, row); return json([{ ok: true, reason: 'ok', calls: row.calls, tokens: row.tokens }]);
        } finally { done(); }
      }
      const row = w.rows.get(k) || { calls: 0, tokens: 0 };
      if (name === 'ai_usage_settle') { if (b.p_refund) row.calls = Math.max(0, row.calls - 1); else row.tokens += b.p_add_tokens; w.rows.set(k, row); return new Response(null, { status: 204 }); }
    }
    if (u.pathname.endsWith('/rest/v1/items')) return json([]);
    if (u.hostname.includes('groq') || u.hostname.includes('openrouter')) {
      w.llm++; if (o.llmDown) return json({ error: 'down' }, 500);
      return json({ choices: [{ message: { role: 'assistant', content: 'สวัสดี' } }], usage: { total_tokens: 321 } });
    }
    if (u.hostname.includes('memorylake')) return json({ success: true, data: { items: [] } });
    return json({}, 404);
  };
  w.env = { SUPABASE_URL: SUPA, SUPABASE_SERVICE_KEY: 'svc', GROQ_API_KEY: 'g', OPENROUTER_API_KEY: 'o', MEMORYLAKE_API_KEY: 'm', CUSTOM_FETCH: w.f, AI_DAILY_CALLS: String(o.calls ?? 2), AI_GLOBAL_CALLS: '0', ...(o.env || {}) };
  return w;
}
const req = async (sub, text = 'สวัสดี', extra = {}) => new Request('https://w/api/ai/chat', { method: 'POST', headers: { Authorization: 'Bearer ' + (extra.token ?? (await mkJwt(sub))), 'Content-Type': 'application/json' }, body: JSON.stringify({ text, history: [] }) });
const originalFetch = globalThis.fetch;

await t('ใช้ได้ตามโควตา แล้วครั้งที่เกิน = 429 พร้อมข้อความ + Retry-After และ LLM ไม่ถูกเรียกเพิ่มเลย', async () => {
  const w = world({ calls: 2 }); globalThis.fetch = w.f;
  const r1 = await R.handleAiChat(await req('u1'), w.env), r2 = await R.handleAiChat(await req('u1'), w.env);
  assert.equal(r1.status, 200); assert.equal(r2.status, 200); const llmBefore = w.llm;
  const r3 = await R.handleAiChat(await req('u1'), w.env); const j = await r3.json();
  assert.equal(r3.status, 429); assert.equal(j.error, 'quota_exceeded'); assert.equal(j.reason, 'calls'); assert.match(j.text, /ครบ 2 ครั้ง/);
  assert.ok(Number(r3.headers.get('Retry-After')) > 0); assert.equal(w.llm, llmBefore, 'ต้องไม่เรียก LLM หลังโควตาเต็ม');
  assert.deepEqual(j.proposals, []);
});
await t('429 ไม่แตะฐานข้อมูล items และไม่เรียก MemoryLake (ประหยัดทุกอย่าง)', async () => {
  const w = world({ calls: 1 }); const seen = []; const f = w.f; w.env.CUSTOM_FETCH = async (u, i) => { seen.push(new URL(u).hostname + new URL(u).pathname); return f(u, i); }; globalThis.fetch = w.env.CUSTOM_FETCH;
  await R.handleAiChat(await req('u1'), w.env); seen.length = 0;
  const r = await R.handleAiChat(await req('u1'), w.env); assert.equal(r.status, 429);
  assert.deepEqual(seen.filter((x) => !x.includes('jwks') && !x.includes('/rpc/')), [], 'หลัง 429 ต้องไม่มีการเรียกอื่น: ' + seen.join(','));
});
await t('R3 โควตานับตาม sub ในโทเคนที่ตรวจแล้ว ไม่ใช่ user_id ใน body (แอบอ้างตัวตนไม่ได้)', async () => {
  const w = world({ calls: 1 }); globalThis.fetch = w.f;
  const mk = async (sub) => new Request('https://w/api/ai/chat', { method: 'POST', headers: { Authorization: 'Bearer ' + (await mkJwt(sub)), 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'สวัสดี', history: [], user_id: 'someone-else', userId: 'someone-else', p_user: 'someone-else' }) });
  await R.handleAiChat(await mk('real-user'), w.env);
  assert.deepEqual([...new Set(w.rpc.map((c) => c.b.p_user))], ['real-user']);
});
await t('โทเคนปลอม/ไม่มี -> 401 และไม่ถูกนับโควตา (ไม่เปิดช่องให้ผู้ไม่ล็อกอินเผาตัวนับ)', async () => {
  const w = world({ calls: 5 }); globalThis.fetch = w.f;
  const bad = await R.handleAiChat(await req('x', 'hi', { token: 'a.b.c' }), w.env);
  const none = await R.handleAiChat(new Request('https://w/api/ai/chat', { method: 'POST', body: '{}' }), w.env);
  assert.equal(bad.status, 401); assert.equal(none.status, 401); assert.equal(w.rpc.length, 0);
});
await t('R4 LLM ล่ม -> 503 และคืนโควตา 1 ครั้ง (ผู้ใช้ไม่เสียสิทธิ์)', async () => {
  const w = world({ calls: 3, llmDown: true }); globalThis.fetch = w.f;
  const r = await R.handleAiChat(await req('u1'), w.env); assert.equal(r.status, 503);
  const row = [...w.rows.values()][0]; assert.equal(row.calls, 0, 'ต้องคืนเป็น 0 แต่ได้ ' + row.calls);
  assert.ok(w.rpc.some((c) => c.name === 'ai_usage_settle' && c.b.p_refund === true));
});
await t('สำเร็จ -> ตัดโทเคนจริงจากที่ LLM รายงาน และไม่คืนโควตา', async () => {
  const w = world({ calls: 3 }); globalThis.fetch = w.f;
  const r = await R.handleAiChat(await req('u1'), w.env); const j = await r.json(); assert.equal(r.status, 200);
  const row = [...w.rows.values()][0]; assert.equal(row.calls, 1); assert.ok(row.tokens > 0, 'tokens=' + row.tokens); assert.equal(j.quota.used, 1); assert.equal(j.quota.limit, 3);
});
await t('R2 ตัวนับล่ม -> แชทยังตอบ 200 (fail-open) และไม่มี quota ในคำตอบ', async () => {
  const w = world({ calls: 1, rpcDown: true }); globalThis.fetch = w.f;
  const r = await R.handleAiChat(await req('u1'), w.env); const j = await r.json(); assert.equal(r.status, 200); assert.equal(j.quota, undefined); assert.ok(w.llm >= 1);
});
await t('R4b โหลด items ล้ม (502) ก่อนถึง AI -> คืนโควตา ผู้ใช้ไม่เสียสิทธิ์โดยไม่ได้ใช้ AI', async () => {
  const w = world({ calls: 3 }); const f0 = w.f;
  w.env.CUSTOM_FETCH = async (u, i) => (new URL(u).pathname.endsWith('/rest/v1/items') ? new Response('{}', { status: 500 }) : f0(u, i)); globalThis.fetch = w.env.CUSTOM_FETCH;
  const r = await R.handleAiChat(await req('u1'), w.env); assert.equal(r.status, 502);
  const row = [...w.rows.values()][0]; assert.equal(row.calls, 0, 'ต้องคืนเป็น 0 แต่ได้ ' + row.calls); assert.equal(w.llm, 0);
});
await t('R4c เครือข่ายล่ม/JSON พังตอนโหลด items (exception) -> คืนโควตา ไม่หลุดโดยไม่ refund', async () => {
  for (const mode of ['throw', 'badjson']) {
    const w = world({ calls: 3 }); const f0 = w.f;
    w.env.CUSTOM_FETCH = async (u, i) => { if (new URL(u).pathname.endsWith('/rest/v1/items')) { if (mode === 'throw') throw new Error('network down'); return new Response('<<not json>>', { status: 200 }); } return f0(u, i); };
    globalThis.fetch = w.env.CUSTOM_FETCH; let status = 0; try { status = (await R.handleAiChat(await req('u1'), w.env)).status; } catch { status = -1; }
    const row = [...w.rows.values()][0]; assert.equal(row.calls, 0, mode + ': ต้องคืนเป็น 0 แต่ได้ ' + row.calls + ' (status ' + status + ')'); assert.ok(status === 502 || status === 500, mode + ': status ' + status);
  }
});
await t('ผู้ใช้ A เต็มแล้ว ผู้ใช้ B ยังคุยได้ปกติ (ไม่ลามข้ามคน)', async () => {
  const w = world({ calls: 1 }); globalThis.fetch = w.f;
  await R.handleAiChat(await req('A'), w.env); assert.equal((await R.handleAiChat(await req('A'), w.env)).status, 429);
  assert.equal((await R.handleAiChat(await req('B'), w.env)).status, 200);
});
await t('ยิงขนาน 10 คำขอจริงผ่าน handleAiChat เพดาน 3 -> สำเร็จ 3 / 429 อีก 7', async () => {
  const w = world({ calls: 3 }); globalThis.fetch = w.f;
  const rs = await Promise.all(Array.from({ length: 10 }, async () => (await R.handleAiChat(await req('u1'), w.env)).status));
  assert.equal(rs.filter((s) => s === 200).length, 3); assert.equal(rs.filter((s) => s === 429).length, 7);
});
await t('คำตอบ 429 ไม่รั่ว user id/คีย์/รายละเอียดภายใน', async () => {
  const w = world({ calls: 1 }); globalThis.fetch = w.f; await R.handleAiChat(await req('secret-user-id-123'), w.env);
  const txt = await (await R.handleAiChat(await req('secret-user-id-123'), w.env)).text();
  for (const bad of ['secret-user-id-123', 'svc', 'sb_secret', 'gsk_', 'SUPABASE']) assert.ok(!txt.includes(bad), 'รั่ว: ' + bad);
});
globalThis.fetch = originalFetch;
await t('T6 body AI ใหญ่เกินต้อง 413 ก่อน parse และไม่ถึง LLM/โควตา', async () => {
  const w = world({ calls: 5 }); globalThis.fetch = w.f;
  const big = JSON.stringify({ text: 'ก', history: [], pad: 'x'.repeat(200_000) });
  const r = await R.handleAiChat(new Request('https://w/api/ai/chat', { method: 'POST', headers: { Authorization: 'Bearer ' + (await mkJwt('ubig')), 'Content-Type': 'application/json' }, body: big }), w.env);
  assert.equal(r.status, 413); assert.equal(w.llm, 0, 'ถึง LLM'); assert.equal(w.rpc.filter(x => x.name === 'ai_usage_take').length, 0, 'กินโควตา');
});
console.log(`\n${pass} ผ่าน / ${fail} ตก`); process.exit(fail ? 1 : 0);

/* ชุดทดสอบโควตา AI รายผู้ใช้ — Supabase จำลองให้ซื่อตรงกับ migrations-002-ai-usage.sql (ล็อกแถวต่อคิว)
   ครอบคลุมความเสี่ยง R1-R10 ใน .state/work/evarel-quota/spec.md
   ข้อจำกัด: พิสูจน์ตรรกะของ Worker ไม่ได้พิสูจน์ SQL จริง (ดู quota-live.mjs หลังรัน migration) */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = async (src, dst) => { execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, src)} --bundle --format=esm --outfile=${dst} --log-level=error`); return import(pathToFileURL(dst).href + '?t=' + Date.now()); };
const Q = await bundle('./quota.ts', '/tmp/ai-quota-bundle.mjs');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.message).slice(0, 220)); } };

/* Postgres จำลอง: take = ล็อกแถว (ต่อคิว) -> อ่าน -> ตรวจ -> เขียน | มี await คั่นกลางจงใจ เพื่อให้โค้ดที่ไม่ atomic พังจริง */
function fakeSB(opts = {}) {
  const st = { rows: new Map(), calls: [], locks: new Map() };
  const key = (u, d) => u + '|' + d;
  const lock = async (k, fn) => { const prev = st.locks.get(k) || Promise.resolve(); let done; const cur = new Promise((r) => (done = r)); st.locks.set(k, prev.then(() => cur)); await prev; try { return await fn(); } finally { done(); } };
  const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
  const f = async (url, o = {}) => {
    const name = new URL(url).pathname.split('/rpc/')[1]; const b = JSON.parse(o.body || '{}'); st.calls.push({ name, b, auth: o.headers?.Authorization });
    if (opts.down) throw new Error('network down');
    if (opts.noTable) return json({ code: 'PGRST202', message: 'function not found' }, 404);
    if (opts.slow) await new Promise((r, rej) => { const tm = setTimeout(r, opts.slow); o.signal?.addEventListener('abort', () => { clearTimeout(tm); rej(new Error('aborted')); }); });
    if (name === 'ai_usage_take') {
      if (!(b.p_calls_limit >= 1) || !(b.p_tokens_limit >= 1)) return json({ message: 'bad_limits' }, 400);
      return lock(key(b.p_user, b.p_day), async () => {
        const k = key(b.p_user, b.p_day); const row = st.rows.get(k) || { calls: 0, tokens: 0 };
        await new Promise((r) => setTimeout(r, 2)); // ช่องว่างอ่าน->เขียน: ถ้าไม่ล็อกจะเห็นค่าซ้ำและข้ามเพดาน
        let glob = 0; for (const [kk, v] of st.rows) if (kk.endsWith('|' + b.p_day)) glob += v.calls;
        if (b.p_global_calls > 0 && glob >= b.p_global_calls) return json([{ ok: false, reason: 'global', calls: row.calls, tokens: row.tokens }]);
        if (row.calls >= b.p_calls_limit) return json([{ ok: false, reason: 'calls', calls: row.calls, tokens: row.tokens }]);
        if (row.tokens >= b.p_tokens_limit) return json([{ ok: false, reason: 'tokens', calls: row.calls, tokens: row.tokens }]);
        row.calls++; st.rows.set(k, row); return json([{ ok: true, reason: 'ok', calls: row.calls, tokens: row.tokens }]);
      });
    }
    if (name === 'ai_usage_settle') {
      const row = st.rows.get(key(b.p_user, b.p_day)); if (!row) return new Response(null, { status: 204 });
      if (b.p_refund) row.calls = Math.max(0, row.calls - 1); else row.tokens += Math.max(0, b.p_add_tokens || 0);
      return new Response(null, { status: 204 });
    }
    return json({}, 404);
  };
  return { f, st };
}
const mkEnv = (sb, extra = {}) => ({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'svc', CUSTOM_FETCH: sb.f, ...extra });
const NOW = new Date('2026-10-11T03:00:00Z'); // 10:00 Bangkok

await t('R1 ยิงขนาน 20 ครั้ง เพดาน 5 -> ผ่านได้ 5 พอดี ไม่เกิน', async () => {
  const sb = fakeSB(); const env = mkEnv(sb, { AI_DAILY_CALLS: '5', AI_GLOBAL_CALLS: '0' });
  const rs = await Promise.all(Array.from({ length: 20 }, () => Q.reserve(env, 'u1', NOW)));
  assert.equal(rs.filter((r) => r.allowed).length, 5); assert.equal(rs.filter((r) => !r.allowed).length, 15);
  assert.equal(sb.st.rows.get('u1|2026-10-11').calls, 5);
});
await t('R1b ผู้ใช้คนละคนไม่แย่งโควตากัน (A เต็ม B ยังได้)', async () => {
  const sb = fakeSB(); const env = mkEnv(sb, { AI_DAILY_CALLS: '2', AI_GLOBAL_CALLS: '0' });
  await Q.reserve(env, 'A', NOW); await Q.reserve(env, 'A', NOW);
  assert.equal((await Q.reserve(env, 'A', NOW)).allowed, false);
  assert.equal((await Q.reserve(env, 'B', NOW)).allowed, true);
});
await t('R3 user id ที่ส่งไป RPC คือตัวที่ฟังก์ชันได้รับ (Worker ไม่รับจาก body) + ใช้ service key', async () => {
  const sb = fakeSB(); await Q.reserve(mkEnv(sb), 'user-from-jwt', NOW);
  assert.equal(sb.st.calls[0].b.p_user, 'user-from-jwt'); assert.equal(sb.st.calls[0].auth, 'Bearer svc');
});
await t('R6 ข้ามเที่ยงคืน Bangkok: 16:59Z (23:59 BKK) กับ 17:00Z (00:00 BKK) คนละวัน -> รีเซ็ต', async () => {
  const sb = fakeSB(); const env = mkEnv(sb, { AI_DAILY_CALLS: '1', AI_GLOBAL_CALLS: '0' });
  const a = await Q.reserve(env, 'u', new Date('2026-10-11T16:59:00Z')); const b = await Q.reserve(env, 'u', new Date('2026-10-11T16:59:30Z'));
  const c = await Q.reserve(env, 'u', new Date('2026-10-11T17:00:00Z'));
  assert.equal(a.allowed, true); assert.equal(a.day, '2026-10-11'); assert.equal(b.allowed, false); assert.equal(c.allowed, true); assert.equal(c.day, '2026-10-12');
});
await t('R6b resetAt = เที่ยงคืน Bangkok ถัดไป (17:00Z) และข้อความบอกเวลา 00:00', async () => {
  const sb = fakeSB(); const env = mkEnv(sb, { AI_DAILY_CALLS: '1', AI_GLOBAL_CALLS: '0' });
  await Q.reserve(env, 'u', NOW); const r = await Q.reserve(env, 'u', NOW);
  assert.equal(r.allowed, false); assert.equal(r.resetAt, '2026-10-11T17:00:00.000Z'); assert.match(Q.limitMessage(r), /00:00/);
});
await t('R2 ฐานข้อมูลล่ม -> fail-open ปล่อยผ่าน ไม่นับ (metered=false)', async () => {
  const r = await Q.reserve(mkEnv(fakeSB({ down: true })), 'u', NOW); assert.equal(r.allowed, true); assert.equal(r.metered, false);
});
await t('R2b ยังไม่รัน migration (ฟังก์ชันไม่มี 404) -> fail-open', async () => {
  const r = await Q.reserve(mkEnv(fakeSB({ noTable: true })), 'u', NOW); assert.equal(r.allowed, true); assert.equal(r.metered, false);
});
await t('R2c ตัวนับช้า -> หมดเวลา 2.5 วินาทีแล้วปล่อยผ่าน ไม่ขวางแชท', async () => {
  const t0 = Date.now(); const r = await Q.reserve(mkEnv(fakeSB({ slow: 6000 })), 'u', NOW); const ms = Date.now() - t0;
  assert.equal(r.allowed, true); assert.equal(r.metered, false); assert.ok(ms < 3500 && ms >= 2400, 'ใช้เวลา ' + ms + 'ms');
});
await t('R8 เพดานรวม: ทุกคนรวมถึงเพดาน -> คนใหม่ก็ถูกบล็อก (reason=global)', async () => {
  const sb = fakeSB(); const env = mkEnv(sb, { AI_DAILY_CALLS: '10', AI_GLOBAL_CALLS: '3' });
  for (const u of ['a', 'b', 'c']) assert.equal((await Q.reserve(env, u, NOW)).allowed, true);
  const r = await Q.reserve(env, 'd', NOW); assert.equal(r.allowed, false); assert.equal(r.reason, 'global'); assert.match(Q.limitMessage(r), /ระบบเต็ม/);
});
await t('R9 ค่าตั้งผิดรูป (ติดลบ/ข้อความ/0/ทศนิยม/ว่าง) -> ใช้ค่าเริ่มต้น ไม่ปิดโควตาเงียบๆ', () => {
  for (const bad of ['-5', 'abc', '0', '2.5', '', ' ', 'NaN', '99999999999']) {
    const c = Q.readCfg({ AI_DAILY_CALLS: bad, AI_DAILY_TOKENS: bad }); assert.equal(c.calls, Q.DEFAULTS.calls, 'calls ' + JSON.stringify(bad)); assert.equal(c.tokens, Q.DEFAULTS.tokens);
  }
  assert.equal(Q.readCfg({ AI_GLOBAL_CALLS: '0' }).global, 0); // 0 = ปิดเพดานรวม (ตั้งใจ)
  assert.equal(Q.readCfg({ AI_DAILY_CALLS: '7' }).calls, 7);
});
await t('ยืดหยุ่น: ปรับตัวเลขผ่าน env ได้โดยไม่แก้โค้ด', async () => {
  const sb = fakeSB(); const e = mkEnv(sb, { AI_DAILY_CALLS: '3', AI_GLOBAL_CALLS: '0' });
  const rs = []; for (let i = 0; i < 5; i++) rs.push((await Q.reserve(e, 'u', NOW)).allowed); assert.deepEqual(rs, [true, true, true, false, false]);
});
await t('โทเคนเต็ม: settle ตัดโทเคนจริง -> ครั้งถัดไปถูกบล็อก reason=tokens', async () => {
  const sb = fakeSB(); const env = mkEnv(sb, { AI_DAILY_CALLS: '50', AI_DAILY_TOKENS: '1000', AI_GLOBAL_CALLS: '0' });
  const r = await Q.reserve(env, 'u', NOW); await Q.settle(env, 'u', r.day, 1200, false);
  const r2 = await Q.reserve(env, 'u', NOW); assert.equal(r2.allowed, false); assert.equal(r2.reason, 'tokens');
});
await t('R4 refund: LLM ล่มคืนโควตา 1 ครั้ง ไม่ติดลบ', async () => {
  const sb = fakeSB(); const env = mkEnv(sb, { AI_DAILY_CALLS: '2', AI_GLOBAL_CALLS: '0' });
  const a = await Q.reserve(env, 'u', NOW); await Q.settle(env, 'u', a.day, 0, true);
  assert.equal(sb.st.rows.get('u|2026-10-11').calls, 0); await Q.settle(env, 'u', a.day, 0, true); assert.equal(sb.st.rows.get('u|2026-10-11').calls, 0);
});
await t('settle ล้ม (เครือข่าย) -> ไม่โยน error ใส่ผู้ใช้', async () => { await Q.settle(mkEnv(fakeSB({ down: true })), 'u', '2026-10-11', 100, false); });
await t('settle โทเคนติดลบ/NaN/ทศนิยม -> ถูกทำให้ปลอดภัยก่อนส่ง (ไม่ส่งค่าลบให้ฐานข้อมูล)', async () => {
  const sb = fakeSB(); await Q.settle(mkEnv(sb), 'u', '2026-10-11', -500, false); await Q.settle(mkEnv(sb), 'u', '2026-10-11', NaN, false); await Q.settle(mkEnv(sb), 'u', '2026-10-11', 12.9, false);
  assert.deepEqual(sb.st.calls.map((c) => c.b.p_add_tokens), [0, 0, 12]);
  // ตรวจผลจริงด้วย: settle ต้องสำเร็จ (ไม่ถูก Worker กลืน error) ตัวนับโทเคนต้องเปลี่ยนเฉพาะค่าบวก
  const sb2 = fakeSB(); const e2 = mkEnv(sb2, { AI_GLOBAL_CALLS: '0' }); const r = await Q.reserve(e2, 'u', NOW);
  await Q.settle(e2, 'u', r.day, -500, false); await Q.settle(e2, 'u', r.day, NaN, false); await Q.settle(e2, 'u', r.day, 12.9, false);
  assert.equal(sb2.st.rows.get('u|2026-10-11').tokens, 12);
});
await t('ข้อความเตือน 3 แบบแตกต่างกันและบอกเวลารีเซ็ต', () => {
  const base = { allowed: false, day: 'd', resetAt: '2026-10-11T17:00:00.000Z', calls: 40, tokens: 0, limits: { calls: 40, tokens: 60000, global: 800 } };
  const m = ['calls', 'tokens', 'global'].map((reason) => Q.limitMessage({ ...base, reason })); assert.equal(new Set(m).size, 3); assert.match(m[0], /40 ครั้ง/); m.forEach((x) => assert.match(x, /00:00/));
});

console.log(`\n${pass} ผ่าน / ${fail} ตก`); process.exit(fail ? 1 : 0);

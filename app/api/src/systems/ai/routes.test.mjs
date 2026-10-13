import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const out = '/tmp/ai-bundle.mjs';
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../index.ts')} --bundle --format=esm --outfile=${out}`);
const worker = (await import(pathToFileURL(out).href)).default;

let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '::', String(e.message).slice(0, 160)); } };

const ITEMS = [
  { id: 1, type: 'habit', title: 'อ่านหนังสือ', time: '20:00', track: 'check', target: 1, repeat: { unit: 'day', every: 1, days: [] }, start: '2026-10-01', end: '' },
  { id: 2, type: 'task', title: 'การบ้านฟิสิกส์', time: '', track: 'check', target: 1, repeat: { unit: 'none', every: 1, days: [] }, start: '2026-10-12', end: '' },
];
// เทียบ JWT: ใช้ตัวตรวจจริงไม่ได้ในชุดนี้ จึงจำลอง JWKS ผ่าน CUSTOM_FETCH ไม่ได้ง่าย -> ทดสอบเส้นทางผ่าน verifyJWT จริงในชุด live แทน
// ชุดนี้ทดสอบ agent ตรงๆ (ไม่ผ่าน route) เพื่อพิสูจน์ตรรกะ
const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = (src, dst) => { execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.resolve(here, src)} --bundle --format=esm --outfile=${dst} --log-level=error`); return import(pathToFileURL(dst).href + '?v=' + Date.now()); };
const { runAgent, MAX_ROUNDS } = await bundle('./agent.ts', '/tmp/ai-agent-bundle.mjs');
const { validate } = await bundle('./tools.ts', '/tmp/ai-tools-bundle.mjs');

// LLM จำลอง: คิวคำตอบต่อการเรียก + บันทึกจำนวนเรียกแต่ละ provider
const llm = (script) => { const calls = { groq: 0, or: 0, bodies: [] }; let i = 0;
  const f = async (url, o) => { const isG = url.includes('groq'); isG ? calls.groq++ : calls.or++; calls.bodies.push(JSON.parse(o.body));
    const step = script[Math.min(i++, script.length - 1)];
    if (typeof step === 'function') return step(isG);
    return new Response(JSON.stringify({ choices: [{ message: step }], usage: { total_tokens: 100 } }), { status: 200 }); };
  return { f, calls }; };
const tc = (name, args, id = 'c1') => ({ role: 'assistant', content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }] });
const env = (f) => ({ GROQ_API_KEY: 'g', OPENROUTER_API_KEY: 'o', CUSTOM_FETCH: f });
const NOW = new Date('2026-10-10T11:00:00Z');

await t('validate: ปฏิเสธ id ที่ไม่มีจริง (กัน AI เดา id)', () => { const r = validate('item_delete', { id: 999 }, ITEMS); assert.equal(r.ok, false); assert.match(r.error, /ไม่พบ/); });
await t('validate: รับ id จริง', () => assert.equal(validate('item_delete', { id: 2 }, ITEMS).ok, true));
await t('validate: เวลาผิดรูปแบบถูกปฏิเสธ', () => assert.equal(validate('item_create', { title: 'x', time: '25:99' }, ITEMS).ok, false));
await t('validate: วันที่ผิดรูปแบบถูกปฏิเสธ', () => assert.equal(validate('item_create', { title: 'x', start: '10/10/2026' }, ITEMS).ok, false));
await t('validate: ตัด key แปลกปลอม (user_id) ทิ้ง', () => { const r = validate('item_create', { title: 'x', user_id: 'evil', id: 5 }, ITEMS); assert.equal(r.ok, true); assert.equal('user_id' in r.args, false); assert.equal('id' in r.args, false); });
await t('validate: รายสัปดาห์ต้องมี days', () => assert.equal(validate('item_create', { title: 'x', repeat: { unit: 'week', every: 1 } }, ITEMS).ok, false));
await t('validate: title ยาวเกินถูกตัด 120', () => assert.equal(validate('item_create', { title: 'ก'.repeat(500) }, ITEMS).args.title.length, 120));

await t('ค้นด้วยชื่อ: เจอข้าม วัน (ไม่ต้องใส่ date)', async () => {
  const { runQuery } = await bundle('./tools.ts', '/tmp/ai-tools-bundle2.mjs');
  const r = runQuery({ name: 'ฟิสิกส์' }, ITEMS); assert.equal(r.length, 1); assert.equal(r[0].id, 2); });
await t('ค้นด้วยชื่อ: ถ้ามี name จะไม่ใช้ date กรองทิ้ง', () => { const r = validate('item_query', { name: 'ฟิสิกส์', date: '2026-10-10' }, ITEMS); assert.equal(r.ok, true); assert.equal('date' in r.args, false); });
await t('เขียน: item_create -> ข้อเสนอ ไม่เรียก LLM รอบสอง', async () => {
  const L = llm([tc('item_create', { title: 'อ่านหนังสือ', type: 'habit', time: '20:00', repeat: { unit: 'day', every: 1 } })]);
  const r = await runAgent(env(L.f), 'เพิ่มกิจวัตรอ่านหนังสือ 2 ทุ่ม', [], ITEMS, NOW);
  assert.equal(r.proposals.length, 1); assert.equal(r.proposals[0].tool, 'item_create'); assert.equal(r.rounds, 1); assert.equal(L.calls.groq, 1); });
await t('อ่าน: item_query รันด้วยโค้ดแล้วส่งผลกลับ LLM (2 รอบ)', async () => {
  const L = llm([tc('item_query', { date: '2026-10-11' }), { role: 'assistant', content: 'พรุ่งนี้มีอ่านหนังสือ 20:00' }]);
  const r = await runAgent(env(L.f), 'พรุ่งนี้มีอะไรบ้าง', [], ITEMS, NOW);
  assert.equal(r.rounds, 2); assert.equal(r.proposals.length, 0); assert.match(r.text, /อ่านหนังสือ/);
  const toolMsg = L.calls.bodies[1].messages.find((m) => m.role === 'tool'); assert.match(toolMsg.content, /อ่านหนังสือ/); assert.doesNotMatch(toolMsg.content, /การบ้านฟิสิกส์/); });
await t('เดา id: ถูกปฏิเสธ ไม่เกิดข้อเสนอลบ', async () => {
  const L = llm([tc('item_delete', { id: 999 }), { role: 'assistant', content: 'ไม่พบรายการนั้นครับ' }]);
  const r = await runAgent(env(L.f), 'ลบงานนั้น', [], ITEMS, NOW); assert.equal(r.proposals.length, 0); });
await t('เพดาน: วนเครื่องมือไม่จบ หยุดที่ 3 รอบ', async () => {
  const L = llm([tc('item_query', {})]); const r = await runAgent(env(L.f), 'วนไป', [], ITEMS, NOW);
  assert.equal(r.rounds, MAX_ROUNDS); assert.equal(L.calls.groq, 3); assert.equal(r.limited, true); });
await t('failover: Groq 429 -> OpenRouter', async () => {
  const L = llm([(isG) => isG ? new Response('{}', { status: 429 }) : new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'ตอบจากสำรอง' } }], usage: { total_tokens: 50 } }), { status: 200 })]);
  const r = await runAgent(env(L.f), 'สวัสดี', [], ITEMS, NOW); assert.equal(r.provider, 'openrouter'); assert.equal(L.calls.groq, 1); assert.equal(L.calls.or, 1); });
await t('failover: Groq 5xx -> OpenRouter', async () => {
  const L = llm([(isG) => isG ? new Response('x', { status: 503 }) : new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }), { status: 200 })]);
  assert.equal((await runAgent(env(L.f), 'hi', [], ITEMS, NOW)).provider, 'openrouter'); });
await t('failover: Groq ค้าง (timeout) -> OpenRouter', async () => {
  const L = llm([(isG) => isG ? Promise.reject(new DOMException('aborted', 'AbortError')) : new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }), { status: 200 })]);
  assert.equal((await runAgent(env(L.f), 'hi', [], ITEMS, NOW)).provider, 'openrouter'); });
await t('failover: OpenRouter ตัวแรก 404 -> ตัวที่สอง (โมเดลฟรีถูกยกเลิกได้)', async () => {
  const seen = []; const f = async (url, o) => { const b = JSON.parse(o.body); seen.push(b.model);
    if (url.includes('groq')) return new Response('{}', { status: 429 });
    if (b.model.includes('super')) return new Response('{"error":{"code":404}}', { status: 404 });
    return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'จากตัวที่สอง' } }], usage: { total_tokens: 40 } }), { status: 200 }); };
  const r = await runAgent(env(f), 'hi', [], ITEMS, NOW);
  assert.equal(r.provider, 'openrouter'); assert.match(r.text, /ตัวที่สอง/); assert.equal(seen.length, 3); assert.ok(seen[2].includes('ultra')); });
await t('failover: ทุกตัวล่ม (Groq + OR 2 ตัว) -> llm_unavailable ไม่วนไม่สิ้นสุด', async () => {
  let n = 0; const f = async () => { n++; return new Response('x', { status: 429 }); };
  await assert.rejects(() => runAgent(env(f), 'hi', [], ITEMS, NOW), /llm_unavailable/); assert.equal(n, 3); });
await t('ทั้งสองล่ม -> โยน llm_unavailable', async () => {
  const L = llm([() => new Response('x', { status: 500 })]);
  await assert.rejects(() => runAgent(env(L.f), 'hi', [], ITEMS, NOW), /llm_unavailable/); });
await t('400 จากเรา (ไม่ใช่โควตา) -> ไม่สลับ ไม่เปลืองสำรอง', async () => {
  const L = llm([() => new Response('bad', { status: 400 })]);
  await assert.rejects(() => runAgent(env(L.f), 'hi', [], ITEMS, NOW), /llm_bad_request/); assert.equal(L.calls.or, 0); });
await t('system prompt ฝังวันเวลาไทยที่ถูกต้อง (เสาร์ 10 ต.ค. 18:00)', async () => {
  const L = llm([{ role: 'assistant', content: 'ok' }]); await runAgent(env(L.f), 'hi', [], ITEMS, NOW);
  const sys = L.calls.bodies[0].messages[0].content; assert.match(sys, /เสาร์ที่ 2026-10-10 เวลา 18:00/); });
await t('ประวัติ: ส่งไม่เกิน 8 ข้อความล่าสุด', async () => {
  const h = Array.from({ length: 20 }, (_, i) => ({ who: i % 2 ? 'a' : 'u', text: 'm' + i }));
  const L = llm([{ role: 'assistant', content: 'ok' }]); await runAgent(env(L.f), 'hi', h, ITEMS, NOW);
  assert.equal(L.calls.bodies[0].messages.length, 1 + 8 + 1); });
await t('ไม่ส่ง key ลับไปใน body ของ LLM', async () => {
  const L = llm([{ role: 'assistant', content: 'ok' }]); await runAgent(env(L.f), 'hi', [], ITEMS, NOW);
  assert.doesNotMatch(JSON.stringify(L.calls.bodies), /"g"|SUPABASE|service/i); });

// route: ไม่มี token / JSON เสีย / ข้อความว่าง
const R = (body, hdr = {}) => worker.fetch(new Request('https://x/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr }, body }), { SUPABASE_URL: 'https://s.example', SUPABASE_SERVICE_KEY: 'k' });
await t('route: ไม่มี token -> 401', async () => assert.equal((await R('{"text":"hi"}')).status, 401));
await t('route: GET ไม่ได้ -> 404', async () => assert.equal((await worker.fetch(new Request('https://x/api/ai/chat'), { SUPABASE_URL: 'x', SUPABASE_SERVICE_KEY: 'k' })).status, 404));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

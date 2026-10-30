/* เทียบ applyProposal ของโค้ดเดิม (ตัวอ้างอิง = เนื้อไฟล์ 18-services__ai-live.ts จาก git ก่อนย้าย) กับ applyProposalTo ใน core/aiproposal
   เทียบผลสองอย่างต่อกรณี: (1) ค่าที่คืน true/false (2) อาร์เรย์ items ทั้งก้อนแบบลึกหลังรัน เพราะต้นฉบับแก้ในที่และ commit() ของแอปพึ่งพฤติกรรมนี้
   ตัวอ้างอิงต้องไม่ใช่ไฟล์ที่เรากำลังจะแก้ (ไม่งั้นเทียบกับตัวเอง) จึงอ่านจาก git object ที่ commit ฐานระบุ (REF_COMMIT) ไม่ใช่จากดิสก์
   ใช้: node tests/aiproposal_equiv.test.mjs   ผล: exit 1 ถ้าต่างแม้กรณีเดียว
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/aiproposal_equiv.test.mjs (ต้อง exit 1 ทุกค่า) */
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF_COMMIT = '9a8cd1d';
const ref = execFileSync('git', ['show', REF_COMMIT + ':app/src/m/18-services__ai-live.ts'], { cwd: root, encoding: 'utf8' });

/* ตัวอ้างอิง: ตัดวางเฉพาะ remFrom กับ applyProposal จากไฟล์เดิม แล้วให้ global ที่มันพึ่ง (S TODAY find mk daily) มาจากเทสต์ */
const cut = (name) => { const i = ref.indexOf(name); if (i < 0) throw new Error('ไม่พบ ' + name + ' ในตัวอ้างอิง'); return i; };
const remSrc = ref.slice(cut('const remFrom='), ref.indexOf('\n', cut('const remFrom=')));
const apStart = cut('function applyProposal(c)'); const apEnd = ref.indexOf('\nObject.assign(window', apStart);
const apSrc = ref.slice(apStart, apEnd);
const strip = (s) => s.replace(/:\s*any\b/g, '').replace(/:number/g, '');
const REF_DAILY = () => ({ unit: 'day', every: 1, days: [] });
const buildRef = (S, TODAY, nextId) => {
  const find = (id) => S.items.find((x) => x.id == id);
  const mk = (o) => ({ id: o.id, type: 'habit', title: '', subject: '', start: TODAY, end: '', time: '', timeEnd: '', rem: [{ k: 'before', m: 0 }], track: 'none', target: 1, unitName: '', repeat: { unit: 'none', every: 1, days: [] }, log: {}, skip: {}, ...o });
  /* ต้นฉบับใช้ Date.now()+random: แทนด้วยค่าคงที่ทีละกรณีเพื่อเทียบได้ (ทั้งสองฝั่งได้ id เดียวกัน) */
  const D = { now: () => nextId };
  const M = { floor: () => 0, random: () => 0 };
  return new Function('S', 'TODAY', 'find', 'mk', 'daily', 'Date', 'Math', strip(remSrc) + '\n' + strip(apSrc) + '\nreturn applyProposal;')(S, TODAY, find, mk, REF_DAILY, D, M);
};

const core = await import('file://' + root + '/app/web/js/m/core/aiproposal.js');
const inj = Number(process.env.INJECT || 0);
const TODAY = '2026-10-30';
const base = () => [
  { id: 1, type: 'habit', title: 'ดื่มน้ำ', start: '2026-10-01', rem: [{ k: 'before', m: 0 }], log: { '2026-10-29': 5 }, skip: {}, repeat: { unit: 'day', every: 1, days: [] }, track: 'count', target: 8 },
  { id: 2, type: 'task', title: 'ส่งงาน', start: '2026-10-30', rem: [], log: {}, skip: {}, repeat: { unit: 'none', every: 1, days: [] }, track: 'check', target: 1 },
  { id: '3', type: 'event', title: 'นัดหมอ', start: '2026-10-31', rem: [], log: {}, skip: {}, repeat: { unit: 'none', every: 1, days: [] }, track: 'none', target: 1 },
];
const P = (tool, args, extra = {}) => ({ tool, args, ...extra });
const CASES = [
  ['สร้าง habit ไม่มี repeat (ได้ daily + track check)', P('item_create', { type: 'habit', title: 'อ่านหนังสือ' })],
  ['สร้าง habit มี repeat เอง', P('item_create', { type: 'habit', title: 'วิ่ง', repeat: { unit: 'week', every: 1, days: [1, 3] } })],
  ['สร้าง task ไม่มี start (ได้ today + track check)', P('item_create', { type: 'task', title: 'ซื้อของ' })],
  ['สร้าง event (track none) มี start', P('item_create', { type: 'event', title: 'งานเลี้ยง', start: '2026-11-02', time: '18:00' })],
  ['สร้างมี track เอง ต้องไม่ทับ', P('item_create', { type: 'task', title: 'x', track: 'count', target: 3 })],
  ['สร้างมี rem เป็นตัวเลขนาที', P('item_create', { type: 'event', title: 'y', rem: [0, 10, 60] })],
  ['สร้าง rem ผิดรูป (ติดลบ/ข้อความ/null)', P('item_create', { type: 'task', title: 'z', rem: [-5, 'a', null, 15, '30'] })],
  ['สร้าง rem ไม่ใช่อาร์เรย์', P('item_create', { type: 'task', title: 'w', rem: 20 })],
  ['สร้าง args ว่าง (ไม่มี type)', P('item_create', {})],
  ['แก้ title ด้วย id ตัวเลข', P('item_update', { id: 1, title: 'ดื่มน้ำเปล่า' })],
  ['แก้ด้วย id สตริงที่ตรง id ตัวเลข (== หลวม)', P('item_update', { id: '2', title: 'ส่งงานด่วน' })],
  ['แก้ item ที่ id เป็นสตริง ด้วย id ตัวเลข', P('item_update', { id: 3, title: 'นัดหมอฟัน' })],
  ['แก้พร้อม rem (แปลงนาที)', P('item_update', { id: 1, rem: [5, 30], time: '08:00' })],
  ['แก้ rem=[] (ว่าง ต้องไม่ถูกแทนเพราะ truthy)', P('item_update', { id: 1, rem: [], time: '07:00' })],
  ['แก้ไม่พบ id', P('item_update', { id: 99, title: 'x' })],
  ['ลบด้วย id', P('item_delete', { id: 2 })],
  ['ลบด้วย id สตริง', P('item_delete', { id: '1' })],
  ['ลบไม่พบ', P('item_delete', { id: 77 })],
  ['log_set', P('log_set', { id: 1, date: '2026-10-30', value: 8 })],
  ['log_set ทับค่าเดิม', P('log_set', { id: 1, date: '2026-10-29', value: 0 })],
  ['log_set ไม่พบ', P('log_set', { id: 50, date: '2026-10-30', value: 1 })],
  ['skip_set', P('skip_set', { id: 2, date: '2026-10-30' })],
  ['skip_set ไม่พบ', P('skip_set', { id: 9, date: '2026-10-30' })],
  ['reminder_set', P('reminder_set', { id: 1, rem: [0, 15] })],
  ['reminder_set rem ว่าง (แทนเป็น [])', P('reminder_set', { id: 1, rem: [] })],
  ['reminder_set ไม่พบ', P('reminder_set', { id: 8, rem: [5] })],
  ['เครื่องมือที่ไม่รู้จัก (memory_save)', P('memory_save', { fact: 'x' })],
  ['ไม่มี args', { tool: 'item_update' }],
  ['args เป็น null', { tool: 'item_delete', args: null }],
];

let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); } };
const nextId = 1760100999999;
for (const [name, c] of CASES) {
  const A = base(), B = base();
  const before = B.slice(); const beforeLog = B.map((o) => [o, o.log, o.skip]);
  const rA = buildRef({ items: A }, TODAY, nextId)(JSON.parse(JSON.stringify(c)));
  let ctxId = nextId; if (inj === 1) ctxId = nextId + 1;
  let items = B; if (inj === 2) items = B.slice();
  if (inj === 6) B.forEach((x) => { x.log = { ...x.log }; x.skip = { ...x.skip }; }); /* หลังสำรองตัวอ้างอิงแล้ว: จำลองโค้ดที่เปลี่ยน log เป็นอ็อบเจ็กต์ใหม่ */
  let cc = JSON.parse(JSON.stringify(c)); if (inj === 3 && cc.tool === 'item_update' && cc.args) cc.args = { ...cc.args, id: String(cc.args.id) + 'x' };
  let rB = core.applyProposalTo(items, cc, { today: inj === 4 ? '2000-01-01' : TODAY, id: ctxId });
  if (inj === 5 && c.tool === 'item_delete') rB = !rB;
  t(name + ' | ค่าที่คืน', rA === rB, String(rA) + ' vs ' + String(rB));
  /* สัญญาที่ commit() พึ่ง: อ็อบเจ็กต์รายการเดิมและ log/skip ของมันต้องเป็นตัวเดิม (แก้ในที่) ไม่ใช่สำเนาที่ค่าเท่ากัน ไม่งั้น undo/sync ที่ถือตัวอ้างอิงเก่าจะเห็นข้อมูลเก่า */
  t(name + ' | แก้ในที่ (อ็อบเจ็กต์เดิมยังเป็นตัวเดิม)', before.every((o, i) => o === B[i] || !B.includes(o) ? true : B[B.indexOf(o)] === o) && beforeLog.every(([o, lg, sk]) => !B.includes(o) || (o.log === lg && o.skip === sk)));
  const sa = JSON.stringify(A), sb = JSON.stringify(B);
  t(name + ' | items ทั้งก้อนเท่ากัน', sa === sb, sa === sb ? '' : '\n  ref=' + sa.slice(0, 300) + '\n  new=' + sb.slice(0, 300));
}
/* remFrom เดี่ยว เทียบกับตัวอ้างอิงโดยตรง */
const refRem = new Function(strip(remSrc) + '\nreturn remFrom;')();
const remIn = [[], [0], [1, 2, 3], [-1, 0], ['5', '10'], [null], ['x'], 5, null, undefined, 'abc', { 0: 1 }, [0, NaN, 7], [1.5, 2.5], [true, false]];
for (const r of remIn) t('remFrom ' + JSON.stringify(r), JSON.stringify(refRem(r)) === JSON.stringify(inj === 7 ? core.remFrom(Array.isArray(r) ? r.slice(1) : r) : core.remFrom(r)));
/* id ตัวเลขที่ต้นฉบับสุ่มต้องถูกส่งผ่าน ctx.id ตรงๆ ไม่ถูกทับ */
{ const L = []; core.applyProposalTo(L, P('item_create', { type: 'task', title: 'q' }), { today: TODAY, id: 424242 }); t('ctx.id ถูกใช้เป็น id รายการใหม่', L[0]?.id === 424242, String(L[0]?.id)); }
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
process.exit(fail ? 1 : 0);

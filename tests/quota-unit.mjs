/* หน่วยทดสอบโมดูล services/ai-quota ของแอป (evarel-quota-ui): ดึงโค้ดจริงจาก app.js มารันใน node
   ครอบคลุมบั๊กที่ผู้รีวิวอิสระเจอและผมยืนยันกับโค้ดจริงแล้ว: NaN loop, ค้างข้ามผู้ใช้, race, limit=0 */
import fs from 'node:fs'; import assert from 'node:assert/strict';
const src = fs.readFileSync(new URL('../app-v13/js/app.js', import.meta.url), 'utf8');
const i = src.indexOf('const QUOTA_LOW'), j = src.indexOf('function aiSend(');
const code = src.slice(i, j);
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('PASS', n); } catch (e) { fail++; console.log('FAIL', n, '::', String(e.message).slice(0, 200)); } };
/* ห้องทดลอง: DOM เทียมขั้นต่ำ + เวลา/ตัวจับเวลาที่ควบคุมได้ + fetch ที่สั่งได้ */
function lab(o = {}) {
  const dom = { ta: { disabled: false, placeholder: '', value: '' }, send: { disabled: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } }, chip: { hidden: true, textContent: '', dataset: {} }, form: { dataset: {}, querySelector: () => dom.send } };
  const els = { aiForm: dom.form, aiText: dom.ta, aiQuota: dom.chip };
  const sheets = []; const timers = []; let now = o.now ?? Date.UTC(2026, 9, 11, 3, 0, 0), fetches = [];
  const api = {
    AI_PLACEHOLDER: 'ask', $: (id) => els[id] ?? null, pad: (n) => String(n).padStart(2, '0'), AI_LIVE: () => true, SUPA_API: 'https://api/api', Repo: { token: async () => 'tok' },
    fetch: async (url, init) => { fetches.push(url); if (o.gate) await o.gate; const r = o.reply ? o.reply(fetches.length) : { ok: true, body: o.body }; return { ok: r.ok !== false, json: async () => r.body }; },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: () => {}, AbortController, Date: Object.assign(function (...a) { return a.length ? new Date(...a) : new Date(now); }, { now: () => now, UTC: Date.UTC }),
    openSheet: (title, body) => { sheets.push({ title, body }); }, console,
  };
  const names = Object.keys(api);
  const fn = new Function(...names, `${code}\n;return {get QUOTA(){return QUOTA},set QUOTA(v){QUOTA=v},get quotaTick(){return quotaTick},quotaState,quotaShort,quotaPaint,quotaRefresh,quotaFromChat,quotaSheet,resetClock,resetIn,quotaReset:()=>{clearTimeout(quotaTimer);quotaTimer=0;quotaTick++;QUOTA=null}}`);
  const m = fn(...names.map((k) => api[k]));
  return { m, dom, timers, sheets, fetches: () => fetches, setNow: (v) => { now = v; }, nowMs: () => now };
}
const good = (over = {}) => ({ day: 'd', resetAt: new Date(Date.UTC(2026, 9, 11, 17, 0, 0)).toISOString(), blocked: false, calls: { used: 10, limit: 40, remaining: 30 }, tokens: { used: 100, limit: 60000, remaining: 59900 }, ...over });

await t('U1 resetAt ขยะ -> ตัวจับเวลาต้องไม่ใช่ NaN (กันลูป CPU ค้างแท็บ)', async () => {
  const L = lab(); L.m.QUOTA = good({ blocked: true, reason: 'calls', resetAt: 'garbage' }); L.m.quotaPaint();
  assert.ok(L.timers.length >= 1); for (const tm of L.timers) assert.ok(Number.isFinite(tm.ms) && tm.ms >= 3000, 'ms=' + tm.ms);
});
await t('U2 resetAt เป็น undefined -> ไม่ NaN และข้อความช่องพิมพ์ไม่มีคำว่า NaN/undefined', async () => {
  const L = lab(); L.m.QUOTA = good({ blocked: true, reason: 'calls', resetAt: undefined }); L.m.quotaPaint();
  for (const tm of L.timers) assert.ok(Number.isFinite(tm.ms), 'ms=' + tm.ms);
  assert.ok(!/NaN|undefined|Invalid/.test(L.dom.ta.placeholder + L.dom.chip.textContent), L.dom.ta.placeholder + '|' + L.dom.chip.textContent);
});
await t('U3 remaining<=0 แม้ blocked=false -> นับเป็น out (ล็อก)', async () => {
  const L = lab(); const q = good({ calls: { used: 40, limit: 40, remaining: 0 } }); assert.equal(L.m.quotaState(q), 'out');
});
await t('U4 tokens remaining<=0 แม้ blocked=false -> out', async () => {
  const L = lab(); assert.equal(L.m.quotaState(good({ tokens: { used: 60000, limit: 60000, remaining: 0 } })), 'out');
});
await t('U5 limit=0 ทั้งคู่ -> ไม่ล็อกผิดพลาด (ข้อมูลไม่น่าเชื่อ = fail-open ไม่ใช่ out)', async () => {
  const L = lab(); const q = good({ calls: { used: 0, limit: 0, remaining: 0 }, tokens: { used: 0, limit: 0, remaining: 0 } });
  assert.notEqual(L.m.quotaState(q), 'out'); assert.equal(L.m.quotaState(q), null);
});
await t('U6 แผ่นรายละเอียด: limit=0 ต้องไม่ทำให้เกิด NaN/Infinity ในแถบ (--p)', async () => {
  const L = lab(); L.m.QUOTA = good({ calls: { used: 0, limit: 0, remaining: 0 } }); L.m.quotaSheet();   /* 0/0 = NaN คือกรณีที่กระตุ้นบั๊กจริง (5/0 = Infinity ถูก Math.min จับไว้เอง) */
  assert.equal(L.sheets.length, 1, 'แผ่นไม่ถูกเปิด'); assert.ok(!/NaN|Infinity/.test(L.sheets[0].body), L.sheets[0].body.slice(0, 400));
});
await t('U6b แผ่นรายละเอียดปกติ: --p คำนวณถูก 13/40 = 0.325 และไม่มีสตริงดิบจากเซิร์ฟเวอร์', async () => {
  const L = lab(); L.m.QUOTA = good({ calls: { used: 13, limit: 40, remaining: 27 } }); L.m.quotaSheet(); const b = L.sheets[0].body;
  assert.ok(/--p:0\.325/.test(b), b.slice(0, 400)); assert.ok(!/<script|onerror|javascript:/i.test(b));
});
await t('U7 ออกจากระบบ (quotaReset) ล้างค่า ไม่ค้างข้ามผู้ใช้', async () => {
  const L = lab(); L.m.QUOTA = good({ blocked: true, reason: 'calls' }); L.m.quotaReset(); assert.equal(L.m.QUOTA, null);
});
await t('U8 race จริง: /quota ค้าง -> แชทตอบ used=14 -> /quota เก่ามาถึง (used=13) ต้องไม่ทับค่าล่าสุด', async () => {
  let release; const gate = new Promise((r) => (release = r));
  const L = lab({ gate, body: good({ calls: { used: 13, limit: 40, remaining: 27 } }) });
  const pending = L.m.quotaRefresh();                                   // เริ่มดึงโควตา (ค้างที่ gate)
  await new Promise((r) => setImmediate(r));
  L.m.quotaFromChat({ used: 14, limit: 40, tokens: { used: 22000, limit: 60000 }, resetAt: good().resetAt }, false);   // แชทตอบมาก่อน
  assert.equal(L.m.QUOTA.calls.used, 14);
  release(); await pending;                                             // ค่าเก่ามาถึงทีหลัง
  assert.equal(L.m.QUOTA.calls.used, 14, 'ค่าเก่าจาก /quota ทับค่าล่าสุดจากแชท: ' + L.m.QUOTA.calls.used);
});
await t('U9 นาฬิกาเครื่องช้า: ถึงเวลารีเซ็ตตามเซิร์ฟเวอร์ผ่านไปแล้วแต่เครื่องยังไม่ถึง -> ยังต้องถามเซิร์ฟเวอร์ (ไม่เชื่อนาฬิกาเครื่องอย่างเดียว)', async () => {
  const L = lab(); L.m.QUOTA = good({ blocked: true, reason: 'calls', resetAt: new Date(L.nowMs() + 3600e3).toISOString() }); L.m.quotaPaint();
  assert.ok(L.timers.length >= 1); const ms = L.timers[L.timers.length - 1].ms; assert.ok(ms <= 15 * 60e3, 'รอนานเกิน 15 นาที ms=' + ms);
});
await t('U10 resetAt ในอดีต + เซิร์ฟเวอร์ยังว่าหมด -> หน่วงไม่ต่ำกว่า 3 วินาที (ไม่ยิงถี่)', async () => {
  const L = lab(); L.m.QUOTA = good({ blocked: true, reason: 'calls', resetAt: new Date(L.nowMs() - 60e3).toISOString() }); L.m.quotaPaint();
  for (const tm of L.timers) assert.ok(tm.ms >= 3000, 'ms=' + tm.ms);
});
const FAILOPEN = [
  ['เซิร์ฟเวอร์ตอบ 500', { ok: false, body: {} }],
  ['ตอบ ok แต่ไม่มี calls/tokens', { ok: true, body: { blocked: true } }],
  ['ตอบ ok แต่ limit=0', { ok: true, body: { blocked: true, calls: { used: 0, limit: 0, remaining: 0 }, tokens: { used: 0, limit: 5, remaining: 5 } } }],
  ['เซิร์ฟเวอร์บอก unknown เอง', { ok: true, body: { unknown: true, blocked: true } }],
];
for (const [name, reply] of FAILOPEN) {
  await t('U11 fail-open: ' + name + ' -> ไม่ล็อกผู้ใช้', async () => {
    const L = lab({ reply: () => reply }); await L.m.quotaRefresh();
    assert.ok(L.fetches().length >= 1, 'ไม่ได้ยิง fetch เลย');
    assert.ok(L.m.QUOTA && L.m.QUOTA.unknown === true && L.m.QUOTA.blocked === false, 'QUOTA=' + JSON.stringify(L.m.QUOTA));
    assert.equal(L.dom.ta.disabled, false, 'ช่องพิมพ์ถูกล็อก'); assert.equal(L.dom.send.disabled, false, 'ปุ่มส่งถูกล็อก');
  });
}
await t('U11b fetch โยน error (เน็ตหลุด) -> ไม่ล็อกผู้ใช้', async () => {
  const L = lab({ reply: () => { throw new Error('network'); } }); await L.m.quotaRefresh();
  assert.ok(L.m.QUOTA && L.m.QUOTA.unknown === true && L.m.QUOTA.blocked === false, 'QUOTA=' + JSON.stringify(L.m.QUOTA)); assert.equal(L.dom.ta.disabled, false);
});
console.log(`\nผ่าน / ล้ม: ${pass} / ${fail}`); process.exit(fail ? 1 : 0);

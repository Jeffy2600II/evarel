/* พิสูจน์ F6 (16-services__ai-quota ส่วนที่เหลือ): quotaFetch/aiLockInfo/limitBanner/quotaFromChat/quotaSheetHTML ที่ย้ายไป core/quota ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบไฟล์เก่า (self-contained) กับไฟล์ใหม่ (ตัวห่อ + core) บนเบราว์เซอร์จริง จำลองเครือข่าย/สิทธิ์/DOM ว่าง (quotaPaint กลายเป็น no-op เหมือนตอนฟอร์ม AI ไม่ถูกเปิด) ล็อกนาฬิกา
   ใช้: node tests/quota_equiv.test.mjs <16-services__ai-quota.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/quota_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/quota_m16_selfcontained.js', 'utf8');
const NEWM = fs.readFileSync('app/web/js/app/16-services__ai-quota.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/app/core/quota.js', 'utf8');
const CORE_DATES = fs.readFileSync('app/web/js/app/core/dates.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

/* ฉีดความผิดลงโค้ดจริง (ฝั่งใหม่ core เป็นหลัก) ทีละแบบ — เทสต์ต้องจับให้ได้ทุกแบบ */
function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/if \(!deps\.enabled\(\)\) return null/, 'if (false) return null'); /* โหมดปิดยังยิงเครือข่าย */
  if (which === 2) return R(/if \(notice && notice\.kind === ["']limit["']\)/, 'if (notice && notice.kind === "x")'); /* notice limit หาย */
  if (which === 3) return R(/const g = L\.reason === ["']global["']/, 'const g = L.reason === "x"'); /* แถบ global ใช้ข้อความผิด */
  if (which === 4) return R(/remaining: Math\.max\(0, qc\.limit - qc\.used\)/, 'remaining: Math.max(0, qc.limit - qc.used - 1)'); /* คำนวณคงเหลือผิด */
  if (which === 5) return R(/tl\.used >= tl\.limit/, 'false'); /* โทเคนล้นแต่ไม่ล็อก */
  if (which === 6) return R(/Math\.min\(1, u \/ l\)\.toFixed\(3\)/, '(u / l).toFixed(3)'); /* บาร์เกิน 1 ไม่ถูกบีบ */
  if (which === 7) return R(/const m = Math\.ceil\(ms \/ 6e?4\)/, 'const m = Math.floor(ms / 6e4)'); /* ปัดเวลาเหลือผิด */
  return src;
}
const NEWMi = NEWM; /* จุดฉีดของชุดนี้อยู่ใน core ทั้งหมด */
const NEWCOREi = inj ? inject(NEWCORE, inj) : NEWCORE;

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');

const HARNESS = `
Date.now = () => 1793500000000; /* ล็อกนาฬิกา: resetIn/quotaFromChat ใช้ Date.now เทียบกันต้องได้เลขเดียวกัน */
window.AI_LIVE = () => window.__ailive;
window.SUPA_API = 'https://api.test';
window.icon = ic => '[icon:' + ic + ']';
window.pad = n => String(n).padStart(2, '0'); /* global จาก m/02 ที่ไฟล์เก่าอ่านตอนเรียก (ฝั่งใหม่ import จาก core/dates — ต้องให้ความหมายเดียวกัน) */
window.$ = id => null; /* ไม่มีฟอร์ม AI บนหน้า -> quotaPaint จบทันทีทั้งสองฝั่ง */
window.openSheet = () => {};
window.__rules = [];
globalThis.fetch = async (url, init) => {
  const u = String(url), r = window.__rules.find(x => u.includes(x.path));
  window.__calls.push({ url: u.replace(window.SUPA_API, ''), auth: init?.headers?.Authorization || '' });
  if (!r) throw new TypeError('no rule for ' + u);
  if (r.netfail) throw new TypeError('down');
  return new Response(r.text !== undefined ? r.text : JSON.stringify(r.json ?? {}), { status: r.status || 200, headers: { 'Content-Type': 'application/json' } });
};
window.__reset = (ailive, rules, st) => { window.__ailive = ailive; window.__rules = rules; window.__calls = []; window.ST = Object.assign({ quotaTick: 5, quotaTimer: 0, AI: { notice: null }, QUOTA: null }, st || {}) };
window.__KEY_RULE_OK = [{ path: '/ai/quota', json: { calls: { used: 3, limit: 40, remaining: 37 }, tokens: { used: 500, limit: 60000, remaining: 59500 } } }];
`;
await p.evaluate(HARNESS);

const load = async (tag, mSrc, coreSrc) => {
  const err = await p.evaluate(async ({ mSrc, coreSrc, datesSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    let src = mSrc;
    if (coreSrc !== null) src = src.replace(/\.\/core\/quota\.js/g, mk(coreSrc.replace(/\.\/dates\.js/g, mk(datesSrc)) + '\n//core ' + tag));
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 300) }
  }, { mSrc, coreSrc, datesSrc: CORE_DATES, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};

const OUT_AT = 1793500000000 + 3600000; /* resetAt ที่ /chat ไม่ส่งมา: now+3600000 */
const Q_OK = { calls: { used: 3, limit: 40, remaining: 37 }, tokens: { used: 500, limit: 60000, remaining: 59500 } };
const Q_OUT = { calls: { used: 40, limit: 40, remaining: 0 }, tokens: { used: 59900, limit: 60000, remaining: 100 }, resetAt: '2026-11-01T00:00:00.000Z', blocked: true, reason: 'calls' };
const R_ISO = '2026-11-01T00:00:00.000Z';

/* สถานการณ์ quotaFetch: [ชื่อ, ailive, rules] */
const FETCH_SCN = [
  ['โหมดปิด -> null', false, []],
  ['อ่านได้ปกติ', true, [{ path: '/ai/quota', json: Q_OK }]],
  ['ตอบ 500 -> ไม่ทราบ', true, [{ path: '/ai/quota', status: 500, json: {} }]],
  ['เครือข่ายล้ม -> ไม่ทราบ', true, [{ path: '/ai/quota', netfail: true }]],
  ['เซิร์ฟเวอร์บอก unknown -> ไม่ทราบ', true, [{ path: '/ai/quota', json: { unknown: true } }]],
  ['รูปร่างผิด (ไม่มี tokens) -> ไม่ทราบ', true, [{ path: '/ai/quota', json: { calls: { limit: 40 } } }]],
  ['limit ไม่เป็นบวก -> ไม่ทราบ', true, [{ path: '/ai/quota', json: { calls: { used: 1, limit: 0, remaining: 0 }, tokens: { used: 1, limit: 9, remaining: 8 } } }]],
];
/* สถานการณ์ aiLockInfo: [ชื่อ, ST ที่ตั้ง, ผลที่คาดหวังฝั่งเดิม (เทียบกับฝั่งใหม่)] */
const LOCK_SCN = [
  ['notice limit มาก่อน (แม้โควตายังไม่หมด)', { AI: { notice: { kind: 'limit', reason: 'global' } }, QUOTA: Q_OK }],
  ['โควตาหมดเหตุผล global', { AI: { notice: null }, QUOTA: { ...Q_OUT, reason: 'global' } }],
  ['โควตาหมดเหตุผล calls', { AI: { notice: null }, QUOTA: Q_OUT }],
  ['โควตาหมดเหตุผล tokens', { AI: { notice: null }, QUOTA: { ...Q_OUT, reason: 'tokens' } }],
  ['โควตาหมดไม่มีเหตุผล (ได้ calls)', { AI: { notice: null }, QUOTA: { calls: { used: 9, limit: 9, remaining: 0 }, tokens: { used: 1, limit: 9, remaining: 8 }, resetAt: R_ISO, blocked: true } }],
  ['โควตายังไม่หมด -> null', { AI: { notice: null }, QUOTA: Q_OK }],
  ['ไม่มีโควตา -> null', { AI: { notice: null }, QUOTA: null }],
  ['โควตา unknown -> null', { AI: { notice: null }, QUOTA: { unknown: true } }],
];
/* สถานการณ์ quotaFromChat: [ชื่อ, ST เริ่ม, qc, hit429] */
const CHAT_SCN = [
  ['ค่าปกติจาก /chat', { QUOTA: null }, { used: 5, limit: 40, resetAt: R_ISO, tokens: { used: 1000, limit: 60000 } }, false],
  ['429 -> ล็อก', { QUOTA: null }, { used: 5, limit: 40, resetAt: R_ISO, tokens: { used: 1000, limit: 60000 }, quota: { used: 5, limit: 40 } }, true],
  ['ใช้ครบ limit -> ล็อก calls', { QUOTA: null }, { used: 40, limit: 40, resetAt: R_ISO, tokens: { used: 1000, limit: 60000 } }, false],
  ['โทเคนล้น -> ล็อก tokens', { QUOTA: null }, { used: 5, limit: 40, resetAt: R_ISO, tokens: { used: 60000, limit: 60000 } }, false],
  ['โทเคนไม่มีในค่าตอบ (ใช้ limit เดิม 60000)', { QUOTA: null }, { used: 5, limit: 40, resetAt: R_ISO }, false],
  ['โทเคนไม่มีและเดิมมี limit เอง (3000)', { QUOTA: { tokens: { used: 1, limit: 3000, remaining: 2999 }, calls: { used: 1, limit: 40, remaining: 39 }, resetAt: R_ISO } }, { used: 5, limit: 40, resetAt: R_ISO }, false],
  ['resetAt หาย (ได้ now+3600000)', { QUOTA: null }, { used: 5, limit: 40, tokens: { used: 1, limit: 60 } }, false],
  ['qc ใช้ไม่ได้ -> ไม่แตะอะไรเลย', { QUOTA: Q_OK }, { used: 5 }, false],
  ['qc null -> ไม่แตะอะไรเลย', { QUOTA: Q_OK }, null, false],
  ['เหตุผลจากเซิร์ฟเวอร์ (reason global)', { QUOTA: null }, { used: 40, limit: 40, resetAt: R_ISO, reason: 'global', tokens: { used: 1, limit: 60 } }, false],
];
/* สถานการณ์ quotaSheetHTML: [ชื่อ, QUOTA] */
const SHEET_SCN = [
  ['ไม่มีโควตา', null], ['ไม่ทราบ', { unknown: true }],
  ['ปกติ', { ...Q_OK, resetAt: R_ISO, blocked: false }],
  ['หมด (มีคำว่าใช้ครบแล้ว)', { ...Q_OUT }],
  ['เลขใหญ่ (ทดสอบ toLocaleString + บีบบาร์)', { calls: { used: 5000, limit: 40, remaining: 0 }, tokens: { used: 123456, limit: 60000, remaining: 0 }, resetAt: R_ISO, blocked: true }],
];
const NOW_AT = 1793500000000;

let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + String(detail).slice(0, 260) : '')) } };
const recs = {};
for (const [tag, mSrc, coreSrc] of [['old', OLDM, null], ['new', NEWMi, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const r = {};
  r.names = await p.evaluate(async () => ['limitBanner', 'aiLockInfo', 'QUOTA_LOW', 'QUOTA_POLL_MAX', 'QUOTA_UNKNOWN', 'quotaEnabled', 'quotaState', 'quotaShort', 'resetMs', 'resetClock', 'resetIn', 'quotaFetch', 'quotaPaint', 'quotaRefresh', 'quotaFromChat', 'quotaSheet', 'quotaSheetHTML'].map(k => typeof window[k]));
  r.fetch = [];
  for (const [name, ailive, rules] of FETCH_SCN) {
    await p.evaluate(([al, rl]) => { window.__reset(al, rl) }, [ailive, rules]);
    const out = await p.evaluate(async () => JSON.parse(JSON.stringify(await window.quotaFetch())));
    r.fetch.push({ name, out });
  }
  r.lock = [];
  for (const [name, st] of LOCK_SCN) {
    await p.evaluate((s) => { window.__reset(true, [], s) }, st);
    const out = await p.evaluate(() => { const v = window.aiLockInfo(); return v === undefined ? 'undef' : JSON.parse(JSON.stringify(v)) });
    r.lock.push({ name, out });
  }
  r.banner = [];
  for (const [name, st] of LOCK_SCN.filter(([, s]) => s.QUOTA && (s.QUOTA.blocked || s.AI.notice))) {
    await p.evaluate((s) => { window.__reset(true, [], s) }, st);
    const out = await p.evaluate(() => window.limitBanner());
    r.banner.push({ name, out });
  }
  r.chat = [];
  for (const [name, st, qc, hit] of CHAT_SCN) {
    await p.evaluate((s) => { window.__reset(true, [], s) }, st);
    const out = await p.evaluate(async ([q, h]) => { window.quotaFromChat(q, h); return { quota: JSON.parse(JSON.stringify(window.ST.QUOTA)), tick: window.ST.quotaTick } }, [qc, hit]);
    r.chat.push({ name, out });
  }
  r.sheet = [];
  for (const [name, q] of SHEET_SCN) {
    await p.evaluate((s) => { window.__reset(true, [], { QUOTA: s }) }, q);
    const out = await p.evaluate(() => window.quotaSheetHTML());
    r.sheet.push({ name, out });
  }
  r.resetIn = await p.evaluate(async () => [90000, 61000, 60000, 59000, 3600000, 0, -1, NaN, 'x', undefined].map(ms => { const iso = Number.isFinite(ms) ? new Date(1793500000000 + ms).toISOString() : ms; return window.resetIn(iso) }));
  recs[tag] = r;
}
const J = v => JSON.stringify(v);
for (let i = 0; i < FETCH_SCN.length; i++) t('quotaFetch | ' + FETCH_SCN[i][0], J(recs.old.fetch[i].out) === J(recs.new.fetch[i].out), J(recs.old.fetch[i].out) + ' vs ' + J(recs.new.fetch[i].out));
for (let i = 0; i < LOCK_SCN.length; i++) t('aiLockInfo | ' + LOCK_SCN[i][0], J(recs.old.lock[i].out) === J(recs.new.lock[i].out), J(recs.old.lock[i].out) + ' vs ' + J(recs.new.lock[i].out));
for (let i = 0; i < r_banner_len(); i++) t('limitBanner | แถบ #' + i, J(recs.old.banner[i].out) === J(recs.new.banner[i].out), J(recs.old.banner[i].out) + ' vs ' + J(recs.new.banner[i].out));
for (let i = 0; i < CHAT_SCN.length; i++) t('quotaFromChat | ' + CHAT_SCN[i][0], J(recs.old.chat[i].out) === J(recs.new.chat[i].out), J(recs.old.chat[i].out) + ' vs ' + J(recs.new.chat[i].out));
for (let i = 0; i < SHEET_SCN.length; i++) t('quotaSheetHTML | ' + SHEET_SCN[i][0], J(recs.old.sheet[i].out) === J(recs.new.sheet[i].out), J(recs.old.sheet[i].out).slice(0, 120) + ' vs ' + J(recs.new.sheet[i].out).slice(0, 120));
t('resetIn คำนวณเวลาเหลือเหมือนเดิม', J(recs.old.resetIn) === J(recs.new.resetIn), J(recs.old.resetIn) + ' vs ' + J(recs.new.resetIn));
t('ชุดชื่อบน window ตรงกันทุกชื่อ', J(recs.old.names) === J(recs.new.names), J(recs.old.names) + ' vs ' + J(recs.new.names));
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
function r_banner_len() { return recs.old.banner.length }
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);

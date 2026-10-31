/* พิสูจน์ F6 (18-services__ai-live): ตรรกะเรียก AI (aiAsk) และความจำระยะยาว (memCall) ที่ย้ายไป core/ailive ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบไฟล์เก่า (self-contained) กับไฟล์ใหม่ (ตัวห่อ) บนเบราว์เซอร์จริง จำลอง fetch และ quotaFromChat ล็อกนาฬิกา
   ไม่ทดสอบเส้นทาง abort ตามเวลาจริง (45s/15s — โค้ดชุดเดิมทั้งบรรทัด) | ใช้: node tests/ailive_equiv.test.mjs <18-services__ai-live.js เดิม> */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
import { constantsInlined } from './_constants_inline.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/18-services__ai-live.js', 'utf8');
const AUTHCORE = fs.readFileSync('app/web/js/m/core/ailive.js', 'utf8'), AIPROP = fs.readFileSync('app/web/js/m/core/aiproposal.js', 'utf8'), DATES = fs.readFileSync('app/web/js/m/02-core__dates.js', 'utf8'), CDATES = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8'), CSTORE = fs.readFileSync('app/web/js/m/core/store.js', 'utf8'), CSCHEDULE = fs.readFileSync('app/web/js/m/core/schedule.js', 'utf8'), CONST = constantsInlined('.');
const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');
const HARNESS = `
const API = 'https://api.test/api';
window.SUPA_API = API; window.ST = { Repo: { token: async () => globalThis.__token() }, QUOTA: null, _render: () => {} };
window.__token = async () => 'TK';
let rules = [], qcalls = [];
window.quotaFromChat = (qc, hit) => { qcalls.push({ qc, hit }) }; globalThis.__qfc = window.quotaFromChat;
globalThis.fetch = async (url, init) => {
  const u = String(url), r = rules.find(x => u.includes(x.path));
  globalThis.__calls.push({ url: u.replace(API, ''), method: init?.method || 'GET', auth: init?.headers?.Authorization || '', body: init?.body ?? null });
  if (!r) throw new TypeError('no rule for ' + u);
  if (r.netfail) throw new TypeError('down');
  return new Response(r.text !== undefined ? r.text : JSON.stringify(r.json ?? {}), { status: r.status || 200, headers: { 'Content-Type': 'application/json' } });
};
globalThis.__calls = [];
async function runAll(code, tag) {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const qfcU = mk('export const quotaFromChat = (qc, hit) => globalThis.__qfc(qc, hit);');
  const stub02 = window.__DATES__.replace(/\\.\\/core\\/dates\\.js/g, mk(window.__CORE_DATES__)).replace(/\\.\\/01-core__constants\\.js/g, mk(window.__CONST__));
  const stubStore = window.__CORE_STORE__.replace(/\\.\\/dates\\.js/g, mk(window.__CORE_DATES__)).replace(/\\.\\/schedule\\.js/g, mk(window.__CORE_SCHED__));
  const stubAiprop = window.__AIPROP__.replace(/\\.\\/store\\.js/g, mk(stubStore)).replace(/\\.\\/dates\\.js/g, mk(window.__CORE_DATES__)).replace(/\\.\\/schedule\\.js/g, mk(window.__CORE_SCHED__));
  const src = code.replace(/\\.\\/02-core__dates\\.js/g, mk(stub02)).replace(/\\.\\/core\\/aiproposal\\.js/g, mk(stubAiprop)).replace(/\\.\\/core\\/ailive\\.js/g, mk(window.__AILIVE__)).replace(/\\.\\/16-services__ai-quota\\.js/g, qfcU);
  const mod = await import(mk(src + '\\n//' + tag + Math.random()));
  const records = [];
  for (const sc of window.__SCEN__) {
    globalThis.__calls = []; qcalls = []; window.ST.QUOTA = sc.quotaState ?? null; globalThis.__token = sc.tokenFail ? async () => { throw new Error('tok') } : async () => 'TK';
    rules = sc.canned || [];
    const out = {};
    for (const st of sc.steps) {
      try { const v = st[0] === 'aiAsk' ? await window.aiAsk(st[1], st[2]) : await window.memCall(st[1]); out.res ??= v } catch (e) { out.rej = String(e && e.message || e) } /* สัญญาจริงของชั้น m คือ window registration จึงเรียกผ่าน window */
    }
    records.push({ name: sc.name, out, calls: globalThis.__calls.slice(), qcalls: qcalls.slice() });
  }
  return { exports: Object.keys(mod).sort(), win: ['aiAsk', 'remFrom', 'memCall', 'applyProposal'].map(k => typeof window[k]), records };
}
window.__RUN = runAll;
`;
const P = { tool: 'item_add', args: { t: 1 }, summary: 'เพิ่ม' };
const SCEN = [
  { name: 'ask-ok-full', canned: [{ path: '/ai/chat', json: { text: 'สวัสดี', proposals: [P, { ...P, sensitive: true }], quota: { used: 1, limit: 40 } } }], steps: [['aiAsk', 'ทำอะไรได้', []]] },
  { name: 'ask-503-global', canned: [{ path: '/ai/chat', status: 503, json: {} }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-401-caught', canned: [{ path: '/ai/chat', status: 401, json: {} }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-429-reset', quotaState: { resetAt: 'R1' }, canned: [{ path: '/ai/chat', status: 429, json: { quota: { used: 40, limit: 40 } } }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-429-noquota', quotaState: null, canned: [{ path: '/ai/chat', status: 429, json: { quota: { used: 40, limit: 40 } } }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-500', canned: [{ path: '/ai/chat', status: 500, json: {} }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-netfail', canned: [{ path: '/ai/chat', netfail: true }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-badjson', canned: [{ path: '/ai/chat', text: 'nope', status: 200 }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-empty-proposals', canned: [{ path: '/ai/chat', json: { text: '', quota: { used: 2, limit: 40 } } }], steps: [['aiAsk', 'x', []]] },
  { name: 'ask-token-reject', tokenFail: true, steps: [['aiAsk', 'x', []]] },
  { name: 'mem-save', canned: [{ path: '/ai/memory', json: { ok: true } }], steps: [['memCall', { tool: 'memory_save', args: { fact: 'F1' } }]] },
  { name: 'mem-save-sensitive', canned: [{ path: '/ai/memory', json: { ok: true } }], steps: [['memCall', { tool: 'memory_save', args: { fact: 'F2' }, sensitive: true }]] },
  { name: 'mem-forget', canned: [{ path: '/ai/memory', json: { ok: true } }], steps: [['memCall', { tool: 'memory_forget', args: { id: 'I9' } }]] },
  { name: 'mem-okfalse', canned: [{ path: '/ai/memory', json: { ok: false } }], steps: [['memCall', { tool: 'memory_save', args: { fact: 'F' } }]] },
  { name: 'mem-500', canned: [{ path: '/ai/memory', status: 500, json: {} }], steps: [['memCall', { tool: 'memory_save', args: { fact: 'F' } }]] },
  { name: 'mem-netfail', canned: [{ path: '/ai/memory', netfail: true }], steps: [['memCall', { tool: 'memory_save', args: { fact: 'F' } }]] },
  { name: 'mem-badjson', canned: [{ path: '/ai/memory', text: 'x', status: 200 }], steps: [['memCall', { tool: 'memory_save', args: { fact: 'F' } }]] },
  { name: 'mem-save-nofact', canned: [{ path: '/ai/memory', json: {} }], steps: [['memCall', { tool: 'memory_save', args: {} }]] },
];
const ENV = { __DATES__: DATES, __AIPROP__: AIPROP, __AILIVE__: AUTHCORE, __SCEN__: SCEN, __CORE_DATES__: CDATES, __CONST__: CONST, __CORE_STORE__: CSTORE, __CORE_SCHED__: CSCHEDULE };
await p.evaluate((env) => { window.__DATES__ = env.__DATES__; window.__AIPROP__ = env.__AIPROP__; window.__AILIVE__ = env.__AILIVE__; window.__SCEN__ = env.__SCEN__; window.__CORE_DATES__ = env.__CORE_DATES__; window.__CONST__ = env.__CONST__; window.__CORE_STORE__ = env.__CORE_STORE__; window.__CORE_SCHED__ = env.__CORE_SCHED__ }, ENV);
await p.evaluate((h) => { const s = document.createElement('script'); s.textContent = h; document.body.appendChild(s) }, HARNESS);
const rOld = await p.evaluate(([h, code]) => window.__RUN(code, 'old'), [HARNESS, OLD]);
await p.reload(); await p.evaluate((h) => { const s = document.createElement('script'); s.textContent = h; document.body.appendChild(s) }, HARNESS);
await p.evaluate((env) => { window.__DATES__ = env.__DATES__; window.__AIPROP__ = env.__AIPROP__; window.__AILIVE__ = env.__AILIVE__; window.__SCEN__ = env.__SCEN__; window.__CORE_DATES__ = env.__CORE_DATES__; window.__CONST__ = env.__CONST__; window.__CORE_STORE__ = env.__CORE_STORE__; window.__CORE_SCHED__ = env.__CORE_SCHED__ }, ENV);
const rNew = await p.evaluate(([h, code]) => window.__RUN(code, 'new'), [HARNESS, NEW]);
await b.close(); srv.close();
let diff = 0; const miss = (m) => { diff++; console.log('ต่าง |', m) };
if (JSON.stringify(rOld.exports) !== JSON.stringify(rNew.exports)) miss('exports ต่าง');
if (JSON.stringify(rOld.win) !== JSON.stringify(rNew.win)) miss('window types ต่าง');
for (let i = 0; i < SCEN.length; i++) {
  const a = JSON.stringify(rOld.records[i] ? [rOld.records[i].out, rOld.records[i].calls, rOld.records[i].qcalls] : null);
  const c = JSON.stringify(rNew.records[i] ? [rNew.records[i].out, rNew.records[i].calls, rNew.records[i].qcalls] : null);
  if (a !== c) { let j = 0; while (j < a.length && a[j] === c[j]) j++; miss((SCEN[i] && SCEN[i].name) + ' | ตำแหน่ง ' + j + '\n  เดิม: …' + a.slice(Math.max(0, j - 30), j + 80) + '\n  ใหม่: …' + c.slice(Math.max(0, j - 30), j + 80)) }
}
const sig = new Set(rNew.records.map(r => JSON.stringify(r.out) + JSON.stringify(r.calls))).size;
console.log(`เทียบ ${SCEN.length} ฉาก | ตรง ${SCEN.length - diff} | ต่าง ${diff} | exports ${rNew.exports.length} ชื่อ | ลายเซ็นผลจริง ${sig} แบบ | pageerror ${pageErrs.length}`);
if (pageErrs.length) console.log('pageerror:', pageErrs.join(' | '));
process.exit(diff || pageErrs.length || sig < 10 ? 1 : 0);

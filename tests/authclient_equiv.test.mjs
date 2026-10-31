/* พิสูจน์ F6 (05-data__auth): ตรรกะไคลเอนต์ที่ย้ายไป core/authclient ให้พฤติกรรมเหมือนโมดูลเดิมทุกกรณี
   เทียบไฟล์เก่า (self-contained) กับไฟล์ใหม่ (ตัวห่อที่เรียก core/authclient) บนเบราว์เซอร์จริง origin จริง
   จำลอง fetch ทั้งหมด (ไม่ยิงเครือข่ายจริง) ล็อกนาฬิกา ใช้ localStorage จริงของ origin ทดสอบ
   ไม่ทดสอบ signInGoogle (เมธอดเดียวที่ navigate ออกนอกหน้า — โค้ดเดิมทั้งบรรทัด ไม่ได้แตะ)
   ใช้: node tests/authclient_equiv.test.mjs <05-data__auth.js เดิม>   (ใหม่อ่านจาก app/web/js/m/05-data__auth.js) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
import { constantsInlined } from './_constants_inline.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/05-data__auth.js', 'utf8');
const AUTHCORE = fs.readFileSync('app/web/js/m/core/authclient.js', 'utf8'), CORE_DATES = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8'), CONST = constantsInlined('.');
/* เซิร์ฟเวอร์จิ๋วให้ origin จริง (about:blank ปิด localStorage/history จึงเสิร์ฟหน้าเปล่า) */
const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const ORIGIN = 'http://127.0.0.1:' + srv.address().port + '/';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto(ORIGIN);
/* ตัวเดินฉาก: ตีความขั้นตอนเป็นภาษาข้อมูล ใช้ร่วมทั้งสองเวอร์ชัน ผลบันทึกเป็น JSON ล้วนเทียบข้อความตรง ๆ */
const HARNESS = `
window.EVAREL_API = 'https://api.test'; window.ST = { USER: null, Repo: null, _render: () => {} };
const RealDate = Date, NOW = new RealDate('2026-10-31T03:00:00Z').getTime();
class F extends RealDate { constructor(...a) { a.length ? super(...a) : super(NOW) } static now() { return NOW } } globalThis.Date = F;
const SESS = 'evarel-session-v2', API = 'https://api.test/api';
let rules = [], calls = [], warns = [];
const _warn = console.warn; console.warn = (...a) => { warns.push(a.map(x => String(x && x.message !== undefined ? x.message : x)).join(' ')) };
globalThis.fetch = async (url, init) => {
  const u = String(url), r = rules.find(x => u.includes(x.path) && (!x.method || (init?.method || 'GET') === x.method));
  calls.push({ url: u.replace(API, ''), method: init?.method || 'GET', auth: init?.headers?.Authorization || '', body: init?.body ?? null });
  if (!r) throw new TypeError('no rule for ' + u);
  if (r.netfail) throw new TypeError('network down');
  return new Response(r.text !== undefined ? r.text : JSON.stringify(r.json ?? {}), { status: r.status || 200, headers: { 'Content-Type': 'application/json' } });
};
const step = async (A, s, mod) => {
  const [k, a, b2, c] = s;
  switch (k) {
    case 'token': return A.token();
    case 'token2x': return Promise.all([A.token(), A.token()]);
    case 'raw': return A.raw(a, b2);
    case 'session': return A.session();
    case 'login': return A.signInEmail(a, b2);
    case 'signup': return A.signUp(a);
    case 'forgot': return A.sendReset(a);
    case 'verify': return A.verifyCode(a, b2, c);
    case 'resend': return A.resend(a, b2);
    case 'setpw': return A.setPassword(a);
    case 'signout': return A.signOut();
    case 'del': return A.deleteAccount(a);
    case 'oauth': return A.takeOAuthReturn();
    case 'load': return A.load();
    case 'apply': return A.apply({ upserts: a, removes: b2 });
    case 'supaLoad': return mod.supaLoad();
    case 'supaSave': return mod.supaSave(a);
    case 'supaClear': return mod.supaClear();
    case 'nowS': return mod.nowS();
    case 'authErr': { const e = mod.authErr(a); return { message: e.message, code: e.code, isErr: e instanceof Error } }
    case 'lsSet': return localStorage.setItem(a, b2);
    default: throw new Error('step? ' + k);
  }
};
async function runAll(code, tag) {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  /* เตรียม stub 02: แทน import ภายในด้วย blob ของ core/dates จริง + constants inlined ก่อน */
  const stub02 = window.__DATES2__.replace(/\\.\\/core\\/dates\\.js/g, mk(window.__CORE__)).replace(/\\.\\/01-core__constants\\.js/g, mk(window.__CONST__));
  const datesU = mk(stub02);
  const src = code.replace(/\\.\\/core\\/dates\\.js/g, mk(window.__CORE__)).replace(/\\.\\/01-core__constants\\.js/g, mk(window.__CONST__)).replace(/\\.\\/02-core__dates\\.js/g, datesU).replace(/\\.\\/core\\/authclient\\.js/g, mk(window.__AUTHCORE__));
  const mod = await import(mk(src + '\\n//' + tag + Math.random()));
  const records = [];
  for (const sc of window.__SCEN__) {
    localStorage.clear(); calls = []; warns = [];
    if (sc.seed !== undefined) localStorage.setItem(SESS, JSON.stringify(sc.seed));
    if (sc.rawls !== undefined) for (const [k2, v] of sc.rawls) localStorage.setItem(k2, v);
    rules = sc.canned || [];
    const A = sc.adapter === 'auth' ? mod.SupaAuth(API) : sc.adapter === 'adp' ? mod.SupaAdapter(API) : mod.SupaCore(API);
    const results = [];
    for (const s of sc.steps) { try { results.push({ ok: await step(A, s, mod) }) } catch (e) { results.push({ err: String(e.message), code: e.code, status: e.status }) } }
    records.push({ name: sc.name, results, calls: calls.slice(), storage: localStorage.getItem(SESS), warns: warns.slice(), lsAfter: localStorage.length });
  }
  console.warn = _warn;
  return { exports: Object.keys(mod).sort(), win: window.__WNAMES__.map(k => typeof window[k]), records };
}
window.__RUN = runAll; window.__READY = true;
`;
await p.evaluate((h) => { const s = document.createElement('script'); s.textContent = h; document.body.appendChild(s) }, HARNESS);
/* ข้อมูลฉาก: seed = session เริ่ม | canned = กติกาตอบ fetch | steps = ลำดับการเรียก */
const NOWS = Math.floor(Date.parse('2026-10-31T03:00:00Z') / 1000); /* ต้องตรงกับนาฬิกาที่ล็อกในหน้า (ตรวจอีกชั้นด้านล่าง) */
const USER = { id: 'u1', email: 'a@b.c' };
const ses = (over = {}) => ({ access_token: 'AT1', refresh_token: 'RT1', expires_at: NOWS + 3600, user: USER, ...over });
const SCEN = [
  { name: 'nowS-locked', adapter: 'core', steps: [['nowS']] },
  { name: 'authErr', adapter: 'core', steps: [['authErr', 'network']] },
  { name: 'supa-roundtrip', adapter: 'core', steps: [['supaSave', { a: 1 }], ['supaLoad'], ['lsSet', 'evarel-session-v2', '{bad'], ['supaLoad'], ['supaClear'], ['supaLoad']] },
  { name: 'raw-get-ok', adapter: 'core', canned: [{ path: '/x', json: { v: 7 } }], steps: [['raw', '/x']] },
  { name: 'raw-get-token-header', adapter: 'core', seed: ses(), canned: [{ path: '/x', json: {} }], steps: [['raw', '/x', { token: 'TK' }]] },
  { name: 'raw-body-json-stringified', adapter: 'core', canned: [{ path: '/x', json: {} }], steps: [['raw', '/x', { method: 'POST', body: { n: 1 } }]] },
  { name: 'raw-network-fail', adapter: 'core', canned: [{ path: '/x', netfail: true }], steps: [['raw', '/x']] },
  { name: 'raw-422-code', adapter: 'core', canned: [{ path: '/x', status: 422, json: { code: 'email_taken' } }], steps: [['raw', '/x']] },
  { name: 'raw-401-no-code', adapter: 'core', canned: [{ path: '/x', status: 401, json: {} }], steps: [['raw', '/x']] },
  { name: 'raw-500-no-code', adapter: 'core', canned: [{ path: '/x', status: 500, json: {} }], steps: [['raw', '/x']] },
  { name: 'raw-badjson-ok', adapter: 'core', canned: [{ path: '/x', text: 'not-json', status: 200 }], steps: [['raw', '/x']] },
  { name: 'token-valid-61s-no-fetch', adapter: 'core', seed: ses({ expires_at: NOWS + 61 }), canned: [{ path: '/auth/refresh', json: {} }], steps: [['token']] },
  { name: 'token-boundary-60s-refresh', adapter: 'core', seed: ses({ expires_at: NOWS + 60 }), canned: [{ path: '/auth/refresh', json: ses({ access_token: 'AT2', user: USER }) }], steps: [['token']] },
  { name: 'token-expired-refresh-save', adapter: 'core', seed: ses({ expires_at: NOWS + 10 }), canned: [{ path: '/auth/refresh', json: ses({ access_token: 'AT2', expires_at: NOWS + 7200, user: USER }) }], steps: [['token'], ['supaLoad']] },
  { name: 'token-single-flight', adapter: 'core', seed: ses({ expires_at: NOWS + 10 }), canned: [{ path: '/auth/refresh', json: ses({ access_token: 'AT2', expires_at: NOWS + 7200, user: USER }) }], steps: [['token2x']] },
  { name: 'token-refresh-401-clears', adapter: 'core', seed: ses({ expires_at: NOWS + 10 }), canned: [{ path: '/auth/refresh', status: 401, json: {} }], steps: [['token']] },
  { name: 'token-refresh-400-clears', adapter: 'core', seed: ses({ expires_at: NOWS + 10 }), canned: [{ path: '/auth/refresh', status: 400, json: {} }], steps: [['token']] },
  { name: 'token-no-session', adapter: 'core', steps: [['token']] },
  { name: 'userOf-fallback', adapter: 'core', seed: ses({ user: { id: 'u9', email: 'somchai@x.y' } }), canned: [{ path: '/auth/refresh', json: {} }], steps: [['token']] },
  { name: 'session-none', adapter: 'auth', steps: [['session']] },
  { name: 'session-valid', adapter: 'auth', seed: ses({ user: { id: 'u1', name: 'Nontakorn', email: 'a@b.c' } }), steps: [['session']] },
  { name: 'session-expired-refresh-ok', adapter: 'auth', seed: ses({ expires_at: NOWS + 5 }), canned: [{ path: '/auth/refresh', json: ses({ access_token: 'AT2', expires_at: NOWS + 7200, user: { id: 'u1', email: 'a@b.c' } }) }], steps: [['session']] },
  { name: 'session-expired-refresh-fail', adapter: 'auth', seed: ses({ expires_at: NOWS + 5 }), canned: [{ path: '/auth/refresh', status: 401, json: {} }], steps: [['session']] },
  { name: 'login-ok', adapter: 'auth', canned: [{ path: '/auth/login', json: ses({ user: { id: 'u2', email: 'x@y.z' } }) }], steps: [['login', 'x@y.z', 'pw'], ['supaLoad']] },
  { name: 'login-bad', adapter: 'auth', canned: [{ path: '/auth/login', status: 401, json: {} }], steps: [['login', 'x@y.z', 'nope']] },
  { name: 'signup-verify', adapter: 'auth', canned: [{ path: '/auth/signup', json: { status: 'verify' } }], steps: [['signup', { name: 'A', email: 'a@b.c', password: 'p' }]] },
  { name: 'signup-ok', adapter: 'auth', canned: [{ path: '/auth/signup', json: ses({ user: { id: 'u3', email: 'n@o.p' } }) }], steps: [['signup', { name: 'B', email: 'n@o.p', password: 'p' }]] },
  { name: 'forgot', adapter: 'auth', canned: [{ path: '/auth/forgot', json: {} }], steps: [['forgot', 'a@b.c']] },
  { name: 'verify-code', adapter: 'auth', canned: [{ path: '/auth/verify', json: ses({ user: { id: 'u4', email: 'v@w.x' } }) }], steps: [['verify', 'v@w.x', '123456', 'signup']] },
  { name: 'resend', adapter: 'auth', canned: [{ path: '/auth/resend', json: {} }], steps: [['resend', 'a@b.c', 'signup']] },
  { name: 'setpw', adapter: 'auth', seed: ses(), canned: [{ path: '/auth/password', json: {} }], steps: [['setpw', 'newpw']] },
  { name: 'signout', adapter: 'auth', seed: ses(), steps: [['signout']] },
  { name: 'delete-account', adapter: 'auth', seed: ses(), canned: [{ path: '/auth/account', json: {} }], steps: [['del', 'pw']] },
  { name: 'oauth-no-token', adapter: 'auth', steps: [['oauth']] },
  { name: 'adp-load', adapter: 'adp', seed: ses(), canned: [{ path: '/items', json: { items: [{ id: 1, title: 'A' }] } }], steps: [['load']] },
  { name: 'adp-apply', adapter: 'adp', seed: ses(), canned: [{ path: '/items/9', json: {} }, { path: '/items/11', json: {} }, { path: '/items/3', json: {} }], steps: [['apply', [{ id: 9, title: 'N' }, { id: 11, title: 'M' }], [3]]] },
  { name: 'adp-apply-fail', adapter: 'adp', seed: ses(), canned: [{ path: '/items/9', status: 500, json: {} }], steps: [['apply', [{ id: 9 }], []]] },
];
const WNAMES = ['authErr', 'SUPA_SESS', 'nowS', 'supaLoad', 'supaSave', 'supaClear', 'SupaCore', 'SUPA_HOST', 'SupaAuth', 'SupaAdapter', 'SUPA_API', 'Auth', 'initial', 'profileOf', 'avatarHTML', 'firstName', 'AV_HUES', 'THAI_LEAD', 'hashStr', 'S', 'UI', 'find', 'AI_LIVE'];
/* เตรียมโค้ด 02-core__dates (แทน import ภายในด้วยคำ marker แล้วแทนด้วย blob ในหน้า): ใช้เป็น stub ของทั้งสองเวอร์ชัน — esc/TODAY จริงทั้งคู่ */
const CODE02 = fs.readFileSync('app/web/js/m/02-core__dates.js', 'utf8');
const ENV = { __DATES2__: CODE02, __CONST__: CONST, __CORE__: CORE_DATES, __AUTHCORE__: AUTHCORE, __SCEN__: SCEN, __WNAMES__: WNAMES };
await p.evaluate((env) => { window.__DATES2__ = env.__DATES2__; window.__CONST__ = env.__CONST__; window.__CORE__ = env.__CORE__; window.__AUTHCORE__ = env.__AUTHCORE__; window.__SCEN__ = env.__SCEN__; window.__WNAMES__ = env.__WNAMES__ }, ENV);
const OLD2 = OLD; /* พาธถูกแทนในหน้าเอง */
const rOld = await p.evaluate(([h, code]) => window.__RUN(code, 'old'), [HARNESS, OLD2]);
await p.reload(); await p.evaluate((h) => { const s = document.createElement('script'); s.textContent = h; document.body.appendChild(s) }, HARNESS);
await p.evaluate((env) => { window.__DATES2__ = env.__DATES2__; window.__CONST__ = env.__CONST__; window.__CORE__ = env.__CORE__; window.__AUTHCORE__ = env.__AUTHCORE__; window.__SCEN__ = env.__SCEN__; window.__WNAMES__ = env.__WNAMES__ }, ENV);
const rNew = await p.evaluate(([h, code]) => window.__RUN(code, 'new'), [HARNESS, NEW]);
/* ป้องกันบั๊กของเทสต์เอง: nowS ฉากแรกต้องเท่ากับ NOWS ที่คำนวณใน Node ถ้าไม่ตรงแปลว่านาฬิกา/ค่าคงที่เพี้ยน เทสต์นี้ใช้ไม่ได้ */
if (rNew.records[0].results[0].ok !== NOWS) { console.error('เทสต์เสีย: nowS ในหน้า = ' + rNew.records[0].results[0].ok + ' แต่ Node คำนวณ ' + NOWS); process.exit(2) }
await b.close();
/* เทียบ */
let diff = 0; const miss = (m) => { diff++; console.log('ต่าง |', m) };
if (JSON.stringify(rOld.exports) !== JSON.stringify(rNew.exports)) miss('exports: ' + rOld.exports + ' vs ' + rNew.exports);
if (JSON.stringify(rOld.win) !== JSON.stringify(rNew.win)) miss('window types ต่าง: ' + JSON.stringify(rOld.win) + ' vs ' + JSON.stringify(rNew.win));
for (let i = 0; i < SCEN.length; i++) {
  const a = rOld.records[i], c = rNew.records[i];
  if (!c) { miss('ฉากหาย: ' + a.name); continue }
  const sa = JSON.stringify({ results: a.results, calls: a.calls, storage: a.storage, warns: a.warns, lsAfter: a.lsAfter });
  const sc = JSON.stringify({ results: c.results, calls: c.calls, storage: c.storage, warns: c.warns, lsAfter: c.lsAfter });
  if (sa !== sc) { let j = 0; while (j < sa.length && sa[j] === sc[j]) j++; miss(a.name + ' | เริ่มต่างที่ตำแหน่ง ' + j + '\n  เดิม: …' + sa.slice(Math.max(0, j - 30), j + 70) + '\n  ใหม่: …' + sc.slice(Math.max(0, j - 30), j + 70)) }
}
const values = new Set(); for (const r of [rOld, rNew]) for (const rec of r.records) { values.add(JSON.stringify(rec.results)); values.add(JSON.stringify(rec.calls)) }
console.log(`เทียบ ${SCEN.length} ฉาก | ตรง ${SCEN.length - diff} | ต่าง ${diff} | exports ${rNew.exports.length} ชื่อ | window ${rNew.win.length} ชื่อ | ลายเซ็นผลจริง ${values.size} แบบ | pageerror ${pageErrs.length}`);
if (pageErrs.length) console.log('pageerror:', pageErrs.join(' | '));
srv.close();
process.exit(diff || pageErrs.length || values.size < 25 ? 1 : 0);

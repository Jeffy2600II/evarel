/* พิสูจน์ F6 (05-data__auth ส่วน avatar/profile): profileOf/avatarHTML/initial/firstName ที่ย้ายไป core/avatar ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบผลคำนวณและ HTML บนเบราว์เซอร์จริง (ครอบคลุมสระนำไทย ผู้ใช้ไม่มีชื่อ เฉดที่ต้องแก้ความสว่าง และข้อความอันตราย)
   ใช้: node tests/avatar_equiv.test.mjs <05-data__auth.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/avatar_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/auth_m05_at_head.js', 'utf8');
const NEWM = fs.readFileSync('app/web/js/app/05-data__auth.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/app/core/avatar.js', 'utf8');
const CORE_DATES = fs.readFileSync('app/web/js/app/core/dates.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/Math\.imul\(h, 16777619\)/, 'Math.imul(h, 16777618)'); /* แฮชเพี้ยน -> สีคนละเฉด */
  if (which === 2) return R(/% AV_HUES\.length\]/, '% (AV_HUES.length - 1)]'); /* เลือกเฉดผิดช่วง */
  if (which === 3) return R(/\?\? 38/, '?? 39'); /* ความสว่างพื้นฐานผิด */
  if (which === 4) return R(/\(h \+ 26\) % 360/, '(h + 25) % 360'); /* ปลายไล่สีเพี้ยน */
  if (which === 5) return R(/\.toUpperCase\(\)/, ''); /* ตัวอักษรแรกไม่เป็นพิมพ์ใหญ่ */
  if (which === 6) return R(/esc\(p\.letter\)/, 'p.letter'); /* ตัวอักษรไม่ escape */
  if (which === 7) return R(/55% \$\{L\}%\)/, '55% 99%)'); /* ความสว่างเฉดแก้ผิด */
  return src;
}
const NEWCOREi = inj ? inject(NEWCORE, inj) : NEWCORE;

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');
const HARNESS = `window.EVAREL_API = 'https://api.test/api'; window.ST = {}; /* ฝั่งเก่าแตะ ST.Repo ตอนโหลด (ในแอปจริง m/00 ปัก ST ก่อน) */`;
await p.evaluate(HARNESS);
const load = async (tag, mSrc, coreSrc) => {
  const err = await p.evaluate(async ({ mSrc, coreSrc, datesSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const datesU = mk(datesSrc);
    const D = await import(datesU); Object.assign(window, D); /* esc ของจริงบน window (ฝั่งเก่าอ่าน global esc) */
    const stubs = mk('export const TODAY="2026-10-31"; export const parse=(s)=>new Date(s+"T00:00:00");')
      , authStub = mk('export const authErr=(...a)=>"err"; export const SUPA_SESS={}; export const nowS=()=>0; export const supaLoad=()=>null; export const supaSave=()=>{}; export const supaClear=()=>{}; export const SupaCore={}; export const SUPA_HOST="https://sb.test"; export const SupaAuth=()=>({}); export const SupaAdapter=()=>({});');
    let src = mSrc.replace(/\.\/02-core__dates\.js/g, stubs).replace(/\.\/core\/authclient\.js/g, authStub);
    if (coreSrc !== null) src = src.replace(/\.\/core\/avatar\.js/g, mk(coreSrc.replace(/\.\/dates\.js/g, datesU) + '\n//core ' + tag));
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 300) }
  }, { mSrc, coreSrc, datesSrc: CORE_DATES, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};
const USERS = [
  ['ผู้ใช้ไทยสระนำ', { id: 'u1', name: 'เด็กดี', email: 'kid@example.com' }],
  ['ชื่ออังกฤษ', { id: 'u2', name: 'Nontakorn Dev', email: 'non@example.com' }],
  ['ไม่มีชื่อ (ใช้อีเมล)', { id: 'u3', name: '', email: 'noname@example.com' }],
  ['ไม่มีชื่อและอีเมล (ใช้ ?)', { id: 'u4', name: '', email: '' }],
  ['ชื่อขึ้นต้นด้วยโ', { id: 'u5', name: 'โชคดี', email: 'lucky@example.com' }],
  ['ชื่อขึ้นต้นด้วยไ', { id: 'u6', name: 'ใจดี', email: 'kind@example.com' }],
  ['ชื่ออันตราย (ต้อง escape)', { id: 'u7', name: '<b>x</b> & "y"', email: 'evil@example.com' }],
  ['id ให้เฉด 162/176/190 พอดี (ค้นจากแฮชจริง)', null],
];
let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + String(detail).slice(0, 220) : '')) } };
const recs = {};
for (const [tag, mSrc, coreSrc] of [['old', OLDM, null], ['new', NEWM, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const list = [];
  for (const [name, user] of USERS) {
    const out = await p.evaluate(([user]) => {
      window.ST = { USER: user };
      const r = {};
      r.profile = JSON.parse(JSON.stringify(window.profileOf()));
      r.html = window.avatarHTML();
      r.htmlBtn = window.avatarHTML({ tag: 'button', act: 'menu', label: 'เมนู', size: 40 });
      r.initial = window.initial();
      r.first = window.firstName();
      return r;
    }, [user]);
    list.push({ name, out });
  }
  /* หา id ที่ให้เฉด 162/176/190 (ทำฝั่งเดียว ใช้ AV_HUES+hashStr บน window ที่โหลดไว้) */
  const fixIds = await p.evaluate(() => {
    const ids = [];
    for (let i = 0; ids.length < 3 && i < 50000; i++) { const id = 'fix-' + i; if ([162, 176, 190].includes(window.AV_HUES[window.hashStr(id) % window.AV_HUES.length])) ids.push(id) }
    return ids;
  });
  for (const id of fixIds) {
    const out = await p.evaluate((id) => { window.ST = { USER: { id, name: 'แสง', email: id + '@example.com' } }; return JSON.parse(JSON.stringify(window.profileOf())) }, id);
    list.push({ name: 'เฉดแก้สว่าง id=' + id, out: { profile: out, html: '', htmlBtn: '', initial: '', first: '' } });
  }
  recs[tag] = list;
}
for (let i = 0; i < recs.old.length; i++) {
  const A = JSON.stringify(recs.old[i].out), B = JSON.stringify(recs.new[i].out);
  t(recs.old[i].name, A === B, A.slice(0, 170) + ' vs ' + B.slice(0, 170));
}
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);

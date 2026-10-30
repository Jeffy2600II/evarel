// พิสูจน์ F6 (22-views__auth -> core/authform): authValidate/EMAIL_RE/PW_MIN/MAIL_TYPO ให้ผลเหมือนของเดิมทุกกรณี และชื่อบน window ครบเหมือนเดิม
// ใช้: node tests/authform_logic_equiv.test.mjs <22-views__auth.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/22-views__auth.js', 'utf8');
const CORE = fs.readFileSync('app/web/js/m/core/authform.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const NAMES = ['AU_MSG', 'EMAIL_RE', 'PW_MIN', 'RESEND_SEC', 'MAIL_TYPO', 'GLOGO', 'EV_MARK', 'RINGS', 'authBack', 'gBtn', 'legal', 'eyeBtn', 'fld', 'EMAIL_X', 'submitBtn', 'AUTH_VIEWS', 'AUTH_SPLASH', 'renderAuthRoot', 'coolT', 'paintCool', 'startCool', 'stopCool', 'resendReset', 'fieldErr', 'clearErrs', 'setBusy', 'authValidate', 'liveBusy', 'sigOf', 'typingNow', 'liveRefresh', 'SUPA_PK', 'rtWs', 'rtOn', 'rtRef', 'rtHb', 'rtRetry', 'rtTimer', 'rtDeb', 'rtTokT', 'rtSend', 'rtKick', 'rtConnect', 'rtSchedule', 'startLiveSync', 'stopLiveSync', 'rtResume', 'doSignOut', 'errorView'];
const r = await p.evaluate(async ({ OLD, NEW, CORE, NAMES }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const coreU = mk(CORE); const out = {};
  const emails = ['', ' ', '   ', 'a@b.cc', 'a@b.c', 'a@b', 'a b@c.dd', 'name@gmail.com', ' name@gmail.com ', 'NAME@GMAIL.COM', 'x@y.zz.ww', '@b.cc', 'a@.cc', 'a@b..cc', 'ก@ข.คค', 'a@b.cc ', undefined, null, 'a@@b.cc', 'a@b.12'];
  const pws = ['', undefined, '1234567', '12345678', '123456789', 'x'.repeat(100), ' '.repeat(8), 'ก'.repeat(8), 'ก'.repeat(7)];
  const kinds = ['login', 'signup', 'forgot', 'code', 'newpw', 'sent', 'welcome', '', undefined, 'SIGNUP'];
  const names = ['', ' ', '   ', 'ชื่อ', ' ชื่อ ', undefined, null];
  const codes = ['', '123456', '12345', '1234567', 'abcdef', ' 123456 ', '12 456', '１２３４５６', '000000', undefined, '12345a'];
  const terms = [true, false, undefined, 0, 1, 'on', ''];
  const cases = [];
  for (const k of kinds) for (const em of emails) for (const pw of pws) cases.push([k, { email: em, password: pw }]);
  for (const nm of names) for (const t of terms) for (const em of [ 'a@b.cc', '' ]) for (const pw of ['12345678', '1234567']) cases.push(['signup', { name: nm, email: em, password: pw, terms: t }]);
  for (const c of codes) for (const em of ['', 'a@b.cc', 'bad']) cases.push(['code', { code: c, email: em }]);
  cases.push(['login', {}], ['signup', {}], ['code', {}], ['newpw', {}], ['login', { email: 'a@b.cc' }], ['newpw', { password: '12345678', email: 'bad' }], ['newpw', { password: '1' }], ['forgot', { email: '' }], ['forgot', { email: 'a@b.cc' }]);
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    for (const k of NAMES) delete window[k];
    for (const k of ['icon', 'esc', '$', 'ST', 'UI', 'S', 'Auth', 'toast', 'render', 'SUPA_API', 'haptic', 'TODAY']) if (!(k in globalThis)) globalThis[k] = k === 'ST' || k === 'UI' || k === 'S' ? { auth: {}, USER: null } : (() => '');
    document.addEventListener = () => {};   // ไฟล์ 22 ผูก input/focusout ตอนโหลด ไม่ต้องการในเทสต์นี้ (ทดสอบแยกด้านล่าง)
    try {
      const code = src.replace(/\.\/core\/authform\.js/g, coreU) + '\n//' + name + Math.random();
      const m = await import(mk(code)); const res = {};
      res.exports = Object.keys(m).sort(); res.winTypes = NAMES.map(k => typeof window[k]).join(',');
      res.val = cases.map(([k, v]) => { try { return JSON.stringify(window.authValidate(k, v)) } catch (e) { return 'THROW:' + e.constructor.name } });
      res.re = emails.map(e => { try { return String(window.EMAIL_RE.test(e)) } catch (e2) { return 'THROW' } }); res.reSrc = window.EMAIL_RE.source + '/' + window.EMAIL_RE.flags;
      res.pw = window.PW_MIN; res.resend = window.RESEND_SEC; res.typo = JSON.stringify(window.MAIL_TYPO); res.typoKeys = Object.keys(window.MAIL_TYPO).length;
      res.winSame = ['EMAIL_RE', 'PW_MIN', 'MAIL_TYPO', 'authValidate'].filter(k => m[k] !== undefined && window[k] !== m[k]);
      res.valNonEmpty = res.val.filter(x => x !== '{}').length; res.valKinds = new Set(res.val).size;
      out[name] = res;
    } finally { /* ไม่ต้องคืนค่า */ }
  }
  return out;
}, { OLD, NEW, CORE, NAMES });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ที่', i, '| เดิม:', a.slice(Math.max(0, i - 25), i + 60), '| ใหม่:', c.slice(Math.max(0, i - 25), i + 60)); } };
cmp('exports', o.exports, n.exports); cmp('winTypes', o.winTypes, n.winTypes); cmp('reSrc', o.reSrc, n.reSrc); cmp('pw', o.pw, n.pw); cmp('resend', o.resend, n.resend); cmp('typo', o.typo, n.typo);
o.val.forEach((v, i) => cmp('val#' + i, v, n.val[i])); o.re.forEach((v, i) => cmp('re#' + i, v, n.re[i])); cmp('winSame', o.winSame, n.winSame);
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | กรณี authValidate ${n.val.length} (ผลไม่ว่าง ${n.valNonEmpty}, ผลต่างกัน ${n.valKinds} แบบ) | EMAIL_RE ${n.re.filter(x => x === 'true').length}/${n.re.length} ผ่าน | PW_MIN ${n.pw} RESEND_SEC ${n.resend} MAIL_TYPO ${n.typoKeys} คีย์ | window ${n.winTypes.split(',').filter(t => t !== 'undefined').length}/${NAMES.length} ชื่อ | ชื่อต่างจากโมดูล ${JSON.stringify(n.winSame)} | pageerror ${errs.length}`);
await b.close();
process.exit(diff || errs.length || n.val.length < 400 || n.valKinds < 20 || n.valNonEmpty < 100 || n.pw !== 8 || n.resend !== 30 || n.typoKeys !== 8 || n.winTypes.split(',').filter(t => t !== 'undefined').length !== NAMES.length || n.winSame.length || JSON.stringify(o.exports) !== JSON.stringify(n.exports) || n.re.filter(x => x === 'true').length < 3 ? 1 : 0);

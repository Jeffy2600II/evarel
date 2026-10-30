// พิสูจน์ F6 (10-services__notify -> core/notify): defaultRem/notifyState/checkNotify/toggleOnTime/toggleAhead/countNotifiable/AHEAD_PRESETS ให้ผลเหมือนของเดิมทุกกรณี (รวมข้อมูลผิดรูป)
// และชื่อที่ไฟล์ส่งออกผ่าน window ครบเหมือนเดิม | ฟังก์ชันเป็นแบบบริสุทธิ์ (ไม่แก้อินพุต) | กฎความหมายของ rem ที่ Master สั่งยังเป็นแหล่งเดียว
// ใช้: node tests/notify_equiv.test.mjs <10-services__notify.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8');
const NEW = fs.readFileSync('app/web/js/m/10-services__notify.js', 'utf8');
const CORE = fs.readFileSync('app/web/js/m/core/notify.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.setContent('<!doctype html><body></body>');
const FN = ['defaultRem', 'notifyState', 'checkNotify', 'toggleOnTime', 'toggleAhead', 'countNotifiable'];
const NAMES = ['AHEAD_PRESETS', 'REM_PRESETS', ...FN, 'urlB64ToU8', 'pushSupported', 'pushSavedState', 'pushSaveState', 'pushSubscribe', 'pushAutoSync', 'pushWhyText'];
const r = await p.evaluate(async ({ OLD, NEW, CORE, FN, NAMES }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const coreU = mk(CORE); const out = {};
  // rem หลากรูป: ปกติ / ว่าง / ผิดรูป (null, สตริง, ตัวเลข, อาร์เรย์ซ้อน) / ค่าซ้ำ / m ลบ ทศนิยม ศูนย์ NaN / at ผิดรูป
  const REMS = {
    undef: undefined, nul: null, str: 'x', num: 5, obj: {}, arrOfStr: ['a', 'b'], empty: [], onTime: [{ k: 'before', m: 0 }], ahead10: [{ k: 'before', m: 10 }],
    onTimeAhead: [{ k: 'before', m: 0 }, { k: 'before', m: 30 }], aheadDup: [{ k: 'before', m: 10 }, { k: 'before', m: 10 }, { k: 'before', m: 30 }],
    aheadUnsorted: [{ k: 'before', m: 1440 }, { k: 'before', m: 10 }, { k: 'before', m: 60 }], atOnly: [{ k: 'at', t: '08:30' }], atDup: [{ k: 'at', t: '09:00' }, { k: 'at', t: '09:00' }, { k: 'at', t: '07:00' }],
    atBad: [{ k: 'at', t: 5 }, { k: 'at' }], mNeg: [{ k: 'before', m: -5 }], mFrac: [{ k: 'before', m: 1.5 }], mNaN: [{ k: 'before', m: NaN }], mStr: [{ k: 'before', m: '10' }],
    mixedJunk: [null, 'x', 3, [], { k: 'before', m: 0 }, { k: 'zzz' }, { k: 'at', t: '10:00' }], arrInArr: [[{ k: 'before', m: 0 }]], everything: [{ k: 'before', m: 0 }, { k: 'before', m: 10 }, { k: 'at', t: '06:00' }],
  };
  const TIMES = [true, false, '', '08:00', 0, null, undefined];
  const ONS = [true, false, 1, 0, undefined, null];
  const MS = [0, 10, 30, 60, 1440, -1, 1.5, NaN, '10', null, undefined, Infinity, 7];
  const ITEMS = {
    notArr: 'x', nul: null, und: undefined, empty: [], junk: [null, 5, 'x', {}, { rem: 'x' }, { rem: null }],
    mix: [{ rem: [{ k: 'before', m: 0 }], time: '08:00' }, { rem: [{ k: 'before', m: 0 }] }, { rem: [{ k: 'at', t: '09:00' }] }, { rem: [{ k: 'at', t: '09:00' }], time: '' }, { rem: [], time: '07:00' }, { rem: [{ k: 'before', m: 10 }], time: '10:00' }, { rem: [{ k: 'before', m: 10 }] }],
    allOff: [{ rem: [], time: '08:00' }, { rem: [{ k: 'zzz' }], time: '08:00' }], one: [{ rem: [{ k: 'before', m: 0 }], time: '08:00' }], two: [{ rem: [{ k: 'before', m: 0 }], time: '08:00' }, { rem: [{ k: 'at', t: '09:00' }] }], three: [{ rem: [{ k: 'before', m: 10 }], time: '1' }, { rem: [{ k: 'before', m: 10 }], time: '2' }, { rem: [{ k: 'at', t: '5' }] }, { rem: [{ k: 'before', m: 10 }] }], five: Array.from({ length: 5 }, () => ({ rem: [{ k: 'before', m: 0 }], time: '08:00' })), big: Array.from({ length: 200 }, (_, i) => ({ rem: i % 3 ? [{ k: 'before', m: i % 5 }] : [{ k: 'at', t: '0' + (i % 9) + ':00' }], time: i % 2 ? '08:00' : '' })),
  };
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    const f = document.createElement('iframe'); document.body.appendChild(f); const w = f.contentWindow;
    w.SUPA_API = null; w.REM_PRESETS = [0, 10, 30, 60, 1440]; w.UI = {}; w.ST = {}; // กันฟังก์ชัน push อ้างตอนโหลด (ไม่ถูกเรียก) ไม่แตะ localStorage (iframe about:blank อ่านไม่ได้)
    let s = src; if (name === 'new') s = src.replace(/(\.\/core\/notify\.js)/g, coreU);
    const sc = w.document.createElement('script'); sc.type = 'module'; sc.textContent = s + '\n;window.__done=1'; w.document.head.appendChild(sc);
    for (let i = 0; i < 100 && !w.__done; i++) await new Promise(r => setTimeout(r, 20));
    const res = {}; res.loaded = !!w.__done;
    res.presets = JSON.stringify(w.AHEAD_PRESETS);
    res.names = NAMES.map(n => n + ':' + typeof w[n]).join(',');
    res.defaultRem = JSON.stringify(w.defaultRem()); res.defaultFresh = w.defaultRem() !== w.defaultRem();
    res.state = {}; res.check = {}; res.onTime = {}; res.ahead = {}; res.count = {}; res.pure = {};
    const snap = o => JSON.stringify(o, (k, v) => v === undefined ? '__u' : (typeof v === 'number' && !isFinite(v) ? '__n' + v : v));
    for (const [k, rem] of Object.entries(REMS)) {
      res.state[k] = TIMES.map(t => snap(w.notifyState(rem, t)));
      res.check[k] = TIMES.map(t => snap(w.checkNotify(rem, t)));
      res.onTime[k] = ONS.map(on => snap(w.toggleOnTime(rem, on)));
      res.ahead[k] = MS.map(m => snap(w.toggleAhead(rem, m)));
      const before = snap(rem); w.notifyState(rem, true); w.checkNotify(rem, '1'); w.toggleOnTime(rem, true); w.toggleOnTime(rem, false); w.toggleAhead(rem, 10); res.pure[k] = before === snap(rem);
    }
    for (const [k, it] of Object.entries(ITEMS)) res.count[k] = w.countNotifiable(it);
    res.sameTwice = snap(w.notifyState(REMS.everything, true)) === snap(w.notifyState(REMS.everything, true));
    out[name] = res;
  }
  return out;
}, { OLD, NEW, CORE, FN, NAMES });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ที่', i, '| เดิม', a.slice(Math.max(0, i - 25), i + 55), '| ใหม่', c.slice(Math.max(0, i - 25), i + 55)); } };
for (const k of Object.keys(o)) { if (['state', 'check', 'onTime', 'ahead', 'count'].includes(k)) for (const c of Object.keys(o[k])) cmp(k + ':' + c, o[k][c], n[k][c]); else cmp(k, o[k], n[k]); }
const dist = k => new Set(Object.values(n[k]).map(v => JSON.stringify(v))).size;
const allPure = Object.values(n.pure).every(Boolean);
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | โหลดเก่า ${o.loaded} ใหม่ ${n.loaded} | ผลต่างกัน: state ${dist('state')} check ${dist('check')} onTime ${dist('onTime')} ahead ${dist('ahead')} count ${dist('count')} | ไม่แก้อินพุต ${allPure} | errs ${errs.length}`);
await b.close();
const winMiss = NAMES.filter(x => !n.names.includes(x + ':function') && !n.names.includes(x + ':object'));
if (winMiss.length) console.log('ชื่อบน window หาย:', winMiss.join(','));
process.exit(diff || errs.length || !o.loaded || !n.loaded || !allPure || winMiss.length || dist('state') < 8 || dist('check') < 2 || dist('onTime') < 4 || dist('ahead') < 6 || dist('count') < 4 ? 1 : 0);

// พิสูจน์ F6 (ตัวสร้าง HTML 5 ตัว -> core/uihtml): pills/chips/skeleton/stepper/fld ให้สตริงเหมือนของเดิมตรงตัวอักษรทุกกรณี (รวมข้อมูลผิดรูป) | ชื่อบน window ครบเหมือนเดิม
// ใช้: node tests/uihtml_equiv.test.mjs <12-ui__primitives.js เดิม> <14-ui__form.js เดิม> <22-views__auth.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const [, , P_OLD, F_OLD, A_OLD] = process.argv;
const rd = (p) => fs.readFileSync(p, 'utf8'); const W = 'app/web/js/m/';
const SRC = { old: [rd(P_OLD), rd(F_OLD), rd(A_OLD)], new: [rd(W + '12-ui__primitives.js'), rd(W + '14-ui__form.js'), rd(W + '22-views__auth.js')] };
const CORE = { uihtml: rd(W + 'core/uihtml.js'), markdown: rd(W + 'core/markdown.js'), authform: rd(W + 'core/authform.js') };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.setContent('<!doctype html><body></body>');
const NAMES = ['pills', 'chips', 'skeleton', 'stepper', 'fld'];
const r = await p.evaluate(async ({ SRC, CORE, NAMES }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const urls = { './core/uihtml.js': mk(CORE.uihtml), './core/markdown.js': mk(CORE.markdown), './core/authform.js': mk(CORE.authform) };
  const OPTS = {
    normal: [['a', 'A'], ['b', 'B']], empty: [], one: [['x', 'X']], html: [['<i>', '<b>&"\'']], thai: [['ก', 'ไทย ✓']], numKey: [[1, 2], [0, 0]], nullLabel: [['k', null], ['u', undefined]], dupKeys: [['a', 'A'], ['a', 'B']], many: Array.from({ length: 30 }, (_, i) => [String(i), 'L' + i]),
  };
  const CUR = ['a', 'b', 'zzz', '', null, undefined, 0, 1, '<x>'];
  const ARR = [[], ['a'], ['a', 'b'], ['zzz'], ['b', 'b'], [1, 0]];
  const ACTS = ['type', 'x', '', '"q"', 'a b', undefined, null, 'ก'];
  const LABELS = ['ชื่อ', '', '<b>x</b>', 'a&b', undefined, null, 0, 'ยาว '.repeat(40)];
  const VALS = [0, 1, 2, 3, 99, -1, 1.5, '3', null, undefined, NaN, true];
  const UNITS = ['วัน', '', '<u>', undefined, null, 0];
  const FNAME = ['email', 'pw', '', 'a b', '"q"', 'ก', undefined, null];
  const TYPES = ['text', 'email', 'password', '', undefined, null];
  const EXTRA = ['', 'required', 'autocomplete="x"', '"', undefined, null, 'ก'];
  const AFTER = ['', '<i></i>', '<button>x</button>', undefined, null, 0];
  const out = {};
  for (const name of ['old', 'new']) {
    const f = document.createElement('iframe'); document.body.appendChild(f); const w = f.contentWindow;
    // สภาพแวดล้อมขั้นต่ำให้ไฟล์ห่อโหลดได้ (ไฟล์เหล่านี้อ้าง global ของ m/ อื่นตอนเรียกฟังก์ชันอื่น ไม่ใช่ตอนโหลด) ตัวสร้างทั้ง 5 ตัวไม่แตะ global ใดเลย
    for (const g of ['icon', 'esc', 'avatarHTML', 'fmtDate', 'itemRow', 'ST', 'UI', 'S', 'TYPES', 'TYPE_INFO', 'toast', 'haptic']) if (!(g in w)) w[g] = (g === 'ST' || g === 'UI' || g === 'S' || g === 'TYPES' || g === 'TYPE_INFO') ? {} : () => '';
    const loaded = [];
    for (let i = 0; i < 3; i++) {
      let s = SRC[name][i]; for (const [k, u] of Object.entries(urls)) s = s.split("'" + k + "'").join("'" + u + "'"); /* ต้นแบบเดิมก็ import core ที่ย้ายไปรอบก่อน (markdown/authform) จึงต้องแทน URL ทั้งสองฝั่ง ต่างกันแค่ uihtml ที่มีเฉพาะฝั่งใหม่ */
      const sc = w.document.createElement('script'); sc.type = 'module'; sc.textContent = s + '\n;window.__done' + i + '=1;'; w.document.head.appendChild(sc);
      for (let t = 0; t < 100 && !w['__done' + i]; t++) await new Promise(r => setTimeout(r, 20)); loaded.push(!!w['__done' + i]);
    }
    const o = { loaded: loaded.join(','), names: NAMES.map(n => n + ':' + typeof w[n]).join(','), pills: {}, chips: {}, stepper: {}, fld: {} };
    o.skeleton = w.skeleton();
    for (const [k, opts] of Object.entries(OPTS)) { o.pills[k] = CUR.map(c => ACTS.map(a => w.pills(a, opts, c))); o.chips[k] = ARR.map(a => ACTS.map(ac => w.chips(ac, opts, a))); }
    o.stepper = LABELS.map(l => ACTS.map(a => VALS.map(v => UNITS.map(u => w.stepper(l, a, v, u)))));
    o.fld = LABELS.map(l => FNAME.map(n => TYPES.map(t => EXTRA.map(e => AFTER.map(a => w.fld(l, n, t, e, a))))));
    o.fldDefaults = [w.fld('L', 'n', 't'), w.fld('L', 'n', 't', undefined, undefined)];
    o.pure = (() => { const opts = [['a', 'A']], arr = ['a'], before = JSON.stringify([opts, arr]); w.pills('x', opts, 'a'); w.chips('x', opts, arr); return before === JSON.stringify([opts, arr]); })();
    out[name] = o;
  }
  return out;
}, { SRC, CORE, NAMES });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ที่', i, '| เดิม', a.slice(Math.max(0, i - 30), i + 60), '| ใหม่', c.slice(Math.max(0, i - 30), i + 60)); } };
for (const k of ['loaded', 'names', 'skeleton', 'fldDefaults', 'pure', 'stepper', 'fld']) cmp(k, o[k], n[k]);
for (const k of Object.keys(o.pills)) { cmp('pills:' + k, o.pills[k], n.pills[k]); cmp('chips:' + k, o.chips[k], n.chips[k]); }
const flat = (a) => JSON.stringify(a); const distinct = (v) => new Set(JSON.parse(flat(v)).flat(Infinity)).size;
const dp = distinct(Object.values(n.pills)), dc = distinct(Object.values(n.chips)), ds = distinct(n.stepper), df = distinct(n.fld);
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | โหลด เดิม ${o.loaded} ใหม่ ${n.loaded} | ผลต่างกัน: pills ${dp} chips ${dc} stepper ${ds} fld ${df} | ไม่แก้อินพุต ${n.pure} | errs ${errs.length}`);
await b.close();
const miss = NAMES.filter(x => !n.names.includes(x + ':function'));
if (miss.length) console.log('ชื่อบน window หาย:', miss.join(','));
process.exit(diff || errs.length || o.loaded !== 'true,true,true' || n.loaded !== 'true,true,true' || !n.pure || miss.length || dp < 50 || dc < 50 || ds < 200 || df < 500 ? 1 : 0);

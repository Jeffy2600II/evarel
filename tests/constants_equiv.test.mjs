// พิสูจน์ F6 (01-core__constants): โมดูลใหม่ (ค่ามาจาก core/constants) ให้ค่าเหมือนโมดูลเดิมทุกชื่อที่ส่งออก (33 ชื่อ) และลงทะเบียนบน window เท่ากัน
// ใช้: node tests/constants_equiv.test.mjs <01-core__constants.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const R = p => fs.readFileSync(p, 'utf8');
const OLD = R(process.argv[2]), NEW = R('app/web/js/app/01-core__constants.js'), CORE = R('app/web/js/app/core/constants.js');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const r = await p.evaluate(async ({ OLD, NEW, CORE }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const ser = v => typeof v === 'function' ? 'fn:' + v.length : typeof v === 'object' && v instanceof RegExp ? 're:' + v.source + '/' + v.flags : JSON.stringify(v);
  const out = {};
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    const cu = mk(CORE);
    const code = src.replace(/\.\/core\/constants\.js/g, cu) + '\n//' + name + Math.random();
    for (const k of Object.keys(window)) if (/^(STORE_KEY|TIMER_KEY|THEME_KEY|DAY_MS|NR|icon|seg)$/.test(k)) delete window[k];
    const m = await import(mk(code));
    const keys = Object.keys(m).sort();
    const res = { keys, vals: Object.fromEntries(keys.map(k => [k, ser(m[k])])) };
    res.winSame = keys.filter(k => window[k] !== m[k]);
    res.segs = [['a', [['x', 'X'], ['y', 'Y']], 'x'], ['b', [], 'z'], ['c', [[1, 'หนึ่ง'], [2, 'สอง']], 2]].map(a => m.seg(...a));
    res.icons = Object.keys(m.ICONS).map(k => m.icon(k)).concat([m.icon('nope')]);
    res.mem = ['memory_save', 'memory_forget', 'item_create', '', 'x'].map(m.isMemTool);
    res.weekOpts = JSON.stringify(m.WEEK_OPTS); res.hhmm = ['00:00', '23:59', '24:00', '9:30', '12:60', 'ab:cd', '07:05'].map(t => m.HHMM.test(t));
    res.typesKeys = Object.keys(m.TYPES).join(','); res.tabs0 = m.TABS.map(t => t.join('|'));
    out[name] = res;
  }
  return out;
}, { OLD, NEW, CORE });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ตำแหน่ง', i, '\n  เดิม: …' + a.slice(Math.max(0, i - 20), i + 50) + '\n  ใหม่: …' + c.slice(Math.max(0, i - 20), i + 50)); } };
cmp('keys', o.keys, n.keys); for (const k of o.keys) cmp('val:' + k, o.vals[k], n.vals[k]);
for (const k of ['winSame', 'segs', 'icons', 'mem', 'weekOpts', 'hhmm', 'typesKeys', 'tabs0']) cmp(k, o[k], n[k]);
console.log(`เทียบ ${total} หมวด (ชื่อ ${n.keys.length} ตัว) | ตรง ${total - diff} | ต่าง ${diff} | window ไม่ตรง export: ${n.winSame.length} | pageerror ${errs.length}`);
await b.close(); process.exit(diff || errs.length || n.winSame.length || n.keys.length !== 33 ? 1 : 0);

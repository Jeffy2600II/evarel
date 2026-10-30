// พิสูจน์ F6 (04-data__repo): diffItems ที่มาจาก core/repo ให้ผลเหมือนของเดิมทุกกรณี (รวมกับดักลำดับคีย์/undefined) และ syncChanges/uk/wait ทำงานเหมือนเดิม
// ใช้: node tests/repo_equiv.test.mjs <04-data__repo.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/04-data__repo.js', 'utf8'), CORE = fs.readFileSync('app/web/js/m/core/repo.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const r = await p.evaluate(async ({ OLD, NEW, CORE }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const coreU = mk(CORE); const out = {};
  const A = { id: 'a', t: 'x', n: 1 }, B = { id: 'b', t: 'y', n: 2 }, C = { id: 'c', t: 'z', n: 3 };
  const cases = {
    same: [[A, B], [A, B]], empty: [[], []], addAll: [[], [A, B]], removeAll: [[A, B], []],
    addOne: [[A], [A, B]], removeOne: [[A, B], [B]], editField: [[A, B], [{ ...A, n: 9 }, B]],
    keyOrderSwap: [[{ id: 'a', t: 'x', n: 1 }], [{ id: 'a', n: 1, t: 'x' }]],            // คีย์สลับ = ต่าง (กับดัก JSON.stringify)
    undefField: [[{ id: 'a', t: 'x' }], [{ id: 'a', t: 'x', u: undefined }]],               // undefined ถูกทิ้ง = เท่ากัน
    nullField: [[{ id: 'a', t: 'x' }], [{ id: 'a', t: 'x', u: null }]],                     // null ไม่ถูกทิ้ง = ต่าง
    nested: [[{ id: 'a', log: { '2026-10-30': 1, '2026-10-29': 2 } }], [{ id: 'a', log: { '2026-10-29': 2, '2026-10-30': 1 } }]],
    nestedSame: [[{ id: 'a', log: { d: [1, 2, { k: 1 }] } }], [{ id: 'a', log: { d: [1, 2, { k: 1 }] } }]],
    reorder: [[A, B, C], [C, A, B]], moveEdit: [[A, B, C], [C, { ...A, n: 5 }]],
    dupIdNext: [[A], [A, { ...A, n: 7 }]], dupIdPrev: [[A, { ...A, n: 7 }], [A]],
    numId: [[{ id: 1, t: 'x' }], [{ id: 1, t: 'x' }, { id: 2, t: 'y' }]], thai: [[{ id: 'ก', t: 'ไทย' }], [{ id: 'ก', t: 'ไทย!' }]],
    big: [Array.from({ length: 300 }, (_, i) => ({ id: 'i' + i, v: i })), Array.from({ length: 300 }, (_, i) => ({ id: 'i' + (i + 1), v: i % 7 ? i : -i }))],
  };
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    globalThis.ST = { USER: null, Repo: { calls: [], apply: async function (ch, st) { this.calls.push(JSON.stringify([ch, st])); if (globalThis.__throw) throw new Error('boom'); } } };
    for (const k of ['uk', 'wait', 'diffItems', 'syncChanges']) delete window[k];
    const code = src.replace(/\.\/core\/repo\.js/g, coreU) + '\n//' + name + Math.random();
    const m = await import(mk(code)); const res = {};
    res.exports = Object.keys(m).sort(); res.win = ['uk', 'wait', 'diffItems', 'syncChanges'].map(k => typeof window[k]); res.same = ['uk', 'wait', 'diffItems', 'syncChanges'].filter(k => window[k] !== m[k]);
    res.diff = Object.fromEntries(Object.entries(cases).map(([k, [p, n]]) => [k, JSON.stringify(m.diffItems(p, n))]));
    res.immut = (() => { const p = [{ id: 'a', n: 1 }], n = [{ id: 'a', n: 2 }], ps = JSON.stringify(p), ns = JSON.stringify(n); m.diffItems(p, n); return JSON.stringify(p) === ps && JSON.stringify(n) === ns })();
    res.refs = (() => { const x = { id: 'a', n: 2 }; return m.diffItems([], [x]).upserts[0] === x })();   // คืนอ้างอิงเดิม ไม่ใช่สำเนา
    ST.USER = null; res.ukAnon = m.uk('k'); ST.USER = { id: 'u7' }; res.ukUser = m.uk('k'); ST.USER = { id: '' }; res.ukEmpty = m.uk('k'); ST.USER = null;
    const t0 = performance.now(); await m.wait(30); const dt = performance.now() - t0; res.waitOk = dt >= 25 && dt < 400; res.waitIsPromise = m.wait(0) instanceof Promise;
    ST.Repo.calls.length = 0; await m.syncChanges([A], [A]); res.syncNoop = ST.Repo.calls.length;
    await m.syncChanges([A], [A, B]); await m.syncChanges([A, B], [B]); await m.syncChanges([], []);
    res.syncCalls = ST.Repo.calls.slice();
    globalThis.__throw = true; try { await m.syncChanges([A], [B]); res.syncThrow = 'ไม่โยน' } catch (e) { res.syncThrow = 'โยน:' + e.message } globalThis.__throw = false;
    out[name] = res;
  }
  return out;
}, { OLD, NEW, CORE });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ตำแหน่ง', i, '\n  เดิม: …' + a.slice(Math.max(0, i - 20), i + 60) + '\n  ใหม่: …' + c.slice(Math.max(0, i - 20), i + 60)); } };
for (const k of Object.keys(o)) { if (k === 'diff') for (const c of Object.keys(o.diff)) cmp('diff:' + c, o.diff[c], n.diff[c]); else cmp(k, o[k], n[k]); }
const distinct = new Set(Object.values(n.diff)).size;
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | กรณี diffItems ${Object.keys(n.diff).length} (ผลต่างกัน ${distinct} แบบ) | exports ${n.exports.length} ชื่อ | window ตรง export: ${n.same.length === 0} | syncNoop ${n.syncNoop} calls ${n.syncCalls.length} | pageerror ${errs.length}`);
await b.close(); process.exit(diff || errs.length || n.same.length || distinct < 12 || n.exports.length !== 4 ? 1 : 0);

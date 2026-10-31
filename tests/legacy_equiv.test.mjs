// พิสูจน์ F6 (24-services__legacy-import): แผนนำเข้า (planImport จาก core/repo) ให้ผลเหมือนของเดิมทุกกรณี และพฤติกรรมของไฟล์ (import/flag/boot ตอนโหลด) ไม่เปลี่ยน
// ใช้: node tests/legacy_equiv.test.mjs <24-services__legacy-import.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/app/24-services__legacy-import.js', 'utf8'), CORE = fs.readFileSync('app/web/js/app/core/repo.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const r = await p.evaluate(async ({ OLD, NEW, CORE }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const coreU = mk(CORE); const out = {};
  const L = (id, extra) => ({ id, title: 't' + id, ...extra });
  const cases = {   // [list, serverItems, mode]
    emptyBoth: [[], [], 'append'], emptyServer: [[L(1), L(2)], [], 'empty'], appendNoClash: [[L(1), L(2)], [L(10)], 'append'],
    appendClash: [[L(1), L(2)], [L(1), L(2)], 'append'], appendPartial: [[L(1), L(5), L(6)], [L(5)], 'append'], appendDupInList: [[L(1), L(1)], [], 'append'],
    emptyModeClash: [[L(1), L(2)], [L(1)], 'empty'], skipLike: [[L(3)], [L(3)], 'skip'], strIds: [[L('a'), L('b')], [L('a')], 'append'],
    numStr: [[L('3'), L(3)], [L(3)], 'append'], nanIds: [[L('x'), L('y')], [L('z')], 'append'], gapIds: [[L(1), L(2), L(3)], [L(7), L(100)], 'append'],
    undef: [[L(1, { u: undefined, n: null })], [L(1)], 'append'], nested: [[L(1, { log: { '2026-10-30': 1 }, rem: [{ k: 'before', m: 0 }] })], [L(1)], 'append'],
    thai: [[L(1, { title: 'ไทย' })], [L(1)], 'append'], bigClash: [Array.from({ length: 200 }, (_, i) => L(i)), Array.from({ length: 150 }, (_, i) => L(i * 2)), 'append'],
    dupSrvOther: [[L(5), L(5)], [L(10)], 'append'], dupThree: [[L(2), L(2), L(2)], [L(9)], 'append'], dupThenClash: [[L(3), L(3), L(4)], [L(4)], 'append'], dupMixed: [[L(7), L(8), L(7), L(8)], [L(1)], 'append'],   // id ซ้ำกันเองใน list: แยกพฤติกรรมจด/ไม่จด id ที่ไม่ชนได้
    negId: [[L(-1), L(0)], [L(0)], 'append'], floatId: [[L(1.5), L(2)], [L(1.5)], 'append'], unknownMode: [[L(1)], [L(1)], 'APPEND'],
  };
  const LS = new Map(); const store = { getItem: k => LS.has(k) ? LS.get(k) : null, setItem: (k, v) => LS.set(k, String(v)), removeItem: k => LS.delete(k) };
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    LS.clear(); const log = [];
    const calls = []; const R = { load: async () => ({ items: [] }), apply: async (ch) => { calls.push(JSON.stringify(ch)); if (globalThis.__throw) throw new Error('boom') } };
    globalThis.ST = { USER: { id: 'u1' }, Repo: R, CH: null, TM: null }; globalThis.S = { items: [] };
    globalThis.UI = { auth: {}, animate: true, loading: false, error: null }; globalThis.STORE_KEY = 'evarel-demo-v3'; globalThis.SUPA_API = true; globalThis.SKELETON_MS = 1;
    globalThis.uk = k => k + ':' + (globalThis.ST.USER?.id || 'anon'); globalThis.wait = () => Promise.resolve(); globalThis.toast = m => log.push('toast:' + m);
    globalThis.render = () => log.push('render'); globalThis.openDialog = h => log.push('dialog:' + h.length); globalThis.claimLegacyData = () => log.push('claim');
    globalThis.loadChats = () => []; globalThis.loadTM = () => []; globalThis.startLiveSync = () => log.push('live'); globalThis.pushAutoSync = () => log.push('push');
    globalThis.Auth = { session: async () => { log.push('session'); return null }, takeOAuthReturn: null };
    Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true });
    for (const k of ['IMPORT_FLAG', 'readLegacyItems', 'importLegacy', 'maybeImportLegacy', 'IMPORT_PENDING', 'runImport', 'loadApp', 'boot', 'authSubmit', 'authGoogle', 'enterApp']) delete window[k];
    const code = src.replace(/\.\/core\/repo\.js/g, coreU) + '\n//' + name + Math.random();
    const m = await import(mk(code)); await new Promise(r => setTimeout(r, 20)); const res = {};
    res.bootLog = log.slice(); res.authStatus = globalThis.UI.auth.status + '|' + globalThis.UI.auth.screen;   // boot() ตอนโหลด: ต้องเรียก session ครั้งเดียว
    res.win = ['IMPORT_FLAG', 'readLegacyItems', 'importLegacy', 'maybeImportLegacy', 'IMPORT_PENDING', 'runImport', 'loadApp', 'boot', 'authSubmit', 'authGoogle', 'enterApp'].map(k => typeof window[k]);
    res.exports = Object.keys(m).sort(); res.userAfterBoot = String(globalThis.ST.USER);   // boot() ตอนโหลดเก็บผล session ไว้ที่ ST.USER (ไม่มีผู้ใช้ = null) ต้องเหมือนกัน
    globalThis.ST.USER = { id: 'u1' };   // ตั้งผู้ใช้กลับเพื่อทดสอบฟังก์ชันที่ต้องมีผู้ใช้
    res.plan = {}; for (const [k, [list, srv, mode]] of Object.entries(cases)) { calls.length = 0; const n = await window.importLegacy(JSON.parse(JSON.stringify(list)), srv, mode); res.plan[k] = JSON.stringify([n, calls.slice()]); }
    res.noMutate = (() => { const l = [L(1)], s = [L(1)], a = JSON.stringify(l), c = JSON.stringify(s); window.importLegacy(l, s, 'append'); return JSON.stringify(l) === a && JSON.stringify(s) === c })();
    res.flag = window.IMPORT_FLAG();
    LS.clear(); LS.set('evarel-demo-v3:u1', JSON.stringify({ items: [L(1), L(2, { title: '' }), { title: 'noid' }, L(3)] })); LS.set('evarel-demo-v3', JSON.stringify({ items: [L(3), L(4)] }));
    res.read = JSON.stringify(window.readLegacyItems()); LS.set('evarel-demo-v3:u1', '{bad'); res.readBad = JSON.stringify(window.readLegacyItems());
    LS.clear(); log.length = 0; calls.length = 0; globalThis.ST.Repo.load = async () => ({ items: [] });
    res.maybeNone = [JSON.stringify(await window.maybeImportLegacy([])), LS.get('evarel-imported:u1') ?? null, calls.length];
    LS.set('evarel-demo-v3:u1', JSON.stringify({ items: [L(1), L(2)] })); LS.delete('evarel-imported:u1'); calls.length = 0; log.length = 0;
    res.maybeEmpty = [JSON.stringify(await window.maybeImportLegacy([])), LS.get('evarel-imported:u1') ?? null, calls.length, log.slice()];
    LS.delete('evarel-imported:u1'); log.length = 0; calls.length = 0;
    res.maybeAsk = [JSON.stringify(await window.maybeImportLegacy([L(1)])), LS.get('evarel-imported:u1') ?? null, calls.length, log.filter(x => x.startsWith('dialog')).length];
    globalThis.SUPA_API = false; LS.delete('evarel-imported:u1'); res.maybeNoApi = [JSON.stringify(await window.maybeImportLegacy([L(9)])), LS.get('evarel-imported:u1') ?? null]; globalThis.SUPA_API = true;
    LS.set('evarel-imported:u1', 'done:1'); res.maybeFlagged = JSON.stringify(await window.maybeImportLegacy([L(8)]));
    LS.clear(); LS.set('evarel-demo-v3:u1', JSON.stringify({ items: [L(1)] })); globalThis.__throw = true; log.length = 0;
    res.maybeThrow = [JSON.stringify(await window.maybeImportLegacy([])), LS.get('evarel-imported:u1') ?? null, log.filter(x => x.startsWith('toast')).length]; globalThis.__throw = false;
    out[name] = res;
  }
  return out;
}, { OLD, NEW, CORE });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ต่างที่ตำแหน่ง', i, '| เดิม:', a.slice(Math.max(0, i - 25), i + 60), '| ใหม่:', c.slice(Math.max(0, i - 25), i + 60)); } };
for (const k of Object.keys(o)) { if (k === 'plan') for (const c of Object.keys(o.plan)) cmp('plan:' + c, o.plan[c], n.plan[c]); else cmp(k, o[k], n[k]); }
const distinct = new Set(Object.values(n.plan)).size;
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | กรณีแผนนำเข้า ${Object.keys(n.plan).length} (ผลต่างกัน ${distinct} แบบ) | exports ${n.exports.length} ชื่อ | window ${n.win.join(',')} | boot log ${JSON.stringify(n.bootLog)} | pageerror ${errs.length}`);
await b.close(); process.exit(diff || errs.length || distinct < 15 || n.bootLog.filter(x => x === 'session').length !== 1 ? 1 : 0);

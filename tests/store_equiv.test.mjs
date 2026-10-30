// พิสูจน์ F6 (03-core__store): โมดูลใหม่ (ตรรกะมาจาก core/store) ให้ผลเหมือนโมดูลเดิมทุกชื่อที่ส่งออก รวมลำดับคีย์ของออบเจ็กต์ (diffItems เทียบด้วย JSON.stringify)
// ใช้: node tests/store_equiv.test.mjs <03-core__store.js เดิม>  (ใหม่อ่านจาก app/web/js/m/03-core__store.js)
import { chromium } from 'playwright'; import fs from 'fs';
const R = p => fs.readFileSync(p, 'utf8');
const OLD = R(process.argv[2]), NEW = R('app/web/js/m/03-core__store.js');
const SRC = { dates: R('app/web/js/m/02-core__dates.js'), cdates: R('app/web/js/m/core/dates.js'), cstore: R('app/web/js/m/core/store.js'), constants: R('app/web/js/m/01-core__constants.js') };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ timezoneId: 'Asia/Bangkok' }); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const r = await p.evaluate(async ({ OLD, NEW, SRC }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const RD = Date; const out = {};
  for (const [label, NOWARGS] of [['a', [2026, 9, 30, 7, 51, 9]], ['b', [2024, 1, 29, 23, 59, 59]], ['c', [2027, 0, 1, 0, 0, 0]]]) {
    const NOW = new RD(...NOWARGS).getTime();
    globalThis.Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(NOW) } static now() { return NOW } };
    for (const [name, src] of [['old', OLD], ['new', NEW]]) {
      const U = { cdates: mk(SRC.cdates), constants: mk(SRC.constants) };
      const datesCode = SRC.dates.replace(/\.\/core\/dates\.js/g, U.cdates).replace(/\.\/01-core__constants\.js/g, U.constants);
      const datesU = mk(datesCode + '\n//' + label + name + Math.random());
      const cst = mk(SRC.cstore.replace(/\.\/dates\.js/g, U.cdates));
      const code = src.replace(/\.\/core\/store\.js/g, cst).replace(/\.\/02-core__dates\.js/g, datesU);
      const m = await import(mk(code + '\n//' + label + name + Math.random()));
      const names = ['mk', 'fill', 'daily', 'weekly', 'cls', 'seed'];
      const res = { exports: Object.keys(m).sort(), winTypes: names.map(k => typeof window[k]), winSame: names.every(k => window[k] === m[k]) };
      res.mkMin = JSON.stringify(m.mk({ id: 1 }));
      res.mkFull = JSON.stringify(m.mk({ id: 'x', type: 'task', title: 'ท', start: '2026-01-02', repeat: m.weekly([1, 2]), log: { a: 1 } }));
      res.mkKeys = Object.keys(m.mk({ id: 3, title: 'k' })).join(',');
      res.mkNoId = JSON.stringify(m.mk({}));
      res.fill = [0, 1, 3, 6].map(n => JSON.stringify(m.fill(n, 7)));
      res.daily = JSON.stringify(m.daily()); res.weekly = [[], [0], [1, 3, 5], [0, 6]].map(x => JSON.stringify(m.weekly(x)));
      res.daily2 = m.daily() !== m.daily(); res.weekly2 = m.weekly([1]) !== m.weekly([1]);
      res.cls = [[9, 1, '08:30', '09:20', 'คณิต'], [14, 5, '13:00', '13:50', 'ชุมนุม']].map(a => JSON.stringify(m.cls(...a)));
      const sd = m.seed(); res.seed = JSON.stringify(sd); res.seedLen = sd.items.length; res.seedIds = sd.items.map(x => x.id).join(',');
      res.seed2 = m.seed() !== m.seed();
      out[label + '_' + name] = res;
    }
    globalThis.Date = RD;
  }
  return out;
}, { OLD, NEW, SRC });
let diff = 0, total = 0;
for (const L of ['a', 'b', 'c']) { const o = r[L + '_old'], n = r[L + '_new']; for (const k of Object.keys(o)) { total++; const x = JSON.stringify(o[k]), y = JSON.stringify(n[k]); if (x !== y) { diff++; let i = 0; while (i < x.length && x[i] === y[i]) i++; console.log('ต่าง', L, k, '| ตำแหน่ง', i, '\n  เดิม: …' + x.slice(Math.max(0, i - 25), i + 50) + '\n  ใหม่: …' + y.slice(Math.max(0, i - 25), i + 50)); } } }
const n0 = r.a_new, sig = new Set([r.a_new.seed, r.b_new.seed, r.c_new.seed]).size;
console.log(`เทียบ ${total} หมวด (3 วันที่ x ${Object.keys(n0).length}) | ตรง ${total - diff} | ต่าง ${diff} | seed ต่างกันตามวัน ${sig} แบบ | seed ${n0.seedLen} รายการ | exports ${n0.exports.length} ชื่อ | window ตรง export: ${['a', 'b', 'c'].every(L => r[L + '_new'].winSame)} | pageerror ${errs.length}`);
await b.close();
process.exit(diff || errs.length || !['a', 'b', 'c'].every(L => r[L + '_new'].winSame) || sig < 3 || n0.seedLen !== 14 ? 1 : 0);

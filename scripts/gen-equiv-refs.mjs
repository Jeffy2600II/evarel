#!/usr/bin/env node
/**
 * gen-equiv-refs.mjs - สร้างไฟล์อ้างอิง (/tmp/*.js) ที่เทสต์เทียบ *_equiv ต้องใช้ ให้เองจากประวัติ git
 *
 * ปัญหาที่แก้: เทสต์เทียบส่วนหนึ่งเทียบ "ไฟล์ก่อนย้ายตรรกะออก" กับ "ไฟล์ปัจจุบัน (ห่อบาง + core)"
 * ไฟล์อ้างอิงเคยสร้างด้วยมือแล้ววางไว้ที่ /tmp ซึ่งหายเมื่อรีสตาร์ทเครื่องหรือย้ายเครื่อง
 * เทสต์จึงตายทั้งชุดด้วย ENOENT ทั้งที่โค้ดไม่ได้ผิด (เกิดจริง 1 พ.ย. 2026 แปดชุด)
 *
 * กลไก: ตารางว่าเทสต์ไหนใช้ไฟล์อ้างอิงของโมดูลไหน + ตัวเลือก commit ฐานที่ "ทดลองแล้วผ่านจริง"
 * เก็บผลที่ผ่านไว้ใน tests/refs.lock.json (commit ไฟล์นั้น) ที่เหลือสร้างใหม่ได้ทุกเครื่องทุกเวลา
 * ห้ามเดา commit เอง: แต่ละไฟล์ถูกย้ายหลายรอบ ตัวที่ถูกคือตัวที่เทสต์ผ่านเท่านั้น (โหมด --verify เป็นผู้ตัดสิน)
 *
 * ใช้:
 *   node scripts/gen-equiv-refs.mjs                 สร้างไฟล์ที่ /tmp ตาม lock (ค่าเริ่มต้น)
 *   node scripts/gen-equiv-refs.mjs --out DIR        สร้างที่อื่น
 *   node scripts/gen-equiv-refs.mjs --check          ตรวจ lock ว่าใช้ได้ (ไม่เขียน ไม่รันเทสต์) exit 1 ถ้ามีปัญหา
 *   node scripts/gen-equiv-refs.mjs --verify         หา commit ฐานที่ทำให้เทสต์ผ่านจริง แล้วเขียน lock ใหม่ (ช้า: รันเทสต์)
 *   node scripts/gen-equiv-refs.mjs --run            สร้างแล้วรันเทสต์ทั้งหมดให้ (ต้องมี playwright + chromium 1243)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = path.join(ROOT, 'tests/refs.lock.json');
const ARGS = process.argv.slice(2);
const opt = (name, dflt) => { const i = ARGS.indexOf(name); return i >= 0 ? path.resolve(ARGS[i + 1]) : dflt; };
const OUT = opt('--out', '/tmp');
const CHECK = ARGS.includes('--check');
const VERIFY = ARGS.includes('--verify');
const RUN = ARGS.includes('--run');

/* out = ชื่อไฟล์อ้างอิงตามค่าเริ่มต้นที่เขียนไว้ในเทสต์ (process.argv[2] || '/tmp/<ชื่อ>')
   engine = ชื่อโมดูลเครื่องยนต์ (ตัด .js/.ts) | core = ไฟล์ใน core/ ที่เทสต์ส่งเป็น argv[3]
   twoSided = เทสต์รับ argv[3] เป็น core ฝั่งเก่า (ฝั่ง old ต้องมี import ค้างไว้ให้แทนที่) */
export const REFS = [
  { out: 'auth_m05_at_head.js', engine: '05-data__auth', tests: ['avatar_equiv'] },
  { out: 'undo_m08_at_head.js', engine: '08-core__undo', tests: ['undo_equiv'] },
  { out: 'notify_m10_at_head.js', engine: '10-services__notify', core: 'notify', coreOut: 'notify_core_at_head.js', twoSided: true, tests: ['push_equiv'] },
  { out: 'popover_m11_at_head.js', engine: '11-ui__popover', core: 'popover', coreOut: 'popover_core_at_head.js', twoSided: true, tests: ['popover_equiv'] },
  { out: 'form_m14_at_head.js', engine: '14-ui__form', tests: ['form_equiv'] },
  { out: 'timer_m15_at_head.js', engine: '15-core__timer', tests: ['timer_equiv'] },
  { out: 'quota_m16_selfcontained.js', engine: '16-services__ai-quota', tests: ['quota_equiv'] },
  { out: 'calendar_m20_selfcontained.js', engine: '20-services__calendar', tests: ['calstats_equiv'] },
];

/* บ้านของไฟล์โมดูลตามยุค (F6/F7 ย้ายหลายครั้ง) เรียงใหม่ไปเก่า ไม่ต้องแก้เมื่อย้ายอีก
   web/classic คือชื่อเดิมของ web/runtime (ย้าย 5 พ.ย. 2026) คงไว้เพื่อ git log หา commit ฐานยุคนั้น */
export const CANDIDATES = (n) => [`web/runtime/js/engine/${n}.js`, `web/classic/js/engine/${n}.js`, `web/src/engine/${n}.ts`, `app/web/js/m/${n}.js`, `app/src/m/${n}.ts`];
export const CORE_CANDIDATES = (n) => [`web/runtime/js/engine/core/${n}.js`, `web/classic/js/engine/core/${n}.js`, `app/web/js/m/core/${n}.js`, `core/${n}.ts`, `app/src/core/${n}.ts`];

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const show = (rev, p) => { try { return git('show', `${rev}:${p}`); } catch { return null; } }; /* พาธที่ไม่มีใน commit นั้น = กลืน fatal ทาง stderr */
const hasImport = (s) => /^\s*import\s/m.test(s);
const hasExport = (s) => /^\s*export\s/m.test(s); /* ไฟล์ที่มี export = ES module ขอบเขตไม่เห็น global ของหน้า เทสต์โหลดแบบสคริปต์ธรรมดาไม่ได้ */

/** commit ที่เคยแก้ไฟล์นี้ (ใหม่ -> เก่า) พร้อมพาธที่ใช้ได้ใน commit นั้น */
export function candidates(r, limit = 12) {
  const paths = CANDIDATES(r.engine);
  const commits = git('log', '--format=%H', '--', ...paths).trim().split('\n').filter(Boolean);
  const out = [];
  for (const moved of commits) {
    /* สภาพ "ก่อนการย้าย" = parent ของ commit ที่ย้าย (ตัว commit นั้นคือหลังย้ายแล้ว) */
    const rev = (() => { try { return git('rev-parse', `${moved}^`).trim(); } catch { return null; } })();
    if (!rev) continue;
    const p = paths.find((x) => show(rev, x) !== null);
    if (!p) continue;
    const src = show(rev, p);
    /* ของที่ใช้เป็น "อดีต" ต้องต่างจากไฟล์ปัจจุบันเสมอ ไม่งั้นเทสต์จะเทียบกับตัวเองแล้วผ่านลวง */
    const cur = show('HEAD', paths.find((x) => show('HEAD', x)) || paths[0]);
    if (cur && src === cur) continue;
    let corePath = null;
    if (r.core) {
      corePath = CORE_CANDIDATES(r.core).find((x) => show(rev, x) !== null) || null;
      if (!corePath) continue;
    }
    out.push({ base: rev, basePath: p, corePath, standalone: !hasImport(src) && !hasExport(src) });
    if (out.length >= limit) break;
  }
  /* เรียงให้ตัวที่โหลดเดี่ยวได้มาก่อน แล้วคงลำดับใหม่->เก่าไว้ภายในกลุ่ม (ผลลัพธ์คงที่ทุกเครื่อง) */
  return [...out.filter((x) => x.standalone), ...out.filter((x) => !x.standalone)];
}

const readLock = () => (fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {});
const writeRefs = (r, c, dir) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, r.out), show(c.base, c.basePath));
  if (r.core) fs.writeFileSync(path.join(dir, r.coreOut || r.out.replace(/\.js$/, '_core.js')), show(c.base, c.corePath));
};
const argvOf = (r, dir) => {
  const a = [path.join(dir, r.out)];
  if (r.core) a.push(path.join(dir, r.coreOut || r.out.replace(/\.js$/, '_core.js')));
  return a;
};

function runTests(r, dir) {
  const res = [];
  for (const t of r.tests) {
    let ok = false, note = '';
    try {
      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', `${t}.test.mjs`), ...argvOf(r, dir)], { cwd: ROOT, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
      ok = /PASS|ผ่าน/.test(out) && !/^FAIL/m.test(out);
      note = (out.trim().split('\n').pop() || '').slice(0, 80);
    } catch (e) {
      const out = `${e.stdout || ''}${e.stderr || ''}`;
      note = `exit ${e.status} | ${(out.trim().split('\n').pop() || '').slice(0, 80)}`;
    }
    res.push({ test: t, ok, note });
  }
  return res;
}

function verify() {
  const lock = {};
  let bad = 0;
  for (const r of REFS) {
    const cands = candidates(r);
    if (!cands.length) { console.log(`✗ ${r.engine}: ไม่มี commit ฐานที่เข้าเงื่อนไข`); bad++; continue; }
    let chosen = null;
    for (const c of cands) {
      writeRefs(r, c, OUT);
      const res = runTests(r, OUT);
      if (res.every((x) => x.ok)) { chosen = { ...c, checked_at: new Date().toISOString().slice(0, 10) }; console.log(`✓ ${r.engine} <- ${c.base.slice(0, 7)} (${c.basePath}) | ${res.map((x) => x.test + ' ' + x.note).join(' · ')}`); break; }
      if (process.env.VERBOSE) console.log(`  … ลอง ${c.base.slice(0, 7)} ไม่ผ่าน: ${res.map((x) => x.note).join(' · ')}`);
    }
    if (chosen) lock[r.engine] = chosen;
    else { console.log(`✗ ${r.engine}: ทุก commit ที่ลองแล้วเทสต์ไม่ผ่าน (ต้องตรวจว่าเทสต์หรือโค้ดเปลี่ยน)`); bad++; }
  }
  if (!bad) { fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n'); console.log(`\nเขียน ${path.relative(ROOT, LOCK)} (${Object.keys(lock).length} รายการ)`); }
  process.exit(bad ? 1 : 0);
}

function main() {
  const lock = readLock();
  let bad = 0;
  if (!CHECK) fs.mkdirSync(OUT, { recursive: true });
  for (const r of REFS) {
    const c = lock[r.engine];
    if (!c) { console.log(`✗ ${r.engine}: ไม่มีใน ${path.relative(ROOT, LOCK)} (รัน --verify ครั้งเดียวแล้ว commit ไฟล์นั้น)`); bad++; continue; }
    const src = show(c.base, c.basePath);
    if (src === null) {
      const shallow = (() => { try { return git('rev-parse', '--is-shallow-repository').trim() === 'true'; } catch { return false; } })();
      const why = shallow ? 'โคลนตื้น (ต้อง fetch-depth 0 / git fetch --unshallow)' : 'ประวัติถูกเขียนใหม่หรือ commit ไม่มีอยู่';
      console.log(`✗ ${r.engine}: commit ${String(c.base).slice(0, 7)} ไม่มีไฟล์ ${c.basePath} — ${why}`); bad++; continue;
    }
    /* ไม่ตัดสินว่า "ต้องไม่มี import" เอง: บางเทสต์รับไฟล์ที่มี import ได้ (ตัวเทสต์เป็นผู้พิสูจน์ตอน --verify)
       สิ่งที่บังคับคือ ห้ามเหมือนไฟล์ปัจจุบัน ไม่งั้นเทสต์จะเทียบกับตัวเองแล้วผ่านลวง */
    const curPath = CANDIDATES(r.engine).find((x) => show('HEAD', x) !== null);
    if (curPath && src === show('HEAD', curPath)) { console.log(`✗ ${r.engine}: ไฟล์อ้างอิงเหมือนไฟล์ปัจจุบัน (ใช้ไม่ได้)`); bad++; continue; }
    if (!CHECK) { writeRefs(r, c, OUT); console.log(`✓ ${r.out} <- ${String(c.base).slice(0, 7)} (${(Buffer.byteLength(src) / 1024).toFixed(1)} KB)`); }
    else console.log(`✓ ${r.engine} -> ${r.out} จาก ${String(c.base).slice(0, 7)}`);
    if (r.core) {
      const cs = show(c.base, c.corePath);
      if (cs === null) { console.log(`  ✗ core/${r.core}: ไม่พบที่ ${String(c.base).slice(0, 7)}`); bad++; }
      else if (!CHECK) console.log(`  ✓ ${r.coreOut || r.out.replace(/\.js$/, '_core.js')} <- ${String(c.base).slice(0, 7)}`);
    }
  }
  if (RUN && !CHECK) {
    for (const r of REFS) {
      if (!lock[r.engine]) continue;
      for (const x of runTests(r, OUT)) { console.log(`${x.ok ? '✓' : '✗'} ${x.test}: ${x.note}`); if (!x.ok) bad++; }
    }
  }
  if (CHECK) console.log(bad ? `\nมี ${bad} ปัญหา` : `\nlock ใช้ได้ครบ ${REFS.length} รายการ`);
  process.exit(bad ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) { VERIFY ? verify() : main(); }

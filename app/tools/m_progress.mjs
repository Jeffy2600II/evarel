#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * m_progress.mjs - ตัวนับความคืบหน้าของการทำให้ app/src/m ว่าง (F6)
 * อ่านอย่างเดียว ไม่แก้ไฟล์ใดๆ วัดจากโค้ดจริงทุกครั้ง ผลกำหนดแน่นอน (รันสองรอบต้องตรงกัน)
 *
 *   node app/tools/m_progress.mjs              พิมพ์รายงานภาษาคน
 *   node app/tools/m_progress.mjs --json       พิมพ์ JSON
 *   node app/tools/m_progress.mjs --check-empty  รหัสออก 0 เมื่อ m/ ว่างจริง นอกนั้น 1
 *
 * รหัสออก: 0 ปกติ | 1 ไม่ว่าง (เฉพาะ --check-empty) หรืออ่านไม่ได้ | 2 อาร์กิวเมนต์ผิด
 * ข้อจำกัด: วิเคราะห์จากข้อความโค้ด มองไม่เห็นการเรียกผ่านสตริง (data-act) หรือ eval
 *           ผู้อ่านจริงจึงอาจมากกว่าตัวเลข (เป็นขอบล่าง)
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const M_DIR = process.env.M_DIR || path.resolve(HERE, '../src/m');

/* ชื่อที่ตรวจด้วยตาแล้วว่าไม่ใช่การพึ่งข้ามไฟล์ (ผลบวกลวงของการค้นชื่อ) 30 ต.ค. 2026
   date   = คีย์วัตถุ / ตัวแปรท้องถิ่น / สตริง ('date') ไม่ใช่ date() ของ 25-actions
   target = e.target ของเหตุการณ์ หรือ target ที่ import จาก core/schedule */
export const KNOWN_FALSE = { date: 'คีย์วัตถุหรือตัวแปรท้องถิ่น', target: 'e.target หรือ import จาก core' };

export const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const stripAssign = (s) => s.replace(/Object\.assign\(window,\s*\{[^}]*\}\s*\);?/g, '');

/** ชื่อที่ไฟล์ปล่อยออก: Object.assign(window,{...}) และ export */
export function exportsOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/Object\.assign\(window,\s*\{([^}]*)\}/g)) {
    for (const raw of m[1].split(/[,\s]+/)) {
      const n = raw.split(':')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) names.add(n);
    }
  }
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  return names;
}

/** ชื่อ n ถูก "ใช้จริง" ในเนื้อหา body หรือไม่ (ไม่นับ .ชื่อ, คีย์วัตถุ ชื่อ:, การประกาศท้องถิ่น) */
export function usesName(body, n) {
  const rx = new RegExp(`(?<![\\w$])${n.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
  for (const m of body.matchAll(rx)) {
    const i = m.index;
    if (body[i - 1] === '.') continue;
    const after = body.slice(i + n.length, i + n.length + 3);
    const before = body.slice(Math.max(0, i - 40), i);
    if (/^\s*:/.test(after) && !/\?\s*[^:]*$/.test(before)) continue;
    if (/\b(?:const|let|var|function)\s+$/.test(body.slice(Math.max(0, i - 12), i))) continue;
    return true;
  }
  return false;
}

/** ไฟล์ประกาศชื่อ n เองแล้ว (const/let/var/function ชื่อนั้น หรือเป็นพารามิเตอร์) = ชื่อนั้นเป็นของไฟล์ ไม่ใช่การพึ่งข้ามไฟล์ */
export function declaresLocally(body, n) {
  const e = n.replace(/\$/g, '\\$');
  return new RegExp(`\\b(?:const|let|var|function)\\s+${e}\\b`).test(body);
}

export function analyze(dir = M_DIR) {
  if (!fs.existsSync(dir)) return { files: [], error: `ไม่พบ ${dir}` };
  const names = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts')).sort();
  const src = Object.fromEntries(names.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  const exp = Object.fromEntries(names.map((f) => [f, exportsOf(src[f])]));
  const owner = new Map();
  for (const f of names) for (const n of exp[f]) owner.set(n, [...(owner.get(n) || []), f]);
  const dep = Object.fromEntries(names.map((f) => [f, {}]));
  for (const f of names) {
    const body = stripAssign(strip(src[f]));
    for (const [n, fs_] of owner) {
      if (KNOWN_FALSE[n] || fs_.length > 1 || fs_[0] === f) continue;
      if (declaresLocally(body, n)) continue;
      if (usesName(body, n)) (dep[f][fs_[0]] ||= []).push(n);
    }
  }
  /* ชั้น = 1 + ชั้นสูงสุดของสิ่งที่ไฟล์นั้นพึ่ง (ล่างสุด = 0) ตรวจวงจรไปพร้อมกัน */
  const lvl = {}; const visiting = new Set(); const cyc = new Set();
  const L = (f) => {
    if (f in lvl) return lvl[f];
    if (visiting.has(f)) { cyc.add(f); return 0; }
    visiting.add(f);
    let v = 0;
    for (const g of Object.keys(dep[f])) v = Math.max(v, L(g) + 1);
    visiting.delete(f); lvl[f] = v; return v;
  };
  names.forEach(L);
  const readers = Object.fromEntries(names.map((f) => [f, 0]));
  for (const f of names) for (const g of Object.keys(dep[f])) readers[g]++;
  const files = names.map((f) => ({
    file: f, bytes: Buffer.byteLength(src[f]), layer: lvl[f],
    uses: Object.keys(dep[f]).length, usedBy: readers[f],
  }));
  return { files, cycles: [...cyc].sort(), layers: Math.max(-1, ...files.map((x) => x.layer)) + 1 };
}

export function report(r) {
  const out = [];
  const bytes = r.files.reduce((a, x) => a + x.bytes, 0);
  out.push(`ไฟล์ใน m/ เหลือ: ${r.files.length} | ${bytes} ไบต์ | ชั้นพึ่งพา ${r.layers} | วงจรจริง ${r.cycles.length}`);
  const by = {};
  for (const x of r.files) (by[x.layer] ||= []).push(x);
  for (const k of Object.keys(by).map(Number).sort((a, b) => a - b)) {
    const kb = by[k].reduce((a, x) => a + x.bytes, 0) / 1024;
    out.push(`ชั้น ${String(k).padStart(2)}: ${by[k].length} ไฟล์ ${kb.toFixed(1)} KB | ` +
      by[k].map((x) => `${x.file.replace(/\.ts$/, '')}(ถูกใช้ ${x.usedBy})`).join(', '));
  }
  if (r.cycles.length) out.push(`! พบวงจร: ${r.cycles.join(', ')}`);
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const known = ['--json', '--check-empty'];
  if (args.some((a) => !known.includes(a))) { console.error('ใช้: m_progress.mjs [--json] [--check-empty]'); process.exit(2); }
  const r = analyze();
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : report(r));
  process.exit(args.includes('--check-empty') && r.files.length > 0 ? 1 : 0);
}

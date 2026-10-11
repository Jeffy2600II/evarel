// ts1j_scope_gate.mjs: ประตูถาวร ตัวนับการพึ่งพาต้องแยกขอบเขตท้องถิ่นถูกต้อง (evarel-ts-1j)
// ใช้: node ts1j_scope_gate.mjs [path/to/dep_manifest.mjs]  (ค่าเริ่มต้น ../tools/dep_manifest.mjs)
import { spawnSync } from 'child_process'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)); const tool = process.argv[2] || path.join(here, '../tools/dep_manifest.mjs');
const fx = path.join(here, 'fixtures/scope');
const MUST_COUNT = ['keepReal', 'realFn', 'viaLetBlock'];                 // ชื่อบนสุดจริง ต้องนับ (กันหลุดเส้นจริง)
const MUST_SKIP = ['blockOnly', 'shared', 'viaCatch', 'viaDestr', 'viaFnExpr', 'viaFor', 'viaInner', 'viaParam', 'viaVarHoist']; // ท้องถิ่น ห้ามนับ
const r = spawnSync('node', [tool, fx, '--parser', 'acorn', '--explain'], { encoding: 'utf8' });
const err = r.stderr || ''; const skipped = new Set([...err.matchAll(/b\.js \((\w+)\) ผูกท้องถิ่น/g)].map(m => m[1]));
const hasExplain = /ตัดออกเพราะผูกท้องถิ่น/.test(err);
const bad = [];
if (!hasExplain) bad.push('ตัวนับไม่รองรับ --explain หรือไม่แยกขอบเขต');
for (const n of MUST_SKIP) if (!skipped.has(n)) bad.push('ควรตัดแต่ยังนับ: ' + n);
for (const n of MUST_COUNT) if (skipped.has(n)) bad.push('หลุดเส้นจริง ตัดผิด: ' + n);
let edge = null; try { edge = JSON.parse(r.stdout).files_detail['b.js'].dependsOn; } catch (e) { bad.push('อ่านผลไม่ได้'); }
if (edge && JSON.stringify(edge) !== '["a.js"]') bad.push('เส้นจริง b -> a ต้องยังอยู่ ได้ ' + JSON.stringify(edge));
console.log(bad.length ? 'SCOPE-GATE FAIL | ' + bad.join(' ; ') : `SCOPE-GATE PASS | ตัดถูก ${MUST_SKIP.length} ชื่อ | ยังนับ ${MUST_COUNT.length} ชื่อจริง`);
process.exit(bad.length ? 1 : 0);

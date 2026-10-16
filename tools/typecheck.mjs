// S4 ชั้น 1: ตรวจชนิดข้อมูลส่วนหน้าแบบอ่านอย่างเดียว ไม่แก้ไฟล์ใดและไม่ส่งผลต่อไฟล์ที่เสิร์ฟ
// ใช้: node tools/typecheck.mjs            พิมพ์ผลเทียบ baseline
//      node tools/typecheck.mjs --update   บันทึก baseline ใหม่ (ทำเมื่อ Master อนุมัติให้ค่าเปลี่ยนเท่านั้น)
// ล้มเหลว (exit 1) เมื่อ: ไฟล์ types พัง (ตัวตรวจจะไม่ได้ตรวจโค้ดจริง) หรือมี error ใหม่นอก baseline
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(root, 'tools/typecheck.baseline.json');
const tsc = join(root, 'node_modules/.bin/tsc');
if (!existsSync(tsc)) { console.error('ไม่พบ tsc: รัน npm install ที่ราก'); process.exit(2); }
const r = spawnSync(tsc, ['-p', 'tsconfig.check.json'], { cwd: root, encoding: 'utf8' });
const lines = (r.stdout + r.stderr).split('\n').filter(l => /error TS\d+/.test(l));
const norm = l => l.replace(/\(\d+,\d+\)/, '').replace(/^app\/web\/js\//, '');
const own = lines.filter(l => l.startsWith('types/'));
if (own.length) { console.error(`ไฟล์ types พัง ${own.length} จุด ตัวตรวจไม่ได้ตรวจโค้ดแอปจริง:\n` + own.slice(0, 5).join('\n')); process.exit(1); }
const app = lines.map(norm).sort();
if (process.argv.includes('--update')) { writeFileSync(BASE, JSON.stringify(app, null, 0) + '\n'); console.log(`บันทึก baseline ${app.length} จุด`); process.exit(0); }
if (!existsSync(BASE)) { console.error('ไม่มี baseline: รัน --update ก่อน'); process.exit(2); }
const base = JSON.parse(readFileSync(BASE, 'utf8'));
const count = a => a.reduce((m, x) => (m.set(x, (m.get(x) || 0) + 1), m), new Map());
const cb = count(base), ca = count(app); const added = [];
for (const [k, n] of ca) if (n > (cb.get(k) || 0)) added.push(`${k}  (+${n - (cb.get(k) || 0)})`);
console.log(`error ${app.length} จุด | baseline ${base.length} จุด | ใหม่นอก baseline ${added.length}`);
if (added.length) { console.error('error ใหม่:\n' + added.slice(0, 10).join('\n')); process.exit(1); }
console.log('ผ่าน: ไม่มี error ใหม่');

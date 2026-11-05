/* กันระบบ "เดา/ชี้ทางอีเมล" กลับมา (Master สั่ง 2 พ.ย. 2026)
   เดิมเมื่อพิมพ์อีเมลแล้วลบ ระบบเสนอ "หมายถึง xxx@yyy หรือเปล่า?" พร้อมปุ่ม "ใช้อันนี้"
   ซึ่งคนที่ไม่ใช่เจ้าของบัญชีใช้ไล่เดาอีเมลที่มีอยู่จริงได้ -> ห้ามมีในหน้าเว็บที่สร้างแล้ว
   ใช้: node tests/no-email-guessing.test.mjs */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const targets = [
  'web/runtime/js/engine/22-views__auth.js',
  'web/runtime/js/engine/25-actions.js',
  'web/runtime/js/engine/24-services__legacy-import.js',
];
const banned = [
  { name: 'ข้อความเดาอีเมล', re: /หมายถึง\s*\$\{/ },
  { name: 'ข้อความเดาอีเมล (แบบตายตัว)', re: /หมายถึง .{0,40}หรือเปล่า/ },
  { name: 'ปุ่ม "ใช้อันนี้"', re: /au-fixmail/ },
];
let fail = 0;
for (const rel of targets) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log(`SKIP ไม่พบไฟล์ ${rel}`); continue; }
  const code = fs.readFileSync(p, 'utf8');
  /* ตัดคอมเมนต์ออกก่อนตรวจ (คอมเมนต์อธิบายเหตุผลได้ แต่ต้องไม่ใช่โค้ดที่รันจริง) */
  const live = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const b of banned) {
    if (b.re.test(live)) { console.log(`FAIL ${rel}: ยังพบ ${b.name}`); fail++; }
  }
}
if (fail) { console.log(`สรุป: ไม่ผ่าน ${fail} จุด`); process.exit(1); }
console.log('PASS ไม่มีระบบเดา/ชี้ทางอีเมลในหน้าเว็บแล้ว');

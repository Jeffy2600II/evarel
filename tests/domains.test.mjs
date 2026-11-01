/* เกตกันชื่อโดเมนเก่ากลับมา: โดเมนทุกตัวของระบบย้ายเป็น ordivel-* แล้ว (1 พ.ย. 2026)
   เทสต์นี้ไม่เปิดเบราว์เซอร์และไม่ต้องมีคีย์: อ่านไฟล์ที่ส่งถึงผู้ใช้/ตั้งค่า แล้วหาชื่อโดเมนยุคเก่า
   เหตุผลที่ต้องมี: ชื่อโดเมนกระจายอยู่หลายสิบไฟล์ ถ้าใครก๊อปไฟล์เก่ากลับมา ระบบจะยิงไปโดเมนที่ปิดไปแล้วแบบเงียบ ๆ
   ใช้: node tests/domains.test.mjs   (ผ่าน = ไม่พบชื่อเก่า; ตก = บอกไฟล์และบรรทัด) */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/* ชื่อโดเมนยุคเก่าที่ห้ามโผล่ในโค้ดที่รันจริง/ตั้งค่า/เอกสารปฏิบัติการ
   ไม่นับ archive/ (ของประวัติศาสตร์) และ brand/ (ต้นฉบับนักออกแบบ ห้ามแตะ) และ *prototype* */
const LEGACY = [/\bevarel-app-forge\b/, /\bevarel-api-forge\b/, /\bevarel-app\./, /\bevarel-api\b/];
/* เอกสารการย้ายโดยตั้งใจต้องเอ่ยชื่อเดิม (ตารางเทียบของเก่ากับของใหม่ + คำสั่งลบ worker เก่า)
   จึงยกเว้นเฉพาะไฟล์คู่มือการย้าย ไม่ใช่ยกเว้นทั้งโฟลเดอร์ docs */
const SKIP = [/^archive\//, /prototype/, /^brand\//, /^node_modules\//, /^docs\/ops\/DOMAIN-MIGRATION\.md$/];
const EXT = /\.(mjs|js|ts|tsx|json|toml|yml|yaml|html|md)$/;

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter((f) => EXT.test(f) && !SKIP.some((r) => r.test(f)));

const hits = [];
for (const f of files) {
  /* ไฟล์เทสต์นี้เองมีชื่อเก่าอยู่ในรายการตรวจ (โดยตั้งใจ) จึงข้ามการอ่านตัวเอง */
  if (f.endsWith('tests/domains.test.mjs')) continue;
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  src.split('\n').forEach((line, i) => {
    if (LEGACY.some((re) => re.test(line))) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 110)}`);
  });
}

if (hits.length) {
  console.error(`FAIL พบชื่อโดเมนยุคเก่า ${hits.length} จุด (ต้องเป็น ordivel-* เท่านั้น)`);
  for (const h of hits.slice(0, 25)) console.error('  ' + h);
  if (hits.length > 25) console.error(`  ... อีก ${hits.length - 25} จุด`);
  process.exit(1);
}
console.log(`PASS โดเมนทั้งระบบเป็น ordivel-* (ตรวจ ${files.length} ไฟล์ ไม่พบชื่อเก่า)`);

// ประตูล็อกโครงสร้างการพึ่งพา (evarel-ts-1d)
// ตั้งใจให้ "ตก" เมื่อโครงสร้างเปลี่ยน เพื่อบังคับให้อัปเดต deps.manifest.json โดยเจตนา (ไม่ใช่ถดถอยเงียบๆ)
// ใช้: node ts1d_deps_gate.mjs <appdir>   (มี js/m/_order.json และ deps.manifest.json)
import { execFileSync } from 'child_process'; import fs from 'fs'; import path from 'path';
import { undefinedNames } from '/tmp/evarel-repo/tools/undef_names.mjs';
const app = process.argv[2]; const mdir = path.join(app, 'js/m');
const LIMIT_BACK = 0;             // เพดานเส้นย้อนทิศ: ห้ามเพิ่ม (ลดได้ และเมื่อลดต้องอัปเดตค่านี้) 22->17 ts-1f, 17->14 ts-1g, 14->12 ts-1i, 12->10 ts-1j (ตัวนับแยกขอบเขตท้องถิ่น ตัดเส้นเท็จ 2 เส้น), 10->7 ts-1k (ย้าย icon ไป 01 และ closePop ไป 09), 7->5 ts-1l (ย้าย dayLab ไป 02 และ agendaHTML ไป 11), 5->3 ts-1m (ย้าย 11 นิยามของหน้ารายละเอียดและ LP), 3->0 ts-1n (ย้าย enterApp authSubmit authGoogle ไป 24 และสลับไฟล์ actions ไปท้ายสุด) เฟส B ถึงเป้า
const LIMIT_CYCLE = 1;            // เพดานขนาดก้อนวงจรใหญ่สุด (ไฟล์): ห้ามโต 9->8 ts-1j (เส้นเท็จที่ตัดอยู่ในก้อนเดิม), 8->6 ts-1l วัดจริงแต่ยังไม่ล็อก, 6->3 ts-1m, 3->1 ts-1n (ไม่มีวงจร)
const tool = '/tmp/evarel-repo/tools/dep_manifest.mjs';
const fails = [];
const gen = (parser) => JSON.parse(execFileSync('node', [tool, mdir, '--parser', parser], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
const A = gen('acorn'), B = gen('babel');
const committed = JSON.parse(fs.readFileSync(path.join(app, 'deps.manifest.json'), 'utf8'));
// 1) สอง parser ต้องให้ผลเท่ากัน
if (JSON.stringify(A) !== JSON.stringify(B)) fails.push('acorn กับ babel ให้ manifest ไม่เท่ากัน');
// 2) manifest ที่ commit ต้องตรงกับโค้ดจริง
if (JSON.stringify(A) !== JSON.stringify(committed)) {
  const k = Object.keys(A.summary).filter(x => JSON.stringify(A.summary[x]) !== JSON.stringify(committed.summary?.[x]));
  fails.push('deps.manifest.json ไม่ตรงโค้ดจริง (ต่างที่: ' + (k.join(',') || 'รายละเอียดไฟล์') + ') ให้สร้างใหม่ด้วย tools/dep_manifest.mjs --write');
}
// 3) กติกาโครงสร้าง
if (A.summary.duplicateTopLevelNames !== 0) fails.push('มีชื่อระดับบนสุดซ้ำข้ามไฟล์ ' + A.summary.duplicateTopLevelNames);
if (A.summary.loadTimeForwardRefs !== 0) fails.push('มีการอ้างตอนโหลดชี้ไปไฟล์ที่โหลดทีหลัง ' + A.summary.loadTimeForwardRefs);
if (A.summary.backEdges > LIMIT_BACK) fails.push(`เส้นย้อนทิศเพิ่มเกินเพดาน ${A.summary.backEdges} > ${LIMIT_BACK}`);
const bigCycle = (A.summary.cyclicGroups || [0])[0] || 0; if (bigCycle > LIMIT_CYCLE) fails.push(`ก้อนวงจรใหญ่สุดโตเกินเพดาน ${bigCycle} > ${LIMIT_CYCLE}`);
// 4) ทุกไฟล์ใน _order.json อยู่ใน manifest และไม่มีไฟล์ .js ในโฟลเดอร์ที่ตกหล่น
const order = JSON.parse(fs.readFileSync(path.join(mdir, '_order.json'), 'utf8')).order.map(o => o.file);
const onDisk = fs.readdirSync(mdir).filter(f => f.endsWith('.js'));
const orphan = onDisk.filter(f => !order.includes(f)); if (orphan.length) fails.push('ไฟล์ไม่อยู่ใน _order.json: ' + orphan.join(','));
const missing = order.filter(f => !(f in A.files_detail)); if (missing.length) fails.push('ไฟล์ใน _order.json แต่ไม่อยู่ใน manifest: ' + missing.join(','));
// 5) hook ที่ประกาศ (let _x=()=>{}) ต้องมีการผูกค่า _x=... ในไฟล์อื่นอย่างน้อยหนึ่งแห่ง ไม่งั้นเป็น no-op เงียบ (evarel-ts-1g)
for (const f of order) {
  const code = fs.readFileSync(path.join(mdir, f), 'utf8');
  for (const m of code.matchAll(/(?:^|\n)let (_[A-Za-z0-9]+)=\(\)=>\{\};/g)) {
    const h = m[1]; const bound = order.some(g => g !== f && new RegExp('(?:^|\\n)' + h + '=(?!=)').test(fs.readFileSync(path.join(mdir, g), 'utf8')));
    if (!bound) fails.push('hook ' + h + ' ประกาศที่ ' + f.slice(0, 2) + ' แต่ไม่มีการผูกค่าในไฟล์อื่น (no-op เงียบ)');
  }
}
// 6) ชื่อที่ถูกใช้แต่ไม่มีนิยามและไม่ใช่ global ของเบราว์เซอร์ (evarel-ts-1h) จับการลบ/ย้ายนิยามหายก่อนต้องรอประตูพฤติกรรม
const undef = undefinedNames(app); if (undef.length) fails.push('มีชื่อที่ถูกใช้แต่ไม่มีนิยาม: ' + undef.join(' '));
const ok = fails.length === 0;
console.log(ok ? 'DEPS-GATE PASS' : 'DEPS-GATE FAIL', `| ไฟล์ ${A.files} | เส้น ${A.summary.pairEdges} | ย้อนทิศ ${A.summary.backEdges}/${LIMIT_BACK} | อ้างตอนโหลดไปข้างหน้า ${A.summary.loadTimeForwardRefs} | ชื่อซ้ำ ${A.summary.duplicateTopLevelNames} | วงจร ${JSON.stringify(A.summary.cyclicGroups)}`);
fails.forEach(f => console.log('  -', f)); process.exit(ok ? 0 : 1);

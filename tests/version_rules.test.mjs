/* ทดสอบกติกาเลขรุ่น (docs/versioning.md) รัน: node tests/version_rules.test.mjs */
import { parseVersion, compareVersion, requiredBump, checkBump } from '../scripts/version-rules.mjs';
import assert from 'node:assert/strict';
let n = 0; const t = (name, fn) => { fn(); n++; };
const NEW = [{ type: 'new', text: 'x' }], FIX = [{ type: 'fix', text: 'x' }], IMP = [{ type: 'improve', text: 'x' }];

t('รูปแบบที่ถูก', () => { for (const v of ['2026.1.0', '2026.12.34', '2027.1.0']) assert.ok(parseVersion(v), v); });
t('รูปแบบที่ผิด', () => { for (const v of ['0.2.3', '2026.0.0', '2026.1', '26.1.0', '2026.01.0', '2026.1.00', 'v2026.1.0', '2026.1.0-forge', '', null]) assert.equal(parseVersion(v), null, String(v)); });
t('เทียบลำดับ', () => { assert.ok(compareVersion('2026.1.1', '2026.1.0') > 0); assert.ok(compareVersion('2026.2.0', '2026.1.9') > 0); assert.ok(compareVersion('2027.1.0', '2026.9.9') > 0); assert.equal(compareVersion('2026.1.0', '2026.1.0'), 0); });
t('ชนิดโน้ตกำหนดการขยับ', () => { assert.equal(requiredBump(NEW), 'cycle'); assert.equal(requiredBump(FIX), 'patch'); assert.equal(requiredBump([...FIX, ...NEW]), 'cycle'); assert.equal(requiredBump([]), 'patch'); });

/* กรณีที่ต้องผ่าน (null) */
t('แพตช์: แก้ล้วนขยับแพตช์', () => assert.equal(checkBump('2026.1.0', '2026.1.1', FIX), null));
t('แพตช์: ปรับปรุงล้วนขยับแพตช์', () => assert.equal(checkBump('2026.1.0', '2026.1.1', IMP), null));
t('รอบ: ของใหม่ขยับรอบ แพตช์รีเซ็ต', () => assert.equal(checkBump('2026.1.3', '2026.2.0', NEW), null));
t('รอบ: แก้ล้วนขยับรอบก็ได้ (ขยับเกินที่จำเป็นไม่ผิด)', () => assert.equal(checkBump('2026.1.3', '2026.2.0', FIX), null));
t('ปี: ขึ้นปีใหม่เริ่มที่ 1.0', () => assert.equal(checkBump('2026.5.2', '2027.1.0', NEW), null));
t('ข้ามจากระบบเก่า 0.x มาเลขใหม่ได้', () => assert.equal(checkBump('0.2.3', '2026.1.0', NEW), null));
t('รุ่นแรกไม่มีรุ่นก่อน', () => assert.equal(checkBump(null, '2026.1.0', NEW), null));

/* กรณีที่ต้องล้ม (ได้ข้อความ) */
t('ล้ม: ของใหม่แต่ขยับแค่แพตช์', () => assert.match(checkBump('2026.1.0', '2026.1.1', NEW), /ขยับ "รอบ"/));
t('ล้ม: เลขเท่าเดิม', () => assert.match(checkBump('2026.1.0', '2026.1.0', FIX), /ต้องใหม่กว่า/));
t('ล้ม: ถอยหลัง', () => assert.match(checkBump('2026.2.0', '2026.1.5', FIX), /ต้องใหม่กว่า/));
t('ล้ม: ปีถอย', () => assert.ok(checkBump('2027.1.0', '2026.9.9', FIX)));
t('ล้ม: ขยับรอบแต่แพตช์ไม่รีเซ็ต', () => assert.match(checkBump('2026.1.3', '2026.2.1', NEW), /รีเซ็ตเป็น 0/));
t('ล้ม: ขึ้นปีแต่รอบไม่เริ่ม 1', () => assert.match(checkBump('2026.5.2', '2027.3.0', NEW), /เริ่มที่ 1/));
t('ล้ม: รูปแบบผิด', () => assert.match(checkBump('2026.1.0', '2026.1', FIX), /ไม่ถูกรูปแบบ/));
t('ล้ม: ใส่ช่องต่อท้ายใน current.json (ช่องเติมตอน build เท่านั้น)', () => assert.match(checkBump('2026.1.0', '2026.1.1-forge', FIX), /ไม่ถูกรูปแบบ/));
console.log(`VERSION-RULES OK: ${n} กรณี`);

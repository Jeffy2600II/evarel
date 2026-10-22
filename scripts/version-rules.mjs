/* Path: scripts/version-rules.mjs | Purpose: กติกาเลขรุ่นของ Evarel จุดเดียว (ปี.รอบ.แพตช์) ใช้ร่วมกันทั้งตัว build และตัวตรวจ
   รูปแบบ: <ปี>.<รอบ>.<แพตช์> เช่น 2026.1.0 | ปี = ปี ค.ศ. 4 หลัก | รอบ >= 1 | แพตช์ >= 0
   Used by: scripts/build-next.mjs, scripts/check-release-notes.mjs, tests/version_rules.test.mjs
   เอกสาร: docs/versioning.md */
export const VERSION_RE = /^(\d{4})\.([1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseVersion(v) {
  const m = VERSION_RE.exec(String(v || ''));
  return m ? { year: +m[1], cycle: +m[2], patch: +m[3] } : null;
}

/* เทียบลำดับ: คืน <0 ถ้า a เก่ากว่า b, 0 ถ้าเท่ากัน, >0 ถ้า a ใหม่กว่า */
export function compareVersion(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) throw new Error('เลขรุ่นไม่ถูกรูปแบบ: ' + (!x ? a : b));
  return (x.year - y.year) || (x.cycle - y.cycle) || (x.patch - y.patch);
}

/* ชนิดของการเปลี่ยนที่เลขรุ่นต้องสะท้อน: มีโน้ตชนิด new => ต้องขยับ "รอบ" หรือ "ปี"; มีแต่ improve/fix => ขยับอย่างน้อย "แพตช์" */
export function requiredBump(notes) {
  return (notes || []).some(n => n.type === 'new') ? 'cycle' : 'patch';
}

/* ตรวจว่า next เป็นการขยับที่ถูกต้องจาก prev ตามชนิดโน้ต; คืน null ถ้าถูก หรือข้อความอธิบายถ้าผิด */
export function checkBump(prev, next, notes) {
  const n = parseVersion(next);
  if (!n) return `เลขรุ่น "${next}" ไม่ถูกรูปแบบ ปี.รอบ.แพตช์ (เช่น 2026.1.0)`;
  if (!prev) return null; /* ไม่มีรุ่นก่อนหน้า = รุ่นแรก */
  const p = parseVersion(prev);
  if (!p) return null; /* รุ่นก่อนหน้าเป็นระบบเลขเก่า (0.x) = ยอมให้เปลี่ยนมาใช้ระบบใหม่ครั้งเดียว */
  if (compareVersion(prev, next) >= 0) return `เลขรุ่น ${next} ต้องใหม่กว่า ${prev}`;
  if (n.year < p.year) return `ปีของเลขรุ่นถอยหลัง (${p.year} -> ${n.year})`;
  if (requiredBump(notes) === 'cycle') {
    const bumped = n.year > p.year || n.cycle > p.cycle;
    if (!bumped) return `มีโน้ตชนิด "ใหม่" ต้องขยับ "รอบ" (หรือปี) แต่เลขรุ่นขยับแค่แพตช์ (${prev} -> ${next})`;
  }
  /* ขยับรอบหรือปี => แพตช์ต้องรีเซ็ตเป็น 0 */
  if ((n.year > p.year || n.cycle > p.cycle) && n.patch !== 0) return `เมื่อขยับรอบหรือปี แพตช์ต้องรีเซ็ตเป็น 0 (ได้ ${next})`;
  if (n.year > p.year && n.cycle !== 1) return `เมื่อขึ้นปีใหม่ รอบต้องเริ่มที่ 1 (ได้ ${next})`;
  return null;
}

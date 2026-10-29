/**
 * tray.js: รูปถาดข้อมูลมาตรฐานของโรงงาน (F3.2)
 * ทุกกล่องใช้แบบเดียวกัน: ประกาศรูปข้อมูลที่รับ ตรวจตอนรับ และชี้ชื่อกล่องเมื่อผิด
 * ไม่มีไลบรารีภายนอก ไม่แตะ window ไม่มีผลข้างเคียงตอน import
 *
 * ใช้ในไฟล์ <กล่อง>.tray.js:
 *   import { tray, T } from '../../shared/tray.js';
 *   export default tray('stats', {
 *     period: T.oneOf(['week','month']),
 *     items:  T.arrayOf(T.shape({ id: T.string, type: T.string })),
 *   });
 *   // รับ: const data = trayOfStats.take(raw);  ผิดรูป -> โยน TrayError ชี้ชื่อกล่องและทางของฟิลด์
 */
export class TrayError extends Error {
  constructor(box, path, expected, got) {
    super(`tray(${box}): ข้อมูลผิดรูปที่ '${path}' คาดว่า ${expected} ได้ ${got}`);
    this.name = 'TrayError'; this.box = box; this.path = path; this.expected = expected; this.got = got;
  }
}
const kind = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const prim = name => ({ name, check: (v, p, box) => { if (kind(v) !== name) throw new TrayError(box, p, name, kind(v)); return v; } });

/** ตัวบอกรูป: T.string T.number T.boolean T.func T.any T.oneOf T.arrayOf T.shape T.optional */
export const T = {
  string: prim('string'),
  number: prim('number'),
  boolean: prim('boolean'),
  func: { name: 'function', check: (v, p, box) => { if (typeof v !== 'function') throw new TrayError(box, p, 'function', kind(v)); return v; } },
  any: { name: 'any', check: v => v },
  oneOf: list => ({ name: `one of ${JSON.stringify(list)}`, check: (v, p, box) => { if (!list.includes(v)) throw new TrayError(box, p, `one of ${JSON.stringify(list)}`, JSON.stringify(v)); return v; } }),
  arrayOf: item => ({ name: `array of ${item.name}`, check: (v, p, box) => { if (!Array.isArray(v)) throw new TrayError(box, p, 'array', kind(v)); v.forEach((x, i) => item.check(x, `${p}[${i}]`, box)); return v; } }),
  shape: fields => ({ name: 'object', check: (v, p, box) => { if (kind(v) !== 'object') throw new TrayError(box, p, 'object', kind(v)); for (const k of Object.keys(fields)) fields[k].check(v[k], `${p}.${k}`, box); return v; } }),
  optional: inner => ({ name: `${inner.name}?`, check: (v, p, box) => (v === undefined || v === null ? v : inner.check(v, p, box)) }),
};

/** สร้างถาด: คืนวัตถุที่มี take(ข้อมูลดิบ) ตรวจรูปแล้วคืนข้อมูลเดิม (ไม่แปลง ไม่คัดลอก ภาพจึงไม่ขยับ) */
export function tray(box, spec) {
  if (!box || typeof box !== 'string') throw new Error('tray(): ต้องระบุชื่อกล่อง');
  const shape = T.shape(spec);
  return { box, spec, take: raw => shape.check(raw, '$', box) };
}

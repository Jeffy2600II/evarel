/**
 * ถาดข้อมูลของชั้น sheet F3.3-g12: icon และรีจิสทรีคอมโพเนนต์
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05) | ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด | อ่านตอนเรียก ไม่ใช่ตอน import
 * icon: ตัวผลิต SVG ของชั้น m ที่หลายไฟล์ใช้ร่วม (ถูกครอบซ้ำที่ nav.tray.js กับ ai.tray.js ควรรวมเป็นถาดกลางในรอบลดโค้ดซ้ำ)
 * componentFor: รีจิสทรี EvarelComponents ที่ไฟล์หน้าอื่นเขียนลงมาเอง (ไม่ใช่ข้อมูลชั้น m) จึง "คง guard เดิมทุกประการ"
 *   เดิม p.page && w.EvarelComponents ? w.EvarelComponents[p.page] : null  คืน null เงียบ ๆ เมื่อยังไม่มีรีจิสทรีหรือยังไม่ลงทะเบียน
 *   ถาดนี้จึงไม่ตรวจรูปรีจิสทรี (ถ้าตรวจเข้มจะ throw ในกรณีที่เดิมคืน null)
 */
import { tray, T } from '../tray.js';

const sheetFns = tray('sheet', { icon: T.func });

/** icon ตรวจรูปที่ถาด (เดิมไม่มี guard: w.icon ถูกเรียกตรง ๆ) | componentFor คงพฤติกรรมเดิมของรีจิสทรี */
export function takeSheet(src = (typeof window !== 'undefined' ? window : {})) {
  const a = sheetFns.take({ icon: src.icon });
  return Object.assign({}, a, { componentFor: (page) => (page && src.EvarelComponents ? src.EvarelComponents[page] : null) });
}

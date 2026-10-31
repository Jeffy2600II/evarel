/* ชั้นฐาน (ES module จริง): ชิ้นส่วนบริสุทธิ์ของ undo/toast (สำเนาลึกด้วย JSON และโครง HTML ของ toast) ไม่แตะ DOM, ST, S
   ตัดวางจาก m/08-core__undo ตรงตัวอักษร 31 ต.ค. 2026 | โมดูลเดิมห่อ clone = cloneOf และ toast ใช้ toastHTML ตรรกะชุดเดียวไม่มีสองสำเนา */
import { esc } from './dates.js';
/** สำเนาลึก (JSON) — คงลักษณะเดิมทุกจุด: undefined/ฟังก์ชันหาย, Date กลายเป็นสตริง (ผู้เรียกใช้กับข้อมูล items ล้วน) */
export const cloneOf = (x: any) => JSON.parse(JSON.stringify(x));
/** โครง HTML ของ toast: ข้อความ + ปุ่มย้อนกลับเมื่อมี undo (เหมือนเดิมทุกไบต์) */
export const toastHTML = (msg: any, undo: any) => `<span>${esc(msg)}</span>${undo ? '<button data-act="undo">ย้อนกลับ</button>' : ''}`;

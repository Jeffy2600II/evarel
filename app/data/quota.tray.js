/**
 * ถาดข้อมูลของการ์ดโควตา (quota) F3.3-g4: resetClock, resetIn
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) การ์ดโควตารับของจากถาดนี้เท่านั้น
 * ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด: resetIn อ่าน Date.now() และเรียก resetMs ของชั้น m ย้ายเข้า core/ ไม่ได้
 * โดยไม่เปลี่ยนสัญญา (core ตั้งใจเป็นฟังก์ชันบริสุทธิ์ไม่อ่านเวลา) | อ่านตอนเรียก ไม่ใช่ตอน import เพื่อคงลำดับโหลด
 */
import { tray, T } from '../shared/tray.js';

const quotaFns = tray('quota', {
  resetClock: T.func,
  resetIn: T.func,
});

/** อ่านสองฟังก์ชันจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeQuotaFns(src = (typeof window !== 'undefined' ? window : {})) {
  return quotaFns.take({ resetClock: src.resetClock, resetIn: src.resetIn });
}

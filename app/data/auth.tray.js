/**
 * ถาดข้อมูลของหน้าเข้าสู่ระบบ (auth) F3.3-g5: AUTH_SPLASH, AUTH_VIEWS
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) หน้าเข้าสู่ระบบรับของจากถาดนี้เท่านั้น
 * ค่าอ้างอิงเดียวกับชั้น m (ไม่คัดลอก): AUTH_VIEWS เป็นอ็อบเจ็กต์ของฟังก์ชันที่อ่านสถานะฟอร์มตอนเรียก จึงคัดลอกไม่ได้
 * อ่านตอนเรียก ไม่ใช่ตอน import เพื่อคงลำดับโหลด
 */
import { tray, T } from '../shared/tray.js';

const authConsts = tray('auth', {
  AUTH_SPLASH: T.string,
  AUTH_VIEWS: T.any,   // อ็อบเจ็กต์ของฟังก์ชัน key ตามหน้า (login/signup/forgot ฯลฯ) ตรวจรูปรายหน้าตอนใช้
});

/** อ่านสองค่าจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeAuthConsts(src = (typeof window !== 'undefined' ? window : {})) {
  const r = authConsts.take({ AUTH_SPLASH: src.AUTH_SPLASH, AUTH_VIEWS: src.AUTH_VIEWS });
  if (r.AUTH_VIEWS === null || typeof r.AUTH_VIEWS !== 'object') throw new Error('[tray:auth] AUTH_VIEWS ต้องเป็นอ็อบเจ็กต์ของฟังก์ชัน');
  return r;
}

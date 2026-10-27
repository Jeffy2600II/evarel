/**
 * ถาดข้อมูลของแถบนำทาง (nav) กลุ่มค่าคงที่ F3.3-g2: TABS
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) แถบนำทางรับของจากถาดนี้เท่านั้น
 * ค่าอ้างอิงเดียวกับชั้น m (ไม่คัดลอก) | อ่านตอนเรียก ไม่ใช่ตอน import เพื่อไม่เปลี่ยนลำดับโหลด
 */
import { tray, T } from '../shared/tray.js';

const navConsts = tray('nav', {
  TABS: T.arrayOf(T.arrayOf(T.string)),
});

/** อ่านรายการแท็บจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeNavConsts(src = (typeof window !== 'undefined' ? window : {})) {
  return navConsts.take({ TABS: src.TABS });
}

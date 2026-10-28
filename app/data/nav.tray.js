/**
 * ถาดข้อมูลของแถบนำทาง (nav) g2 ค่าคงที่: TABS | g12 เพิ่ม icon (ตัวผลิต SVG ของชั้น m ที่หลายไฟล์ใช้ร่วม ย้ายเข้า core ไม่ได้)
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) แถบนำทางรับของจากถาดนี้เท่านั้น
 * ค่าอ้างอิงเดียวกับชั้น m (ไม่คัดลอก) | อ่านตอนเรียก ไม่ใช่ตอน import เพื่อไม่เปลี่ยนลำดับโหลด
 */
import { tray, T } from '../shared/tray.js';

const navConsts = tray('nav', {
  TABS: T.arrayOf(T.arrayOf(T.string)),
  icon: T.func,
});

/** อ่านรายการแท็บจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeNavConsts(src = (typeof window !== 'undefined' ? window : {})) {
  return navConsts.take({ TABS: src.TABS, icon: src.icon });
}

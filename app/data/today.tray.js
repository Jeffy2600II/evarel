/**
 * ถาดข้อมูลของหน้าวันนี้ (today) ส่วนฟังก์ชันหน้าจอ F3.3-g6: empty
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) | ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด
 * empty บริสุทธิ์ (รับไอคอน หัวข้อ คำอธิบาย) แต่เรียก icon() ที่ 8 ไฟล์ใช้ร่วม จึงยังไม่ย้ายเข้า core/ ในกลุ่มนี้
 * ตัวช่วยวันที่ของหน้านี้อยู่ที่ถาดวันที่ร่วม dates.tray.js แล้ว (F3.3-g3)
 */
import { tray, T } from '../shared/tray.js';

const todayFns = tray('today', {
  empty: T.func,
});

/** อ่านฟังก์ชันจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeTodayFns(src = (typeof window !== 'undefined' ? window : {})) {
  return todayFns.take({ empty: src.empty });
}

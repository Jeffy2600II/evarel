/**
 * ถาดข้อมูลของหน้าปฏิทิน (calendar) F3.3-g6: agendaHTML
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) หน้าปฏิทินรับของจากถาดนี้เท่านั้น
 * ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด: agendaHTML อ่านรายการจริงของผู้ใช้ผ่าน onDate/itemRow/dayLab ย้ายเข้า core/ ไม่ได้
 * อ่านตอนเรียก ไม่ใช่ตอน import เพื่อคงลำดับโหลด
 */
import { tray, T } from '../shared/tray.js';

const calendarFns = tray('calendar', {
  agendaHTML: T.func,
});

/** อ่านฟังก์ชันจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeCalendarFns(src = (typeof window !== 'undefined' ? window : {})) {
  return calendarFns.take({ agendaHTML: src.agendaHTML });
}

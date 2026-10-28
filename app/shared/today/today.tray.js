/**
 * ถาดข้อมูลของหน้าวันนี้ (today) | ไฟล์นี้เป็นที่เดียวของกล่อง today ที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray)
 * F3.3-g6: empty | F6: ย้ายเข้ากล่อง shared/today และเพิ่ม takeItemRow (แถวรายการจาก item-row)
 * ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด | empty บริสุทธิ์ (รับไอคอน หัวข้อ คำอธิบาย) แต่เรียก icon() ที่ 8 ไฟล์ใช้ร่วม จึงยังไม่ย้ายเข้า core/
 * ตัวช่วยวันที่ของหน้านี้อยู่ที่ถาดวันที่ร่วม app/data/dates.tray.js (ใช้ร่วมกับ calendar/sheet/nav ไม่ย้ายเข้ากล่องนี้)
 */
import { tray, T } from '../tray.js';

const todayFns = tray('today', {
  empty: T.func,
});

/** อ่านฟังก์ชันจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeTodayFns(src = (typeof window !== 'undefined' ? window : {})) {
  return todayFns.take({ empty: src.empty });
}

/**
 * คอมโพเนนต์แถวรายการ (EvarelComponents.itemRow จากกล่อง item-row) | อ่านตอนเรียกใช้ ไม่ใช่ตอน import
 * เหตุผล: เดิมหน้านี้ใช้ ItemRow = () => window.EvarelComponents.itemRow คือเลื่อนการอ่านไปตอนเรนเดอร์ เพราะ item-row โหลดก่อน today
 * แต่ผู้ใช้ต้องไม่เห็นผลต่าง และถ้า item-row ยังไม่ลงทะเบียน (undefined) เดิมจะพังตอนเรนเดอร์ จึงคงพฤติกรรมเดิม ไม่ดักเงียบ
 */
export function takeItemRow(src = (typeof window !== 'undefined' ? window : {})) {
  const C = src.EvarelComponents;
  return C && C.itemRow;
}

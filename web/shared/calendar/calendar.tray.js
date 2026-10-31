/**
 * ถาดข้อมูลของหน้าปฏิทิน (calendar) F3.3-g6: agendaHTML
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) หน้าปฏิทินรับของจากถาดนี้เท่านั้น
 * ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด: agendaHTML อ่านรายการจริงของผู้ใช้ผ่าน onDate/itemRow/dayLab ย้ายเข้า core/ ไม่ได้
 * อ่านตอนเรียก ไม่ใช่ตอน import เพื่อคงลำดับโหลด
 */
import { tray, T } from '../tray.js';

const calendarFns = tray('calendar', {
  agendaHTML: T.func,
});

/** อ่านฟังก์ชันจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeCalendarFns(src = (typeof window !== 'undefined' ? window : {})) {
  return calendarFns.take({ agendaHTML: src.agendaHTML });
}

/**
 * F3.3-g20: วงจรชีวิตของ FullCalendar (mountMain / destroyCal) | ตัวคุมที่อ่านสดทุกครั้งที่เรียก ห้ามเก็บฟังก์ชันไว้ข้ามการเรียก
 * เหตุผล: เดิม CalendarLive เช็ก typeof window.mountMain ตอน mount และ typeof window.destroyCal ตอน cleanup (คนละเวลา)
 * ชั้น m กำหนด destroyCal ใหม่ได้หลังโหลด จึงต้องอ่านตอนเรียกจริงทั้งสองครั้ง | ไม่คัดลอกโค้ด ครอบฟังก์ชันของชั้น m ตัวเดียว
 * mount() คืน true เมื่อ mountMain เป็นฟังก์ชันและถูกเรียกแล้ว คืน false เมื่อไม่ใช่ (ผู้เรียกข้ามเงียบ ไม่คืน cleanup เหมือนเดิม)
 * destroy(key) เรียก destroyCal(key) เฉพาะเมื่อเป็นฟังก์ชัน ณ ตอนนั้น | ไม่ใช้ tray.take เพราะต้องยอมให้ไม่มีฟังก์ชัน (เดิมเงียบ) ถาด take จะโยนข้อผิดพลาด
 */
export function takeCalendarLifecycle(src = (typeof window !== 'undefined' ? window : {})) {
  return {
    mount() { if (typeof src.mountMain !== 'function') return false; src.mountMain(); return true; },
    destroy(key) { if (typeof src.destroyCal === 'function') src.destroyCal(key); },
  };
}

/**
 * F6: useEffect ของ React ส่งมาจากถาด เพราะบิลด์ฉีดให้กล่องแค่ h/Fragment และกล่องห้ามอ่าน window เอง (BOX-05)
 * ค่าอ้างอิงเดียวกับ window.EvarelReact.useEffect (ไม่คัดลอก) อ่านตอนเรียก ไม่ใช่ตอน import เพื่อคงลำดับโหลด
 */
export function takeReactEffect(src = (typeof window !== 'undefined' ? window : {})) {
  const R = src.EvarelReact;
  if (!R || typeof R.useEffect !== 'function') throw new Error('tray(calendar): EvarelReact.useEffect ต้องเป็นฟังก์ชัน');
  return R.useEffect;
}

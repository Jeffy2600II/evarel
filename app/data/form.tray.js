/**
 * ถาดข้อมูลของหน้าฟอร์ม (form)
 * g1 ค่าคงที่: UNIT_TH, REM_PRESETS, TRACK_OPTS, WEEK_OPTS | g8 ส่วนที่สอง: TYPE_INFO (ข้อมูล) และ remSum repSum rangeSum notifyIssue (ฟังก์ชันที่อ่านฟอร์มที่กำลังกรอก ST.D ของชั้น m)
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) หน้าฟอร์มรับของจากถาดนี้เท่านั้น
 * ค่าอ้างอิงเดียวกับชั้น m (ไม่คัดลอก) เพื่อไม่ให้ค่าเพี้ยนกันสองสำเนา | อ่านครั้งแรกที่เรียก ไม่ใช่ตอน import
 * (ไฟล์หน้าถูกโหลดก่อนชั้น m ตั้ง window ครบไหมไม่แน่ จึงอ่านล่าช้าเพื่อไม่เปลี่ยนลำดับโหลด)
 */
import { tray, T } from '../shared/tray.js';

const formConsts = tray('form', {
  UNIT_TH: T.shape({ day: T.string, week: T.string, month: T.string }),
  REM_PRESETS: T.arrayOf(T.number),
  TRACK_OPTS: T.arrayOf(T.arrayOf(T.string)),
  WEEK_OPTS: T.arrayOf(T.arrayOf(T.any)),
});

/** อ่านค่าคงที่ของฟอร์มจากชั้น m หนึ่งครั้งต่อการเรียก ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก) */
export function takeFormConsts(src = (typeof window !== 'undefined' ? window : {})) {
  return formConsts.take({ UNIT_TH: src.UNIT_TH, REM_PRESETS: src.REM_PRESETS, TRACK_OPTS: src.TRACK_OPTS, WEEK_OPTS: src.WEEK_OPTS });
}

const formFns = tray('form', {
  TYPE_INFO: T.any,   // อ็อบเจ็กต์ key ตามประเภท -> [ไอคอน, คำอธิบาย]
  remSum: T.func, repSum: T.func, rangeSum: T.func, notifyIssue: T.func,
});

/**
 * F3.3-g8: อ่าน TYPE_INFO และสี่ฟังก์ชันสรุปของฟอร์มจากชั้น m ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม (ไม่คัดลอก)
 * สี่ฟังก์ชันอ่าน ST.D และ TODAY ของชั้น m ตอนเรียก ย้ายเข้า core/ ไม่ได้โดยไม่เปลี่ยนสัญญา จึงเป็นการย้ายจุดอ่าน ไม่ใช่การถอด window
 */
export function takeFormFns(src = (typeof window !== 'undefined' ? window : {})) {
  return formFns.take({ TYPE_INFO: src.TYPE_INFO, remSum: src.remSum, repSum: src.repSum, rangeSum: src.rangeSum, notifyIssue: src.notifyIssue });
}

const formIcon = tray('form', { icon: T.func });

/**
 * F3.3-g13a: icon (ตัวผลิต SVG ของชั้น m) ที่ฟอร์มเรียก 4 จุด | ไม่มีใน core/ จึงผ่านถาด | อ่านตอนเรียก ไม่ใช่ตอน import
 * เดิมไม่มี guard (w.icon ถูกเรียกตรง ๆ) ถาดตรวจแค่ว่าเป็นฟังก์ชัน
 */
export function takeFormIcon(src = (typeof window !== 'undefined' ? window : {})) {
  return formIcon.take({ icon: src.icon });
}

const formDraft = tray('form', { ST: T.any });

/**
 * F3.3-g15: ฟอร์มที่กำลังกรอก (ST.D ของชั้น m) | อ่านสดทุกครั้งที่เรียก ห้ามเก็บค่าไว้
 * เหตุผล: ชั้น m กำหนด ST.D ใหม่ได้ (openForm, dtype ทำ ST.D = ...) การจำค่าไว้ครั้งเดียวจะอ่านร่างเก่า
 * คืนค่าอ้างอิงเดิมของ ST.D (ไม่คัดลอก) เพื่อให้ผู้เรียกเห็นการแก้ภายในอ็อบเจ็กต์เหมือนเดิม
 * เดิมไม่มี guard (w.ST.D ถูกอ่านตรง ๆ แล้วพังถ้า ST ยังไม่มี) ถาดตรวจแค่ว่า ST มีอยู่
 */
export function takeFormDraft(src = (typeof window !== 'undefined' ? window : {})) {
  return formDraft.take({ ST: src.ST }).ST.D;
}

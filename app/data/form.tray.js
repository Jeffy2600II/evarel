/**
 * ถาดข้อมูลของหน้าฟอร์ม (form) กลุ่มค่าคงที่ F3.3-g1: UNIT_TH, REM_PRESETS, TRACK_OPTS, WEEK_OPTS
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

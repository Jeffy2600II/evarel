/**
 * ถาดข้อมูลของหน้ารายละเอียด (detail) F3.3-g7
 * ส่วนที่ 1 (ถอด window จริง): ตรรกะบริสุทธิ์ import จาก core/ ตรง ๆ ไม่อ่าน window
 *   ymd addDays fmtDate TH_MONTH occursOn isDone skipped scheduled streak totalDone remText repeatText timeText TYPES
 *   พิสูจน์แล้ว (tests/prove_schedule_core_equal.mjs ในเบราว์เซอร์จริง 951 กรณี ตรงกับสำเนาชั้น m ทุกกรณี และฉีดความผิดแล้วตก 37)
 * ส่วนที่ 2 (ย้ายจุดอ่านเข้าถาด ยังไม่ใช่การถอด window): ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด
 *   icon seg (ผลิต HTML ที่หลายไฟล์ใช้ร่วม) dayLab (ลายเซ็นต่างจาก core) find (ค้นรายการจริง) UI (สถานะปฏิทินที่ผู้ใช้กด) TODAY (ผูกเวลาโหลด)
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05) | ส่วนที่ 2 อ่านตอนเรียก ไม่ใช่ตอน import เพื่อคงลำดับโหลด
 */
import { tray, T } from '../tray.js';
import { ymd, addDays, fmtDate, TH_MONTH } from '../../src/core/dates';
import { occursOn, isDone, skipped, scheduled, streak, remText, repeatText, timeText, TYPES } from '../../src/core/schedule';
import { totalDone } from '../../src/core/stats';

const fromCore = tray('detail', {
  ymd: T.func, addDays: T.func, fmtDate: T.func, TH_MONTH: T.arrayOf(T.string),
  occursOn: T.func, isDone: T.func, skipped: T.func, scheduled: T.func, streak: T.func, totalDone: T.func,
  remText: T.func, repeatText: T.func, timeText: T.func, TYPES: T.any,
});
const fromM = tray('detail', {
  icon: T.func, seg: T.func, dayLab: T.func, find: T.func, UI: T.any, TODAY: T.string,
});

/** รวมสองส่วนเป็นอ็อบเจ็กต์เดียว: ส่วน core ไม่แตะ window | ส่วนชั้น m อ่านตอนเรียก ตรวจรูปที่ถาด */
export function takeDetail(src = (typeof window !== 'undefined' ? window : {})) {
  const a = fromCore.take({ ymd, addDays, fmtDate, TH_MONTH, occursOn, isDone, skipped, scheduled, streak, totalDone, remText, repeatText, timeText, TYPES });
  const b = fromM.take({ icon: src.icon, seg: src.seg, dayLab: src.dayLab, find: src.find, UI: src.UI, TODAY: src.TODAY });
  return Object.assign({}, a, b);
}

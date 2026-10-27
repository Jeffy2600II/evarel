/**
 * ถาดข้อมูลของแถวรายการ (item-row) F3.3-g9
 * ส่วนที่ 1 (ถอด window จริง): ตรรกะบริสุทธิ์ import จาก core/ ตรง ๆ ไม่อ่าน window
 *   val target tracked isDone skipped fmtDate timeText esc  (พิสูจน์ใน tests/prove_itemrow_core_equal.mjs 190 กรณี ตรงกับสำเนาชั้น m)
 * ส่วนที่ 2 isFuture: core รับ today เป็นพารามิเตอร์ ต่างจากชั้น m ที่อ่าน TODAY ในโมดูล ถ้าเรียก core.isFuture(ds) โดยไม่ส่ง today
 *   วันอนาคตจะถูกมองว่าไม่ใช่อนาคตทุกวัน (พิสูจน์แล้ว) จึงห่อให้ส่ง TODAY ของชั้น m ให้เองทุกครั้ง
 * ส่วนที่ 3 (ย้ายจุดอ่านเข้าถาด ยังไม่ใช่การถอด window): ครอบสำเนาของชั้น m ตัวเดียว icon (ตัวผลิต SVG ที่หลายไฟล์ใช้ร่วม) UI (สถานะ pop ที่ผู้ใช้เพิ่งกด) TODAY
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05) | อ่านตอนเรียก ไม่ใช่ตอน import เพื่อคงลำดับโหลด และ TODAY/UI ต้องสดทุกครั้ง (ไม่แคช)
 */
import { tray, T } from '../shared/tray.js';
import { fmtDate, esc } from '../src/core/dates';
import { val, target, tracked, isDone, skipped, isFuture as coreIsFuture, timeText } from '../src/core/schedule';

const fromCore = tray('item-row', {
  val: T.func, target: T.func, tracked: T.func, isDone: T.func, skipped: T.func, fmtDate: T.func, timeText: T.func, esc: T.func,
});
const fromM = tray('item-row', { icon: T.func, UI: T.any, TODAY: T.string });

/** รวมสามส่วนเป็นอ็อบเจ็กต์เดียว อ่านสดทุกครั้งที่เรียก (TODAY และ UI ห้ามแคช) */
export function takeItemRow(src = (typeof window !== 'undefined' ? window : {})) {
  const a = fromCore.take({ val, target, tracked, isDone, skipped, fmtDate, timeText, esc });
  const b = fromM.take({ icon: src.icon, UI: src.UI, TODAY: src.TODAY });
  return Object.assign({}, a, b, { isFuture: (ds) => coreIsFuture(ds, b.TODAY) });
}

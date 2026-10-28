/**
 * ถาดวันที่ร่วม (dates) F3.3-g3: WD, TH_MONTH, pad, fmtDate | g12 เพิ่ม esc และ dayLabFor(today)
 * แหล่งเดียวคือ core/dates (ES module บริสุทธิ์ ไม่อ่าน window ไม่อ่านเวลาจริง) | หน้าจอรับของจากถาดนี้เท่านั้น
 * พิสูจน์แล้ว (tests/_cmp_dates.mjs ในเบราว์เซอร์จริง) ว่าตรงกับสำเนาของชั้น m ทุกบิตสำหรับชุดนี้
 * g12: dayLab ของ core รับ (ds, today) ต่างจากชั้น m ที่อ่าน TODAY เอง จึงให้ dayLabFor(today) คืนฟังก์ชันรับ ds ตัวเดียวเหมือนเดิม
 *   พิสูจน์ใน tests/prove_daylab_core_equal.mjs (15 กรณีตรงกัน และถ้าลืมส่ง today วัน "วันนี้" จะเพี้ยนเงียบๆ)
 */
import { tray, T } from '../shared/tray.js';
import { WD, TH_MONTH, pad, fmtDate, esc, dayLab } from '../src/core/dates';

const datesTray = tray('dates', {
  WD: T.arrayOf(T.string),
  TH_MONTH: T.arrayOf(T.string),
  pad: T.func,
  fmtDate: T.func,
  esc: T.func,
  dayLab: T.func,
});

/** คืนชุดตัวช่วยวันที่จาก core ตรวจรูปที่ถาด (ค่าอ้างอิงเดิม ไม่คัดลอก) */
export function takeDates() {
  const t = datesTray.take({ WD, TH_MONTH, pad, fmtDate, esc, dayLab });
  return Object.assign({}, t, { dayLabFor: (today) => (ds) => t.dayLab(ds, today) });
}

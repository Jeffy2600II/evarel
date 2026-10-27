/**
 * ถาดวันที่ร่วม (dates) F3.3-g3: WD, TH_MONTH, pad, fmtDate
 * แหล่งเดียวคือ core/dates (ES module บริสุทธิ์ ไม่อ่าน window ไม่อ่านเวลาจริง) | หน้าจอรับของจากถาดนี้เท่านั้น
 * พิสูจน์แล้ว (tests/_cmp_dates.mjs ในเบราว์เซอร์จริง) ว่าตรงกับสำเนาของชั้น m ทุกบิตสำหรับชุดนี้
 * ไม่รวม dayLab/TODAY: dayLab ของ core รับ 2 พารามิเตอร์ (ds, today) ต่างจากชั้น m ที่อ่าน TODAY เอง จึงยังไม่ย้าย
 */
import { tray, T } from '../shared/tray.js';
import { WD, TH_MONTH, pad, fmtDate } from '../src/core/dates';

const datesTray = tray('dates', {
  WD: T.arrayOf(T.string),
  TH_MONTH: T.arrayOf(T.string),
  pad: T.func,
  fmtDate: T.func,
});

/** คืนชุดตัวช่วยวันที่จาก core ตรวจรูปที่ถาด (ค่าอ้างอิงเดิม ไม่คัดลอก) */
export function takeDates() {
  return datesTray.take({ WD, TH_MONTH, pad, fmtDate });
}

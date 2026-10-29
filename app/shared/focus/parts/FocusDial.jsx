/**
 * หน้าปัดจับเวลา: วงกลมความคืบหน้า ตัวเลขนาฬิกา และข้อความสถานะ | โครง DOM ตรงไฟล์เดิมทุกไบต์ (style --p เป็นสตริงของเปอร์เซ็นต์)
 */
import { fmtClock } from '../../../src/core/dates.ts';

export function FocusDial({ run, mine, pct, ms }) {
  return h('div', { className: 'ev-dial', id: 'dial', 'data-run': String(run), style: { '--p': String(pct) } },
    h('div', { key: 'face', className: 'ev-dial-face' }, [
      h('div', { key: 'dg', className: 'ev-digits', id: 'digits' }, fmtClock(ms)),
      h('span', { key: 'st', className: 'ev-sub' }, !mine ? 'พร้อมเริ่ม' : run ? 'กำลังจับเวลา' : 'หยุดชั่วคราว'),
    ]));
}

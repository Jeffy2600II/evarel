/**
 * หน้า "วันนี้" ของ Evarel (ชั้นที่ 1 ของกล่อง today โซน shared เพราะ mount ผ่าน EvarelMount.mountAt)
 * ลงทะเบียนสองรูป: Pages.today = TodayMain (สตริง ห่อ <main> ตาม template เดิม) | Components.today = TodayContent (เนื้อข้างใน main ล้วน กัน main ซ้อนสองชั้น)
 * คำนวณทั้งหมดจาก core/today.buildTodayProps (รับ items/ui/today/now ดิบ ไม่อ่าน global เอง) | ข้อมูลที่ต้องอ่านจากชั้นอื่นมาจากถาดเท่านั้น (กล่องนี้ไม่แตะ window)
 * children ต้องตรง template เดิมทุกไบต์ รวม '\n  ' ระหว่าง section (ต้นฉบับจัด indent ใน template) React พิมพ์ text child ตรงๆ และข้าม null
 * h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { buildTodayProps } from '../../src/core/today';
import { takeDates } from '../../data/dates.tray.js';
import { takeTodayFns, takeItemRow } from './today.tray.js';
import { TodaySummary } from './parts/TodaySummary.jsx';
import { TodayOverdue, TodayGroups } from './parts/TodayLists.jsx';

/* เนื้อข้างใน main ล้วน — Components.today ใช้ตัวนี้เพราะ mount target คือ <main> ที่ VIEWS สร้างแล้ว */
export function TodayContent(p) {
  const { items, ui, today, now } = p;
  const dates = takeDates();
  const P = buildTodayProps(items, ui, today, now, {
    fmtDate: dates.fmtDate, dayLab: dates.dayLabFor(today), WD: dates.WD, TH_MONTH: dates.TH_MONTH, pad: dates.pad, hello: () => '',
  });
  const ItemRow = takeItemRow();
  return h(Fragment, null, [
    h(TodaySummary, { key: 'sum', P, dates }),
    '\n  ',
    h(TodayOverdue, { key: 'od', P, ui, ItemRow }),
    '\n  ',
    h(TodayGroups, { key: 'g', P, ui, ItemRow, emptyHTML: () => takeTodayFns().empty('inbox', 'วันนี้ยังว่างอยู่', 'กดปุ่ม + เพื่อเพิ่มสิ่งที่อยากทำ') }),
  ]);
}

/* เส้นทางสตริง: ห่อ <main> ตาม template เดิม (เส้นทาง mount ไม่ใช้ตัวนี้) */
export function TodayMain(p) {
  return h('main', { key: 'main', className: 'ev-main', id: 'main' }, h(TodayContent, { key: 'content', ...p }));
}

export default TodayMain;

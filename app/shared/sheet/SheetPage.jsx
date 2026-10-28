/**
 * กระดาษเลื่อนขึ้น (sheet) ของ Evarel: โครงเปลือก grab + หัวเรื่อง + ตัวเนื้อ + ท้าย (ชั้นที่ 1 ของกล่อง sheet โซน shared เพราะหลายหน้าเปิดใช้)
 * เทียบ template setSheet เดิมใน 09-ui__layers ทุกไบต์ | ข้อมูลมาจากถาด sheet.tray.js กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้
 * ลงทะเบียนสองชื่อจากบัตร BOX.md: pages.sheet (สตริง ใช้ตอน mount) และ components.sheet (React ให้ฟอร์มซ้อนใช้)
 */
import { SheetGrab, SheetHead } from './parts/SheetHead.jsx';
import { SheetBody, SheetFoot } from './parts/SheetBody.jsx';
import { takeSheet } from './sheet.tray.js';

export default function SheetPage(p) {
  const S = takeSheet();
  return h(Fragment, null, [
    SheetGrab(),
    SheetHead({ back: p.back, title: p.title, icon: S.icon }),
    h(SheetBody, { key: 'body', page: p.page, props: p.props, html: p.html, componentFor: S.componentFor }),
    SheetFoot({ foot: p.foot }),
  ]);
}

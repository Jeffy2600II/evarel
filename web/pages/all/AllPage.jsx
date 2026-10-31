/**
 * หน้า "ทั้งหมด" ของ Evarel (ชั้นที่ 1 ของกล่อง all) ผลิตเฉพาะ <main> ให้ VIEWS.all ส่งกลับเป็น string
 * ชิ้นส่วนใน parts/ ถูกเรียกเป็นฟังก์ชัน (ไม่ใช่ component) เพื่อไม่ให้เกิดชั้น element เพิ่มที่ทำให้ HTML ต่างจากเดิม
 * ข้อมูลมาจาก prepare (ถาด all.tray.js) กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { AllSectionHead } from './parts/AllSectionHead.jsx';
import { AllRow } from './parts/AllRow.jsx';
import { prepareAll } from './all.tray.js';

export default function AllPage(p) {
  const { sections } = p;
  return h(Fragment, null, h('main', { className: 'ev-main' }, sections.map((s) =>
    h('section', { key: s.key, className: 'ev-card' },
      AllSectionHead({ s }),
      h('ul', null, s.rows.map((r) => AllRow({ r })))))));
}

export const prepare = prepareAll;

/**
 * แถบนำทางล่างของ Evarel (ชั้นที่ 1 ของกล่อง nav โซน shared เพราะหลายไฟล์เรียกใช้): ปุ่มแท็บ 4 อัน + ปุ่ม + ตรงกลาง
 * mount ที่ #nav โดยตรงผ่าน EvarelMount.mountAt จึงลงทะเบียนทั้งฟังก์ชันหน้า (สตริง) และ component | ไม่มีชั้นห่อ element เพิ่ม
 * ข้อมูลมาจากถาด nav.tray.js กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { NavTab } from './parts/NavTab.jsx';
import { NavAdd } from './parts/NavAdd.jsx';
import { takeNavConsts } from './nav.tray.js';

export default function NavPage(p) {
  const N = takeNavConsts();
  /* โครงเดิม: TABS.map -> li/button(data-tab + aria-current ถ้าแท็บปัจจุบัน) แล้วแทรกปุ่ม + กลางลำดับ 2 */
  const items = [];
  N.TABS.forEach(([id, l, ic], k) => {
    if (k === 2) items.push(NavAdd({ icon: N.icon }));
    items.push(NavTab({ id, label: l, ic, current: p.tab === id, icon: N.icon }));
  });
  return h(Fragment, null, items);
}

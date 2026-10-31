/**
 * หน้ารายละเอียดรายการของ Evarel (ชั้นที่ 1 ของกล่อง detail โซน shared เพราะ mount ผ่าน EvarelMount.mountAt)
 * page bar + เนื้อตามประเภท (habit ปฏิทินเดือน / task / event+class) + การ์ดตั้งค่า | ปุ่มทุกปุ่มใช้ data-act delegation ของ 25-actions เหมือนเดิม
 * ต้นฉบับไม่ห่อ <main> (VIEWS ห่อเอง) จึงลงทะเบียนฟังก์ชันเดียวกันทั้ง Pages.detail (สตริง) และ Components.detail (mount) ตามบัตร register
 * ข้อมูลทั้งหมดมาจากถาด detail.tray.js ที่เดียว กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { takeDetail } from './detail.tray.js';
import { HabitCard } from './parts/HabitCard.jsx';
import { TaskCard } from './parts/TaskCard.jsx';
import { ScheduleCard } from './parts/ScheduleCard.jsx';
import { MetaCard } from './parts/MetaCard.jsx';
const raw = (html) => ({ __html: html });

export function DetailContent(p) {
  const D = takeDetail();
  const it = D.find(p.id);
  if (!it) return null;
  const body = it.type === 'habit' ? h(HabitCard, { key: 'hb', it }) : it.type === 'task' ? h(TaskCard, { key: 'tk', it }) : h(ScheduleCard, { key: 'sc', it });
  return [
    h('div', { key: 'bar', className: 'ev-page-bar' }, [
      h('button', { key: 'b', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'กลับ', dangerouslySetInnerHTML: raw(D.icon('back')) }),
      h('h2', { key: 't' }, it.title),
      h('button', { key: 'm', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'd-more', 'data-id': String(it.id), 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'ตัวเลือก', dangerouslySetInnerHTML: raw(D.icon('more')) }),
    ]),
    h('div', { key: 'sc', className: 'ev-page-scroll' }, [body, h(MetaCard, { key: 'mc', it })]),
  ];
}

export default DetailContent;

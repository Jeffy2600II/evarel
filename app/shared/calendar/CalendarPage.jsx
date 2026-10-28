/**
 * หน้าปฏิทินของ Evarel (ชั้นที่ 1 ของกล่อง calendar โซน shared เพราะ mount ผ่าน EvarelMount.mountAt)
 * ลงทะเบียนสองรูป: Pages.calendar = CalendarMain (สตริง ห่อ <main> ตาม template เดิม) | Components.calendar = CalendarLive (mount FullCalendar ใน effect)
 * ข้อมูลและวงจรชีวิตทั้งหมดมาจากถาด calendar.tray.js ที่เดียว กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { takeCalendarFns, takeCalendarLifecycle, takeReactEffect } from './calendar.tray.js';
import { calendarBody } from './parts/CalendarBody.jsx';

/* เนื้อข้างใน main ล้วน */
function CalendarContent(p) {
  return calendarBody(p.calView === 'dayGridMonth', () => takeCalendarFns().agendaHTML(p.calSel));
}

/* เส้นทางสตริง: ห่อ <main> ตาม template เดิม (เส้นทาง mount ไม่ใช้ตัวนี้) */
export function CalendarMain(p) {
  return h('main', { key: 'main', className: 'ev-main' }, h(CalendarContent, { key: 'content', ...p }));
}

/* FullCalendar mount ใน effect และ destroy ตอนออก | คืนเนื้อล้วนกัน main ซ้อน */
export function CalendarLive(p) {
  takeReactEffect()(() => {
    const L = takeCalendarLifecycle();
    if (!L.mount()) return;
    return () => L.destroy('main');
  }, []);
  return h(CalendarContent, p);
}

export default CalendarMain;

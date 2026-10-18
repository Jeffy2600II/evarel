// หน้าปฏิทินของ Evarel เขียนเป็น React (S4 s4f-route-today-calendar ครึ่งหลัง)
// ผลิตเฉพาะ <main> ให้ VIEWS.calendar ส่งกลับเป็น string (แพทเทิร์นเดียวกับ today/stats: header กับ ev-cal-top/seg โค้ดเดิมต่อ string เอง)
// FullCalendar ยัง mount โดย render() หลัง innerHTML แบบเดิม (mount ใน useEffect คือหน่วยถัดไป) — React แค่ผลิต div#fcMain เปล่าเหมือนเดิม
// agenda ฝังผล agendaHTML เดิมตรงๆ (dangerouslySetInnerHTML) เพื่อผลตรงเดิมทุกไบต์
const { h, useEffect, Fragment } = window.EvarelReact;
const W = () => window;

function CalendarMain(p) {
  /* string path: ห่อ <main> ตาม template เดิม (mount path ไม่ใช้ตัวนี้) */
  return h('main', { key: 'main', className: 'ev-main' }, h(CalendarContent, { key: 'content', ...p }));
}
/* เนื้อข้างใน main ล้วน — mount target คือ <main> ที่ VIEWS สร้างแล้ว (กัน main ซ้อนสองชั้น) */
function CalendarContent(p) {
  const w = W();
  const isM = p.calView === 'dayGridMonth';
  return h(Fragment, null, [
    h('section', { key: 'fc', className: 'ev-card ev-fc-wrap' }, h('div', { id: 'fcMain' })),
    h('div', { key: 'agenda', id: 'agenda', dangerouslySetInnerHTML: { __html: isM ? w.agendaHTML(p.calSel) : '' } }),
  ]);
}
window.EvarelPages = window.EvarelPages || {};
/* FullCalendar mount ใน effect และ destroy ตอนออก (เป้าหมายของ task): mountMain อ่าน UI ทุกค่าเอง เรียกผ่าน window */
function CalendarLive(p) {
  useEffect(() => {
    if (typeof window.mountMain !== 'function') return;
    window.mountMain();
    return () => { if (typeof window.destroyCal === 'function') window.destroyCal('main'); };
  }, []);
  return h(CalendarContent, p); /* mount target คือ main ที่ VIEWS สร้าง คืนเนื้อล้วนกันซ้อน */
}
window.EvarelPages.calendar = (p) => window.EvarelReact.renderToStaticMarkup(h(CalendarMain, p));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.calendar = CalendarLive; // CalendarLive คืน CalendarMain ผ่าน CalendarContent ข้างใน

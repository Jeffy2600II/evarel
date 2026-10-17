// หน้าปฏิทินของ Evarel เขียนเป็น React (S4 s4f-route-today-calendar ครึ่งหลัง)
// ผลิตเฉพาะ <main> ให้ VIEWS.calendar ส่งกลับเป็น string (แพทเทิร์นเดียวกับ today/stats: header กับ ev-cal-top/seg โค้ดเดิมต่อ string เอง)
// FullCalendar ยัง mount โดย render() หลัง innerHTML แบบเดิม (mount ใน useEffect คือหน่วยถัดไป) — React แค่ผลิต div#fcMain เปล่าเหมือนเดิม
// agenda ฝังผล agendaHTML เดิมตรงๆ (dangerouslySetInnerHTML) เพื่อผลตรงเดิมทุกไบต์
const { h } = window.EvarelReact;
const W = () => window;

function CalendarMain(p) {
  const w = W();
  const isM = p.calView === 'dayGridMonth';
  return h('main', { key: 'main', className: 'ev-main' }, [
    h('section', { key: 'fc', className: 'ev-card ev-fc-wrap' }, h('div', { id: 'fcMain' })),
    h('div', { key: 'agenda', id: 'agenda', dangerouslySetInnerHTML: { __html: isM ? w.agendaHTML(p.calSel) : '' } }),
  ]);
}
window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.calendar = (p) => window.EvarelReact.renderToStaticMarkup(h(CalendarMain, p));

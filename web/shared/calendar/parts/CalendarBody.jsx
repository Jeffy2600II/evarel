/**
 * เนื้อข้างในหน้าปฏิทิน (ชิ้นส่วนของ calendar): การ์ด FullCalendar (div#fcMain เปล่า) + agenda
 * FullCalendar ยัง mount โดยชั้น m หลัง innerHTML แบบเดิม | agenda ฝังผล agendaHTML เดิมตรงๆ เพื่อผลตรงเดิมทุกไบต์
 * คืน Fragment ล้วน ไม่ห่อ main เพื่อกัน main ซ้อนสองชั้น (mount target คือ <main> ที่ VIEWS สร้างแล้ว)
 */
export function calendarBody(isMonth, agendaHtml) {
  return h(Fragment, null, [
    h('section', { key: 'fc', className: 'ev-card ev-fc-wrap' }, h('div', { id: 'fcMain' })),
    h('div', { key: 'agenda', id: 'agenda', dangerouslySetInnerHTML: { __html: isMonth ? agendaHtml() : '' } }),
  ]);
}

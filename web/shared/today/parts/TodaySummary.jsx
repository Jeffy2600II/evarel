/**
 * การ์ดสรุปของหน้าวันนี้: ตัวเลขทำแล้ว แถบเปอร์เซ็นต์ และรายการถัดไป | โครง DOM และลำดับ attribute ตรงไฟล์เดิมทุกไบต์
 * รับของทุกอย่างเป็น props (P จาก buildTodayProps และตัวช่วยวันที่ dates) ไม่อ่าน window
 */
export function TodaySummary({ P, dates }) {
  return h('section', { key: 'sum', className: 'ev-card ev-sum', 'data-tone': 'ink' }, [
    h('div', { key: 'top', className: 'ev-sum-top' }, [
      h('div', { key: 'l' }, [
        h('div', { key: 'num', className: 'ev-sum-num' }, h('span', { 'data-count': String(P.done) }, '0'), h('small', null, `/${P.trackedTotal}`)),
        h('div', { key: 'lab', className: 'ev-sum-lab' }, P.trackedTotal ? (P.done === P.trackedTotal ? 'ครบทุกอย่างแล้ว' : 'ทำแล้ววันนี้') : 'วันนี้ไม่มีสิ่งต้องติ๊ก'),
      ]),
      h('div', { key: 'r', className: 'ev-sum-lab' }, `${P.pct}%`),
    ]),
    h('div', { key: 'prog', className: 'ev-prog' }, h('i', { 'data-k': 'p-today', 'data-to': String(P.pct) })),
    P.nextItem ? h('div', { key: 'nx', className: 'ev-next' }, h('span', { className: 'ev-chip' }, 'ถัดไป'), `${P.nextItem.time} · ${dates.esc(P.nextItem.title)}`) : null,
  ]);
}

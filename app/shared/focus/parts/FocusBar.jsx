/**
 * แถบบนของหน้าจับเวลา: ปุ่มกลับ หัวข้อ และปุ่มยกเลิก (แสดงเมื่อเป็นตัวจับเวลาของรายการนี้) | โครง DOM ตรงไฟล์เดิมทุกไบต์
 */
export function FocusBar({ F, mine }) {
  return h('div', { className: 'ev-page-bar' }, [
    h('button', { key: 'bk', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'กลับ', dangerouslySetInnerHTML: { __html: F.icon('back') } }),
    h('h2', { key: 'h' }, 'จับเวลา'),
    ...(mine ? [h('button', { key: 'cx', className: 'ev-btn-danger ev-btn-sm', 'data-act': 'tcancel' }, 'ยกเลิก')] : []),
  ]);
}

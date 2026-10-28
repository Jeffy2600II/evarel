/**
 * ปุ่ม + ตรงกลางแถบนำทาง (ชิ้นส่วนของ nav) แทรกที่ลำดับ 2 ของแท็บ
 */
export function NavAdd({ icon }) {
  return h('li', { key: 'add' }, h('button', { className: 'add', 'data-act': 'add', 'aria-label': 'เพิ่มรายการ', dangerouslySetInnerHTML: { __html: icon('plus') } }));
}

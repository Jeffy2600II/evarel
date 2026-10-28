/**
 * ปุ่มแท็บหนึ่งอันของแถบนำทาง (ชิ้นส่วนของ nav) ไอคอนเป็น SVG string ของระบบเดิม ฝังผ่าน dangerouslySetInnerHTML กันเขียนใหม่ไม่ตรงไบต์
 */
export function NavTab({ id, label, ic, current, icon }) {
  return h('li', { key: id }, h('button', { 'data-tab': id, ...(current ? { 'aria-current': 'page' } : null) }, [
    h('span', { key: 'pill', className: 'pill', dangerouslySetInnerHTML: { __html: icon(ic) } }),
    label,
  ]));
}

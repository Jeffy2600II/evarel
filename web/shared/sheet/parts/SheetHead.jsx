/**
 * หัวกระดาษของ sheet (ชิ้นส่วนของ sheet): เส้นจับลาก + หัวเรื่อง + ปุ่มย้อนกลับ (ถ้ามี) + ปุ่มปิด
 * โครงตรงกับ template setSheet เดิมทุกไบต์ ไอคอนเป็น SVG string ของระบบเดิม ฝังผ่าน dangerouslySetInnerHTML
 */
const raw = (html) => ({ __html: html });

export function SheetGrab() {
  return h('div', { key: 'g', className: 'ev-grab', 'data-drag': '' });
}

export function SheetHead({ back, title, icon }) {
  return h('h2', { key: 'h', 'data-drag': '' }, [
    back ? h('button', { key: 'b', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'dback', 'aria-label': 'ย้อนกลับ', dangerouslySetInnerHTML: raw(icon('back')) }) : null,
    h('span', { key: 't', id: 'sheetTitle', className: 'grow' }, title),
    h('button', { key: 'x', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'ปิด', dangerouslySetInnerHTML: raw(icon('x')) }),
  ]);
}

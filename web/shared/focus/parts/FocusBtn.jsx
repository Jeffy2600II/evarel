/**
 * ปุ่มกลมของหน้าจับเวลา (เริ่ม/หยุด/ต่อ/จบ) พร้อมป้ายชื่อใต้ปุ่ม | โครง DOM และลำดับ attribute ตรงไฟล์เดิมทุกไบต์
 * ไอคอน SVG มาจากถาด takeFocusFns().icon อ่านตอนเรียก ไม่เก็บข้ามการเรียก
 */
import { takeFocusFns } from '../focus.tray.js';

export function FocusBtn({ a, ic, l, big, id }) {
  const F = takeFocusFns();
  return h('div', { style: { display: 'grid', gap: '6px', justifyItems: 'center' } }, [
    h('button', { key: 'b', className: 'ev-round', ...(big ? { 'data-big': 'true' } : {}), 'data-act': a, 'data-id': String(id), 'aria-label': l, dangerouslySetInnerHTML: { __html: F.icon(ic) } }),
    h('span', { key: 'l', className: 'ev-sub' }, l),
  ]);
}

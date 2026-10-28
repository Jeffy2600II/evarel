// ชั้น sheet ของ Evarel เป็น React (S4 s4f-shell-layers-auth): โครงเปลือก (grab + หัวเรื่อง + ปุ่มปิด + ตัวเนื้อ + ท้าย)
// เทียบ template setSheet เดิมใน 09-ui__layers ทุกไบต์: ปุ่มย้อนกลับ (o.back) ท้ายกระดาษ (o.foot) และ data-drag เดิมสำหรับการลากปิด
// เนื้อ (body) สองทาง: caller ส่ง o.page (ชื่อ EvarelComponents เช่น formBody/typeBody จากฟอร์ม 14) = เนื้อ React จริง
// ไม่ส่ง page = html raw จาก caller (โควตา 16, ตั้งค่า 19) เหมือนเดิม
import { takeSheet } from '../../data/sheet.tray.js';
const { h } = window.EvarelReact;
const W = () => window;
const raw = (html) => ({ __html: html });

function SheetBody(p) {
  const comp = takeSheet().componentFor(p.page);
  if (comp) return h('div', { key: 'b', className: 'ev-sheet-body', id: 'sheetBody' }, h(comp, p.props || {}));
  return h('div', { key: 'b', className: 'ev-sheet-body', id: 'sheetBody', dangerouslySetInnerHTML: raw(p.html || '') });
}
function SheetInner(p) {
  return [
    h('div', { key: 'g', className: 'ev-grab', 'data-drag': '' }),
    h('h2', { key: 'h', 'data-drag': '' }, [
      p.back ? h('button', { key: 'b', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'dback', 'aria-label': 'ย้อนกลับ', dangerouslySetInnerHTML: raw(p.icon('back')) }) : null,
      h('span', { key: 't', id: 'sheetTitle', className: 'grow' }, p.title),
      h('button', { key: 'x', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'ปิด', dangerouslySetInnerHTML: raw(p.icon('x')) }),
    ]),
    h(SheetBody, { key: 'body', ...p }),
    p.foot ? h('div', { key: 'f', className: 'ev-sheet-foot', dangerouslySetInnerHTML: raw(p.foot) }) : null,
  ];
}

function SheetShell(p) {
  return h(SheetInner, { ...p, icon: takeSheet().icon });
}
window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.sheet = (p) => {
  const props = { ...p, icon: takeSheet().icon };
  return window.EvarelReact.renderToStaticMarkup(h(SheetInner, props));
};
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.sheet = SheetShell;

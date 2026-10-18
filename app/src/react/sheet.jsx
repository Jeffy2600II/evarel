// ชั้น sheet ของ Evarel เป็น React (S4 s4f-shell-layers-auth): โครงเปลือก (grab + หัวเรื่อง + ปุ่มปิด + ตัวเนื้อ + ท้าย)
// เทียบ template setSheet เดิมใน 09-ui__layers ทุกไบต์: ปุ่มย้อนกลับ (o.back) ท้ายกระดาษ (o.foot) และ data-drag เดิมสำหรับการลากปิด
// เนื้อ (body) ยังส่งมาเป็น html raw จาก caller (ฟอร์ม 14-ui__form, โควตา 16, ตั้งค่า 19) — จะแปลงเป็น React ในหน่วยฟอร์ม
const { h } = window.EvarelReact;
const W = () => window;
const raw = (html) => ({ __html: html });

function SheetShell(p) {
  const w = W();
  return h(SheetInner, { ...p, icon: w.icon });
}
function SheetInner(p) {
  return [
    h('div', { key: 'g', className: 'ev-grab', 'data-drag': '' }),
    h('h2', { key: 'h', 'data-drag': '' }, [
      p.back ? h('button', { key: 'b', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'dback', 'aria-label': 'ย้อนกลับ', dangerouslySetInnerHTML: raw(p.icon('back')) }) : null,
      h('span', { key: 't', id: 'sheetTitle', className: 'grow' }, p.title),
      h('button', { key: 'x', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'ปิด', dangerouslySetInnerHTML: raw(p.icon('x')) }),
    ]),
    h('div', { key: 'b', className: 'ev-sheet-body', id: 'sheetBody', dangerouslySetInnerHTML: raw(p.html || '') }),
    p.foot ? h('div', { key: 'f', className: 'ev-sheet-foot', dangerouslySetInnerHTML: raw(p.foot) }) : null,
  ];
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.sheet = (p) => {
  const w = W();
  const props = { ...p, icon: w.icon };
  return window.EvarelReact.renderToStaticMarkup(h(SheetInner, props));
};
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.sheet = SheetShell;

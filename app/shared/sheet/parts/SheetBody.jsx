/**
 * เนื้อกระดาษของ sheet และท้ายกระดาษ (ชิ้นส่วนของ sheet)
 * เนื้อมีสองทาง: caller ส่ง page (ชื่อ EvarelComponents เช่น formBody/typeBody) = เนื้อ React จริง | ไม่ส่ง = html raw จาก caller (โควตา ตั้งค่า)
 * componentFor มาจากถาด (คง guard เดิม: ไม่มีรีจิสทรีหรือยังไม่ลงทะเบียน = null แล้วตกไปใช้ html raw)
 */
const raw = (html) => ({ __html: html });

export function SheetBody({ page, props, html, componentFor }) {
  const comp = componentFor(page);
  if (comp) return h('div', { key: 'b', className: 'ev-sheet-body', id: 'sheetBody' }, h(comp, props || {}));
  return h('div', { key: 'b', className: 'ev-sheet-body', id: 'sheetBody', dangerouslySetInnerHTML: raw(html || '') });
}

export function SheetFoot({ foot }) {
  return foot ? h('div', { key: 'f', className: 'ev-sheet-foot', dangerouslySetInnerHTML: raw(foot) }) : null;
}

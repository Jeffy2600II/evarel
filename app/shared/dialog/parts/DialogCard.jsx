/**
 * การ์ดกลางของ dialog (ชิ้นส่วนของ dialog): wrapper เดียวกับ openDialog เดิม
 * เนื้อพิเศษ (dvHTML, terms, import) ยังส่งมาเป็น html raw จากผู้เรียก | เทียบ template เดิมใน 09-ui__layers ทุกไบต์
 */
const raw = (html) => ({ __html: html });

export function DialogCard(p) {
  return h('div', { className: 'ev-dialog-card', dangerouslySetInnerHTML: raw(p.html || '') });
}

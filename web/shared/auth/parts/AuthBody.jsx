/**
 * เนื้อหน้าล็อกอิน (ชิ้นส่วนของ auth): ครอบ html ของหน้าจอที่เลือกด้วย div.ev-auth-in
 * เนื้อใน (7 views + splash) เป็น template เดิมที่ถาดส่งมา แทรกผ่าน dangerouslySetInnerHTML เพื่อให้ตรงเดิมทุกไบต์
 */
export function authBody(html) {
  return h('div', { className: 'ev-auth-in', dangerouslySetInnerHTML: { __html: html } });
}

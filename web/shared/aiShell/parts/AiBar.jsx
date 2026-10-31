/**
 * แถบบนของเปลือก AI: ปุ่มกลับ ปุ่มเมนูแชท หัวข้อ และแคปซูล (แชทใหม่/ตัวเลือกเพิ่มเติม) | โครง DOM และลำดับ attribute ตรงไฟล์เดิมทุกไบต์
 * รับ D (ผลของถาด takeAi) จากผู้เรียก ไม่อ่าน window | ไอคอนผลิตโดย D.icon
 */
export function AiBar({ D }) {
  const ic = (n) => ({ dangerouslySetInnerHTML: { __html: D.icon(n) } });
  return h('div', { key: 'bar', className: 'ev-aibar' }, [
  h('button', { key: 'bk', className: 'ev-backpill', 'data-act': 'close', 'aria-label': 'กลับหน้าหลัก', dangerouslySetInnerHTML: { __html: D.icon('back') + 'กลับ' } }),
  h('button', { key: 'h', className: 'ev-roundbtn', 'data-act': 'ai-hist', 'aria-label': 'เมนูแชท', ...ic('list') }),
  h('h2', { key: 't', id: 'aiTitle', className: 'ev-aititle' }, 'AI'),
  h('div', { key: 'cap', className: 'ev-capsule' }, [
    h('button', { key: 'n', 'data-act': 'ai-new', 'aria-label': 'แชทใหม่', ...ic('edit') }),
    h('button', { key: 'm', 'data-act': 'ai-more', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'ตัวเลือกเพิ่มเติม', ...ic('more') }),
  ]),
]);
}

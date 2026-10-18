// ชั้น dialog ของ Evarel เป็น React (S4 s4f-shell-layers-auth): การ์ดกลาง + ปุ่มยืนยัน (confirmDialog)
// DialogCard: wrapper เดียวกับ openDialog เดิม — เนื้อพิเศษ (dvHTML, terms, import) ยังส่งมาเป็น html raw
// ConfirmCard: แปลงเนื้อ confirmDialog เต็มรูป (ทุกจุดเรียกใช้ 5 แห่งใน 25-actions)
// เทียบ template เดิมใน 09-ui__layers ทุกไบต์: attribute order ตาม template และ data-act เดิมเพื่อ event delegation
const { h } = window.EvarelReact;
const W = () => window;
const raw = (html) => ({ __html: html });

function DialogCard(p) {
  return h('div', { className: 'ev-dialog-card', dangerouslySetInnerHTML: raw(p.html || '') });
}

function ConfirmCard(p) {
  /* ห่อ ev-dialog-card ให้เทียบเท่า openDialog เดิม (confirm ผ่าน openDialog เสมอ) | data-act="cf-ok" (เดิม confirm) */
  return h('div', { className: 'ev-dialog-card' }, [
    h('h3', { key: 't' }, p.title),
    h('p', { key: 'm', className: 'ev-sub' }, p.msg),
    h('div', { key: 'a', className: 'ev-dlg-actions' }, [
      h('button', { key: 'k', className: 'ev-btn-ghost', 'data-act': 'close' }, p.keep || 'ยกเลิก'),
      h('button', { key: 'o', className: p.tone === 'primary' ? 'ev-btn-primary' : 'ev-btn-solid-danger', 'data-act': 'cf-ok' }, p.ok),
    ]),
  ]);
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.dialogCard = (p) => window.EvarelReact.renderToStaticMarkup(h(DialogCard, p));
window.EvarelPages.confirmCard = (p) => window.EvarelReact.renderToStaticMarkup(h(ConfirmCard, p));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.dialogCard = DialogCard;
window.EvarelComponents.confirmCard = ConfirmCard;

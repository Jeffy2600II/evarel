/**
 * การ์ดยืนยัน (confirmDialog) ของ dialog (ชิ้นส่วนของ dialog) ทุกจุดเรียกใช้ 5 แห่งใน 25-actions
 * ห่อ ev-dialog-card ให้เทียบเท่า openDialog เดิม (confirm ผ่าน openDialog เสมอ) | data-act="cf-ok" (เดิม confirm) และ "close" ของปุ่มยกเลิก
 * attribute order ตาม template เดิมเพื่อ event delegation | key ทุกตัวคงเดิม
 */
export function ConfirmCard(p) {
  return h('div', { className: 'ev-dialog-card' }, [
    h('h3', { key: 't' }, p.title),
    h('p', { key: 'm', className: 'ev-sub' }, p.msg),
    h('div', { key: 'a', className: 'ev-dlg-actions' }, [
      h('button', { key: 'k', className: 'ev-btn-ghost', 'data-act': 'close' }, p.keep || 'ยกเลิก'),
      h('button', { key: 'o', className: p.tone === 'primary' ? 'ev-btn-primary' : 'ev-btn-solid-danger', 'data-act': 'cf-ok' }, p.ok),
    ]),
  ]);
}

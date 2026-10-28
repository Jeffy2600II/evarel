/**
 * แถบความคืบหน้าโควตา (ชิ้นส่วนของ quota): div.ev-qbar role=progressbar + i ที่เขียน --p ผ่าน CSSOM
 * ลำดับ attribute ตาม template เดิม: className, role, aria-label, aria-valuemin, aria-valuemax, aria-valuenow
 */
export function QuotaBar({ u, l, lb }) {
  return h('div', { className: 'ev-qbar', role: 'progressbar', 'aria-label': lb, 'aria-valuemin': '0', 'aria-valuemax': String(l), 'aria-valuenow': String(Math.min(u, l || 0)) },
    h('i', { style: { '--p': l > 0 ? Math.min(1, u / l).toFixed(3) : '0' } }));
}

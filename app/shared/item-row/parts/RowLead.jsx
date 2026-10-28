/**
 * ส่วนนำหน้าแถว (ชิ้นส่วนของ item-row): ช่องติ๊ก (check) หรือป้ายไอคอน (badge) ตามชนิดการติดตาม
 * คืน element เดิมที่ key 'lead' ตรง template เดิมทุกไบต์ | รับ D (ถาด), it, ds, done, fut จากหน้าหลัก
 */
const raw = (html) => ({ __html: html });

export function rowLead({ D, it, ds, done, fut }) {
  return it.track === 'check'
    ? h('button', {
        key: 'lead', className: 'ev-check', role: 'checkbox',
        'aria-checked': String(done), 'aria-label': `ทำแล้ว: ${D.esc(it.title)}`,
        'data-act': 'check', 'data-id': String(it.id), 'data-date': ds,
        ...(D.UI.pop == it.id && done ? { 'data-pop': 'true' } : null),
        ...(fut ? { disabled: true } : null),
        dangerouslySetInnerHTML: raw(D.icon('check')),
      })
    : h('span', { key: 'lead', className: 'ev-badge', dangerouslySetInnerHTML: raw(D.icon(it.track === 'timer' ? 'clock' : it.track === 'count' ? 'chart' : it.type === 'event' ? 'bell' : 'cal')) });
}

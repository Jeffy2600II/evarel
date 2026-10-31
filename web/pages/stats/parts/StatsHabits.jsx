/**
 * การ์ดรายการกิจวัตรพร้อมแถบความคืบหน้า (ชิ้นส่วนของ stats)
 */
export function StatsHabits({ period, rows }) {
  return (
      h('section', { key: 'list', className: 'ev-card' },
        h('h3', { className: 'ev-group', style: { paddingTop: '0' } }, 'รายกิจวัตร · แตะเพื่อดูปฏิทิน'),
        h('ul', null, rows.map((r) =>
          h('li', { key: r.id, className: 'ev-list-item' },
            h('div', { className: 'grow', role: 'button', tabIndex: 0, 'data-act': 'detail', 'data-id': String(r.id) },
              h('b', null, r.title),
              h('span', { className: 'ev-sub' }, r.sub),
              h('div', { className: 'ev-bar' }, h('i', { 'data-full': String(r.full), 'data-k': `sb-${r.id}-${period}`, 'data-to': String(r.pct) }))),
            h('span', { className: 'ev-pct', 'data-lv': r.lv }, r.pctText)))))
  );
}

/**
 * การ์ดกราฟแท่งรายวัน/รายสัปดาห์ (ชิ้นส่วนของ stats)
 */
export function StatsChart({ isM, period, cols }) {
  return (
      h('section', { key: 'chart', className: 'ev-card' },
        h('h3', { className: 'ev-group', style: { paddingTop: '0' } }, isM ? 'รายสัปดาห์' : 'รายวัน'),
        h('p', { className: 'ev-sub' }, `ความสูง = % ที่ทำสำเร็จ${isM ? 'ในสัปดาห์นั้น (เริ่มวันที่ใต้แท่ง)' : 'ในวันนั้น'}`),
        h('div', { className: 'ev-chart' }, cols.map((c, i) =>
          h('div', { key: i, className: 'ev-col', 'data-today': String(c.today), 'data-empty': String(!c.t) },
            h('span', { className: 'ev-col-v' }, c.t ? c.pct + '%' : '–'),
            h('div', { className: 'ev-col-track' }, h('i', { 'data-kind': 'col', 'data-k': `col-${period}-${i}`, 'data-to': String(c.pct) })),
            h('span', { className: 'ev-col-l' }, c.label)))))
  );
}

export const probe = window.__probe;

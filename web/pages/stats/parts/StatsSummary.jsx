/**
 * การ์ดสรุป: วงแหวนเปอร์เซ็นต์รวม + ข้อความจำนวนครั้งที่ทำ (ชิ้นส่วนของ stats)
 */
export function StatsSummary({ isM, period, rate, arcC, K, T }) {
  return (
      h('section', { key: 'sum', className: 'ev-card ev-sum ev-sum-row', 'data-tone': 'ink' },
        h('div', { className: 'ev-ringbox' },
          h('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' },
            h('circle', { className: 'ev-arc-bg', cx: '50', cy: '50', r: '42' }),
            h('circle', { className: 'ev-arc', 'data-kind': 'arc', 'data-k': `ring-${period}`, 'data-to': String(rate), cx: '50', cy: '50', r: '42', strokeDasharray: String(arcC), strokeDashoffset: String(arcC) })),
          h('div', { className: 'ev-ringnum' }, h('span', null, h('span', { 'data-count': String(rate) }, '0'), h('small', null, '%')))),
        h('div', null,
          h('div', { style: { fontSize: '16px', fontWeight: 600, lineHeight: 1.35 } }, `ทำแล้ว ${K} จาก ${T} ครั้ง`),
          h('div', { className: 'ev-sum-lab', style: { marginTop: '4px' } }, `ที่ตั้งไว้ใน${isM ? ' 4 สัปดาห์' : ' 7 วัน'}ที่ผ่านมา`)))
  );
}

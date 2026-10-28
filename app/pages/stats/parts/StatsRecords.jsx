/**
 * แถวการ์ดเล็กสองใบ: ต่อเนื่องสูงสุด + วันนี้ทำแล้ว (ชิ้นส่วนของ stats)
 */
export function StatsRecords({ best, tdDone, tdTotal }) {
  return (
      h('div', { key: 'r2', className: 'ev-row2' }, [
        h('section', { key: 'a', className: 'ev-card' }, h('div', { className: 'ev-sub' }, 'ต่อเนื่องสูงสุด'), h('div', { className: 'ev-big' }, h('span', { 'data-count': String(best) }, '0'), h('small', null, ' วัน'))),
        h('section', { key: 'b', className: 'ev-card' }, h('div', { className: 'ev-sub' }, 'วันนี้ทำแล้ว'), h('div', { className: 'ev-big' }, h('span', { 'data-count': String(tdDone) }, '0'), h('small', null, ` / ${tdTotal}`))),
      ])
  );
}

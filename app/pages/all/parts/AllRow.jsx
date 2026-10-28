/**
 * แถวรายการหนึ่งแถวของหน้า "ทั้งหมด": ไอคอน + ชื่อ + คำอธิบาย (ชิ้นส่วนของ all)
 */
export function AllRow({ r }) {
  return (
        h('li', { key: r.id, className: 'ev-list-item' },
          h('span', { className: 'ev-badge', dangerouslySetInnerHTML: { __html: r.icon } }),
          h('div', { className: 'grow', role: 'button', tabIndex: 0, 'data-act': 'detail', 'data-id': String(r.id) },
            h('b', null, r.title),
            h('span', { className: 'ev-sub' }, r.sub)))
  );
}

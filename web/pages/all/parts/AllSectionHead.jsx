/**
 * หัวกลุ่มของหน้า "ทั้งหมด": ชื่อกลุ่ม + จำนวน + ปุ่มเพิ่ม (ชิ้นส่วนของ all)
 */
export function AllSectionHead({ s }) {
  return (
      h('div', { className: 'ev-sec-head' },
        h('h3', { className: 'ev-group' }, s.label, h('span', null, String(s.count))),
        h('button', { className: 'ev-link-btn', 'data-act': 'add-type', 'data-id': s.key, 'aria-label': `เพิ่ม${s.label}`, dangerouslySetInnerHTML: { __html: s.plus } }))
  );
}

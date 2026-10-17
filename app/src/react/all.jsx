// หน้ารายการทั้งหมดของ Evarel เขียนเป็น React (ชั้น 4 หน่วยที่สาม)
// ผลิตเฉพาะ <main> ให้ VIEWS.all ส่งกลับเป็น string: header กับแถบ pills เป็น HTML สำเร็จรูปที่โค้ดเดิมต่อ string เอง
// ไอคอนเป็น svg สำเร็จรูปจากฝั่งเดิม ส่งมาเป็น props แล้วใส่ด้วย dangerouslySetInnerHTML ใน span ที่มีอยู่แล้ว (ไม่เพิ่ม element)
// ลูกศร chev ท้ายแต่ละแถวโค้ดเดิมต่อหลัง </li> เอง เหมือนหน้า stats เพื่อไม่ให้ DOM ต่างจากเดิม
const { h, Fragment } = window.EvarelReact;

function AllPage(p) {
  const { sections } = p;
  return h(Fragment, null, h('main', { className: 'ev-main' }, sections.map((s) =>
    h('section', { key: s.key, className: 'ev-card' },
      h('div', { className: 'ev-sec-head' },
        h('h3', { className: 'ev-group' }, s.label, h('span', null, String(s.count))),
        h('button', { className: 'ev-link-btn', 'data-act': 'add-type', 'data-id': s.key, 'aria-label': `เพิ่ม${s.label}`, dangerouslySetInnerHTML: { __html: s.plus } })),
      h('ul', null, s.rows.map((r) =>
        h('li', { key: r.id, className: 'ev-list-item' },
          h('span', { className: 'ev-badge', dangerouslySetInnerHTML: { __html: r.icon } }),
          h('div', { className: 'grow', role: 'button', tabIndex: 0, 'data-act': 'detail', 'data-id': String(r.id) },
            h('b', null, r.title),
            h('span', { className: 'ev-sub' }, r.sub)))))))));
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.all = (props) => window.EvarelReact.renderToStaticMarkup(h(AllPage, props));

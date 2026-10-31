/**
 * รายการของหน้าวันนี้: กลุ่มค้างอยู่ กลุ่มตามช่วงเวลา และกรณีว่าง | โครง DOM ตรงไฟล์เดิมทุกไบต์
 * ItemRow รับเป็น prop (ถาดอ่านตอนเรียก) และ renderEmpty คือ takeTodayFns().empty ผ่านผู้เรียก ไม่อ่าน window ที่นี่
 */
export function TodayOverdue({ P, ui, ItemRow }) {
  return P.overdue.length ? h('section', { key: 'od', className: 'ev-card', 'data-tone': 'warn' },
    h('b', null, `ค้างอยู่ ${P.overdue.length} งาน`),
    h('ul', null, P.overdue.map((r, k) => h(ItemRow, { key: 'od' + k, it: r.it, ds: r.late ? r.it.start : ui.date, i: r.idx ?? k, late: r.late })))) : null;
}

export function TodayGroups({ P, ui, ItemRow, emptyHTML }) {
  return P.groups.length
    ? h('section', { key: 'g', className: 'ev-card' }, P.groups.map((g) => [
        h('h3', { key: g.name, className: 'ev-group' }, g.name),
        h('ul', { key: g.name + 'u' }, g.rows.map((r, k) => h(ItemRow, { key: 'g' + k, it: r.it, ds: ui.date, i: r.idx ?? k, next: r.next }))),
      ]))
    : h('section', { key: 'ge', className: 'ev-card', dangerouslySetInnerHTML: { __html: emptyHTML() } });
}

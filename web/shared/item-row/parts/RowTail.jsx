/**
 * ส่วนท้ายแถว (ชิ้นส่วนของ item-row): ปุ่มลด/เพิ่ม (count) หรือปุ่มจับเวลา (timer) หรือไม่มี
 * คืน element เดิมที่ key 'tail' หรือ null | รับ D (ถาด), it, ds, v, fut จากหน้าหลัก
 */
const raw = (html) => ({ __html: html });

export function rowTail({ D, it, ds, v, fut }) {
  return it.track === 'count'
    ? h('div', { key: 'tail', className: 'ev-step' }, [
        h('button', { key: 'd', 'data-act': 'dec', 'data-id': String(it.id), 'data-date': ds, 'aria-label': 'ลด', ...(v <= 0 || fut ? { disabled: true } : null) }, '\u2212'),
        h('button', { key: 'i', 'data-act': 'inc', 'data-id': String(it.id), 'data-date': ds, 'aria-label': 'เพิ่ม', ...(fut ? { disabled: true } : null) }, '+'),
      ])
    : it.track === 'timer'
      ? h('button', { key: 'tail', className: 'ev-mini', 'data-tone': 'solid', 'data-act': 'timeropen', 'data-id': String(it.id), 'data-date': ds, 'aria-label': 'จับเวลา', dangerouslySetInnerHTML: raw(D.icon('play')) })
      : null;
}

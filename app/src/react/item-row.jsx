// แถวรายการของ Evarel เป็น React จริง (S4 s4f-route-today-calendar ส่วนค้าง itemRow)
// ตรง template เดิมใน 12-ui__primitives.itemRow ทุกไบต์ ยืนยันด้วย itemrow_equiv (เทียบผ่าน DOM จริงเพราะ browser normalize boolean attr เหมือนกันทั้งสองฝั่ง)
import { takeItemRow } from '../../data/item-row.tray.js';
const { h } = window.EvarelReact;
const W = () => window;
const raw = (html) => ({ __html: html });

/* it = รายการ, ds = วันที่แสดง, i = ลำดับ (สไตล์ --i), late = ค้างล้างหลัง, next = รายการถัดไป */
function ItemRow({ it, ds, i, late, next }) {
  const D = takeItemRow();
  const v = D.val(it, ds), tg = D.target(it);
  const done = D.tracked(it) && D.isDone(it, ds);
  const multi = it.track === 'count' || it.track === 'timer';
  const fut = D.isFuture(ds), sk = D.skipped(it, ds);
  const lead = it.track === 'check'
    ? h('button', {
        key: 'lead', className: 'ev-check', role: 'checkbox',
        'aria-checked': String(done), 'aria-label': `ทำแล้ว: ${D.esc(it.title)}`,
        'data-act': 'check', 'data-id': String(it.id), 'data-date': ds,
        ...(D.UI.pop == it.id && done ? { 'data-pop': 'true' } : null),
        ...(fut ? { disabled: true } : null),
        dangerouslySetInnerHTML: raw(D.icon('check')),
      })
    : h('span', { key: 'lead', className: 'ev-badge', dangerouslySetInnerHTML: raw(D.icon(it.track === 'timer' ? 'clock' : it.track === 'count' ? 'chart' : it.type === 'event' ? 'bell' : 'cal')) });
  const tail = it.track === 'count'
    ? h('div', { key: 'tail', className: 'ev-step' }, [
        h('button', { key: 'd', 'data-act': 'dec', 'data-id': String(it.id), 'data-date': ds, 'aria-label': 'ลด', ...(v <= 0 || fut ? { disabled: true } : null) }, '\u2212'),
        h('button', { key: 'i', 'data-act': 'inc', 'data-id': String(it.id), 'data-date': ds, 'aria-label': 'เพิ่ม', ...(fut ? { disabled: true } : null) }, '+'),
      ])
    : it.track === 'timer'
      ? h('button', { key: 'tail', className: 'ev-mini', 'data-tone': 'solid', 'data-act': 'timeropen', 'data-id': String(it.id), 'data-date': ds, 'aria-label': 'จับเวลา', dangerouslySetInnerHTML: raw(D.icon('play')) })
      : null;
  const subParts = [
    late ? `เลยกำหนด ${D.fmtDate(it.start)}` : '',
    D.timeText(it) || 'ไม่ระบุเวลา',
    multi ? `${v}/${tg} ${D.esc(it.unitName)}` : D.esc(it.subject),
    sk ? 'ข้ามวันนี้' : '',
  ].filter(Boolean);
  return h('li', {
    className: 'ev-list-item',
    'data-state': done ? 'done' : 'todo',
    ...(next ? { 'data-next': 'true' } : null),
    style: { '--i': String(i) },
  }, [
    lead,
    h('div', { key: 'grow', className: 'grow', role: 'button', tabIndex: 0, 'data-act': 'open', 'data-id': String(it.id), 'data-date': ds },
      h('b', { key: 't' }, D.esc(it.title)),
      h('span', { key: 's', className: 'ev-sub' }, subParts.join(' \u00b7 ')),
      multi ? h('div', { key: 'bar', className: 'ev-bar' }, h('i', { 'data-full': String(v >= tg), 'data-k': `b-${it.id}-${ds}`, 'data-to': String(Math.min(100, Math.round(v / tg * 100))) })) : null),
    tail,
  ]);
}
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.itemRow = ItemRow;

/**
 * แถวรายการของ Evarel (item-row) แถวเดียวในรายการวันนี้/ค้างกำหนด (ชั้นที่ 1 ของกล่อง item-row โซน shared เพราะหลายหน้าใช้)
 * เป็น component อย่างเดียว ไม่มีหน้า (pages ว่างในบัตร): today เรียกผ่าน EvarelComponents.itemRow | h/Fragment บิลด์ฉีดให้
 * ตรง template เดิมใน 12-ui__primitives.itemRow ทุกไบต์ (ยืนยันด้วย itemrow_equiv) | ข้อมูลเข้าทางถาด item-row.tray.js ที่เดียว
 */
import { takeItemRow } from './item-row.tray.js';
import { rowLead } from './parts/RowLead.jsx';
import { rowTail } from './parts/RowTail.jsx';
import { rowSubParts } from './parts/RowSub.jsx';

/* it = รายการ, ds = วันที่แสดง, i = ลำดับ (สไตล์ --i), late = ค้างล้างหลัง, next = รายการถัดไป */
export default function ItemRow({ it, ds, i, late, next }) {
  const D = takeItemRow();
  const v = D.val(it, ds), tg = D.target(it);
  const done = D.tracked(it) && D.isDone(it, ds);
  const multi = it.track === 'count' || it.track === 'timer';
  const fut = D.isFuture(ds), sk = D.skipped(it, ds);
  const lead = rowLead({ D, it, ds, done, fut });
  const tail = rowTail({ D, it, ds, v, fut });
  const subParts = rowSubParts({ D, it, late, multi, v, tg, sk });
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

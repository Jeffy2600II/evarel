/**
 * การ์ดงาน (task) ของหน้ารายละเอียด: สถานะ + กำหนดส่ง + ป้ายเลยกำหนด/เสร็จแล้ว | โครง DOM ตรงไฟล์เดิมทุกไบต์ | ข้อมูลมาจากถาด detail
 */
import { takeDetail } from '../detail.tray.js';
const raw = (html) => ({ __html: html });

export function TaskCard({ it }) {
  const D = takeDetail();
  const done = D.isDone(it, it.start), late = !done && it.start < D.TODAY;
  return h('section', { className: 'ev-card' }, [
    h('span', { key: 'c', className: 'ev-cap' }, 'สถานะ'),
    h('div', { key: 's', style: { margin: '10px 0 14px' }, dangerouslySetInnerHTML: raw(D.seg('h-task', [['0', 'ยังไม่เสร็จ'], ['1', 'เสร็จแล้ว']], done ? '1' : '0')) }),
    h('div', { key: 'i', className: 'ev-list-item' }, [
      h('span', { className: 'ev-badge', dangerouslySetInnerHTML: raw(D.icon('cal')) }),
      h('div', { className: 'grow' }, [
        h('b', null, `กำหนดส่ง ${D.fmtDate(it.start)}`),
        h('span', { className: 'ev-sub' }, `${it.time || 'ไม่ระบุเวลา'}${it.subject ? ` · ${it.subject}` : ''}`),
      ]),
      late ? h('span', { className: 'ev-chip', 'data-state': 'late' }, 'เลยกำหนด') : done ? h('span', { className: 'ev-chip', 'data-state': 'done' }, 'เสร็จแล้ว') : null,
    ]),
  ]);
}

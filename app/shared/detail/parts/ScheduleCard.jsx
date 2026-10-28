/**
 * การ์ดตารางเวลา (event/class) ของหน้ารายละเอียด: 5 ครั้งถัดไปใน 90 วัน หรือกรณีว่าง | โครง DOM ตรงไฟล์เดิมทุกไบต์ | ข้อมูลมาจากถาด detail
 */
import { takeDetail } from '../detail.tray.js';
const raw = (html) => ({ __html: html });

function Empty({ ic, t, h: hh }) {
  const D = takeDetail();
  return h('div', { className: 'ev-empty' }, [
    h('div', { className: 'orb', dangerouslySetInnerHTML: raw(D.icon(ic)) }),
    h('h3', null, t),
    h('p', null, hh),
  ]);
}

export function ScheduleCard({ it }) {
  const D = takeDetail();
  const next = [];
  for (let i = 0; i < 90 && next.length < 5; i++) { const ds = D.ymd(D.addDays(new Date(), i)); if (D.occursOn(it, ds)) next.push(ds); }
  return h('section', { className: 'ev-card' }, [
    h('h3', { key: 'h', className: 'ev-group', style: { paddingTop: '0px' } }, 'ครั้งถัดไป'),
    next.length ? h('ul', { key: 'u' }, next.map(ds => h('li', { className: 'ev-list-item', key: ds }, [
      h('span', { className: 'ev-badge', dangerouslySetInnerHTML: raw(D.icon('cal')) }),
      h('div', { className: 'grow' }, [
        h('b', null, D.dayLab(ds)),
        h('span', { className: 'ev-sub' }, `${D.fmtDate(ds)} · ${it.time ? D.timeText(it) : 'ไม่ระบุเวลา'}`),
      ]),
    ]))) : h(Empty, { key: 'e', ic: 'cal', t: 'ไม่มีครั้งถัดไป', h: 'รายการนี้สิ้นสุดแล้ว' }),
  ]);
}

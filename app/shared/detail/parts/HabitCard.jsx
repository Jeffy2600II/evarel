/**
 * การ์ดนิสัย (habit) ของหน้ารายละเอียด: สถิติสามช่อง + หัวปฏิทินเดือน + คำอธิบายสี | โครง DOM ตรงไฟล์เดิมทุกไบต์
 * ปฏิทิน #fcHabit mount โดย openDetail/refreshDetail ของชั้น m (จังหวะเดียวกับ classic) ไม่ใช้ effect ของ React | ข้อมูลทั้งหมดมาจากถาด detail ไม่อ่าน window
 */
import { takeDetail } from '../detail.tray.js';
const raw = (html) => ({ __html: html });

export function HabitCard({ it }) {
  const D = takeDetail();
  const { y, m } = D.UI.cal;
  const dim = new Date(y, m + 1, 0).getDate();
  const now = new Date();
  const isNow = y === now.getFullYear() && m === now.getMonth();
  let t = 0, ok = 0;
  for (let d = 1; d <= dim; d++) {
    const ds = D.ymd(new Date(y, m, d));
    if (ds <= D.TODAY && D.scheduled(it, ds) && !D.skipped(it, ds)) { t++; if (D.isDone(it, ds)) ok++; }
  }
  return [
    h('section', { key: 'st', className: 'ev-card' }, [
      h('div', { className: 'ev-stats3' }, [
        h('div', { key: 'a' }, [h('b', null, String(D.streak(it))), h('span', null, 'วันต่อเนื่อง')]),
        h('div', { key: 'b' }, [h('b', null, String(D.totalDone(it))), h('span', null, 'ทำแล้วทั้งหมด (ครั้ง)')]),
        h('div', { key: 'c' }, [h('b', null, (t ? Math.round(100 * ok / t) : 0) + '%'), h('span', null, `เดือนนี้ (${ok}/${t})`)]),
      ]),
    ]),
    h('section', { key: 'cal', className: 'ev-card' }, [
      h('div', { className: 'ev-cal-head' }, [
        h('button', { key: 'p', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'cal-prev', 'aria-label': 'เดือนก่อน', dangerouslySetInnerHTML: raw(D.icon('back')) }),
        h('b', { key: 'm' }, `${D.TH_MONTH[m]} ${y + 543}`),
        h('button', { key: 'n', className: 'ev-icon-btn ev-flip', 'data-flat': '', 'data-act': 'cal-next', 'aria-label': 'เดือนถัดไป', ...(isNow ? { disabled: true } : {}), /* disabled เป็น boolean property ต้องใช้ true (ต่างจาก data-flat ที่เป็น attribute '') */ dangerouslySetInnerHTML: raw(D.icon('back')) }),
      ]),
      h('div', { key: 'f', id: 'fcHabit' }),
      h('div', { key: 'l', className: 'ev-legend' }, [
        h('span', { key: '1' }, [h('i', { 'data-state': 'done' }), 'ทำแล้ว']),
        h('span', { key: '2' }, [h('i', { 'data-state': 'part' }), 'ทำบางส่วน']),
        h('span', { key: '3' }, [h('i', null), 'ยังไม่ทำ']),
        h('span', { key: '4' }, [h('i', { 'data-state': 'off' }), 'ไม่มีกำหนด']),
      ]),
      h('p', { key: 's', className: 'ev-sub', style: { marginTop: '12px' } }, `${it.track === 'check' ? 'แตะวันที่เพื่อติ๊ก/เลิกติ๊ก' : 'แตะวันที่เพื่อปรับจำนวน'} · กดค้างเพื่อตัวเลือกอื่น (ข้ามวัน)`),
    ]),
  ];
}

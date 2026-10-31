/**
 * การ์ดการตั้งค่า: ชนิด ความถี่ เวลา การเตือน และปุ่มแก้ไข | ใช้กับทุกชนิดรายการ | โครง DOM ตรงไฟล์เดิมทุกไบต์ | ข้อมูลมาจากถาด detail
 */
import { takeDetail } from '../detail.tray.js';

export function MetaCard({ it }) {
  const D = takeDetail();
  return h('section', { className: 'ev-card' }, [
    h('h3', { key: 'h', className: 'ev-group', style: { paddingTop: '0px' } }, 'การตั้งค่า'),
    h('div', { key: 'm', className: 'ev-meta' }, [
      h('span', { key: 't', className: 'ev-chip' }, D.TYPES[it.type]),
      h('span', { key: 'r', className: 'ev-chip' }, D.repeatText(it)),
      h('span', { key: 'tm', className: 'ev-chip' }, it.time ? D.timeText(it) : 'ไม่ระบุเวลา'),
      ...((it.rem || []).length ? it.rem.map((r, i) => h('span', { key: 'rm' + i, className: 'ev-chip' }, `เตือน ${D.remText(r)}`)) : [h('span', { key: 'rm0', className: 'ev-chip' }, 'ไม่มีการเตือน')]),
    ]),
    h('button', { key: 'e', className: 'ev-btn-ghost ev-btn-block', 'data-act': 'm-edit', 'data-id': String(it.id), style: { marginTop: '14px' } }, 'แก้ไขการตั้งค่า'),
  ]);
}

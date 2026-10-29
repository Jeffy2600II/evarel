/**
 * ขั้นที่ 1 ของฟอร์ม: เลือกประเภทรายการ (typeBody) | โครง DOM ตรงไฟล์เดิมทุกไบต์ | ข้อมูลประเภทมาจากถาด form.tray.js
 */
import { TYPES } from '../../../src/core/schedule.ts';
import { takeFormFns } from '../form.tray.js';
import { raw, icon } from './FormAtoms.jsx';

export function TypeBody() {
  return h('div', { className: 'ev-types' }, Object.entries(takeFormFns().TYPE_INFO).map(([k, [ic, d]]) =>
    h('button', { key: k, className: 'ev-type', 'data-act': 'dtype', 'data-id': k },
      h('span', { key: 'o', className: 'orb', dangerouslySetInnerHTML: raw(icon(ic)) }),
      h('b', { key: 'n' }, TYPES[k]),
      h('span', { key: 'd', className: 'd' }, d))));
}

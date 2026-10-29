/**
 * พาเนลขั้นสูงของฟอร์ม (ทำซ้ำ/ช่วงเวลา/เตือน) ตาม repPanel/rangePanel/remPanel และแถวเตือน RemRow | โครง DOM ตรงไฟล์เดิมทุกไบต์
 * ข้อมูลทั้งหมดมาจากถาด form.tray.js ที่เดียว
 */
import { remText } from '../../../src/core/schedule.ts';
import { takeFormConsts, takeFormFns, takeFormDraft } from '../form.tray.js';
import { Chips, Seg, SR, PN, RI, Stepper, raw, icon } from './FormAtoms.jsx';

export function RepPanel() {
  const D = takeFormDraft();
  const els = [h(Seg, { key: 's', act: 'dunit', opts: [['none', 'ไม่ซ้ำ'], ['day', 'วัน'], ['week', 'สัปดาห์'], ['month', 'เดือน']], cur: D.unit })];
  if (D.unit !== 'none') els.push(h(Stepper, { key: 'e', label: 'ทุก ๆ', act: 'devery', v: D.every, unit: h('span', {}, takeFormConsts().UNIT_TH[D.unit]) }));
  if (D.unit === 'week') els.push(h(Chips, { key: 'd', act: 'dday', opts: takeFormConsts().WEEK_OPTS, active: D.days }));
  return els;
}
export function RangePanel(p) {
  const D = takeFormDraft();
  const els = [
    h('div', { key: 's', className: 'ev-stepper' }, h('span', {}, p.lab), h(RI, { name: 'start', type: 'date' })),
    h('div', { key: 'e', className: 'ev-stepper' }, h('span', {}, 'มีวันสิ้นสุด'),
      h('button', { type: 'button', className: 'ev-switch', role: 'switch', 'aria-checked': String(D.endMode === 'date'), 'data-act': 'dend', 'aria-label': 'มีวันสิ้นสุด' })),
  ];
  if (D.endMode === 'date') els.push(h('div', { key: 'd', className: 'ev-stepper' }, h('span', {}, 'สิ้นสุดวันที่'), h(RI, { name: 'end', type: 'date' })));
  return els;
}
export function RemPanel() {
  /* ตามเดโม v24 จริง: ไม่มีสวิตช์ตรงเวลา ใช้ชิป m=0 รวมในพรีเซ็ตเดียวกัน + empty-note + tbox */
  const D = takeFormDraft();
  const at = D.rem.filter(r => r.k === 'at');
  return [
    h(Chips, { key: 'a', act: 'drem', opts: takeFormConsts().REM_PRESETS.map(m => [m, remText({ k: 'before', m })]), active: D.rem.filter(r => r.k === 'before').map(r => r.m) }),
    at.length ? h('div', { key: 'r', className: 'ev-rem' }, at.map(r =>
      h('span', { key: r.t, className: 'ev-rem-tag' }, `${r.t} น.`,
        h('button', { type: 'button', 'data-act': 'remdel', 'data-id': r.t, 'aria-label': `ลบการเตือน ${r.t}`, dangerouslySetInnerHTML: raw(icon('x')) }))))
      : h('div', { key: 'r0', className: 'ev-empty-note' }, 'ยังไม่มีการเตือนตามเวลา เลือกเวลาด้านล่างแล้วกดเพิ่ม'),
    h('div', { key: 'n', className: 'ev-stepper' }, h('span', {}, 'เตือนตามเวลา'),
      h('div', { className: 'ev-row', style: { gap: '8px' } },
        h('label', { key: 'l', className: 'ev-tbox', 'data-empty': 'true' },
          h('span', { key: 't', className: 'ev-tbox-t' }, '＋ เลือกเวลา'),
          h('input', { key: 'i', type: 'time', id: 'remTime', 'aria-label': 'เวลาเตือน' })),
        h('button', { type: 'button', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'remadd' }, 'เพิ่ม'))),
  ];
}
export function RemRow() {
  /* notifyIssue ตามเดโม v24: เตือนเมื่อตั้งแจ้งก่อนถึงเวลาแต่ไม่มีเวลาทำรายการ พร้อมปุ่มปิดแจ้งเตือน */
  const issue = takeFormFns().notifyIssue();
  return [h(SR, { key: 'r', label: 'เตือน', val: takeFormFns().remSum(), k: 'rem' }), h(PN, { key: 'p', k: 'rem' }, h(RemPanel)),
    issue ? h('div', { key: 'e', className: 'ev-field-err', 'data-tone': 'hint', style: { padding: '6px 14px 12px' },
      dangerouslySetInnerHTML: raw(icon('alert') + '<span>' + issue + '</span><button type="button" data-act="rem-off">ปิดแจ้งเตือน</button>') }) : null];
}

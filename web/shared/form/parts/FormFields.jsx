/**
 * ขั้นที่ 2 ของฟอร์ม: ช่องกรอกตามประเภท (habit/task/event/class) | โครง DOM ตรงไฟล์เดิมทุกไบต์
 * SET คือ wrapper ของแถวตั้งค่า เรียกเป็นฟังก์ชันธรรมดา (ใช้ arguments) ไม่ใช่คอมโพเนนต์ ต้องคงรูปนี้
 */
import { takeFormConsts, takeFormFns, takeFormDraft } from '../form.tray.js';
import { Chips, Seg, SR, PN, IR, TR, RI, Stepper } from './FormAtoms.jsx';
import { RepPanel, RangePanel, RemRow } from './FormPanels.jsx';

function SET() { return h('div', { className: 'ev-set' }, ...arguments); }

export function FormFields() {
  const D = takeFormDraft();
  const T = D.type, multi = D.track !== 'check';
  const ph = { habit: 'เช่น ดื่มน้ำ', task: 'เช่น การบ้านคณิต', event: 'เช่น ประชุมชมรม', class: 'ชื่อวิชา' }[T];
  const els = [
    h('input', { key: 't', className: 'ev-title-input', placeholder: ph, maxLength: 80, 'aria-label': 'ชื่อ', defaultValue: D.title ?? '', name: 'title' }),
  ];
  if (D.err) els.push(h('div', { key: 'e', className: 'ev-form-err', role: 'alert' }, D.err));
  if (T === 'habit') {
    els.push(h('div', { key: 'b', className: 'ev-block' },
      h('span', { className: 'ev-cap' }, 'ติดตามผลแบบ'),
      h(Seg, { act: 'dtrack', opts: takeFormConsts().TRACK_OPTS, cur: D.track }),
      multi ? h(Stepper, { label: 'เป้าหมายต่อวัน', act: 'dtarget', v: D.target,
        unit: h('input', { className: 'ev-unit', placeholder: D.track === 'timer' ? 'นาที' : 'หน่วย', maxLength: 12, 'aria-label': 'หน่วย', defaultValue: D.unitName ?? '', name: 'unitName' }) }) : null));
    els.push(SET(
      h(TR, { key: 'time', label: 'เวลา (ไม่บังคับ)', name: 'time' }),
      h(SR, { key: 'rep', label: 'ทำซ้ำ', val: takeFormFns().repSum(), k: 'rep' }),
      h(PN, { key: 'rep', k: 'rep' }, h(RepPanel)),
      h(SR, { key: 'range', label: 'ช่วงเวลา', val: takeFormFns().rangeSum(), k: 'range' }),
      h(PN, { key: 'range', k: 'range' }, h(RangePanel, { lab: 'เริ่มวันที่' }))));
    els.push(SET(h(RemRow, { key: 'rem' })));
  }
  if (T === 'task') {
    els.push(SET(
      h(IR, { key: 's', label: 'กำหนดส่ง', inner: h(RI, { name: 'start', type: 'date' }) }),
      h(TR, { key: 't', label: 'เวลา (ไม่บังคับ)', name: 'time' }),
      h(IR, { key: 'j', label: 'วิชา/หมวด', inner: h('input', { className: 'ev-row-input', placeholder: 'ไม่บังคับ', maxLength: 30, 'aria-label': 'วิชา', defaultValue: D.subject ?? '', name: 'subject' }) })));
    els.push(SET(h(RemRow, { key: 'rem' })));
  }
  if (T === 'event') {
    els.push(SET(
      h(IR, { key: 'd', label: 'วันที่', inner: h(RI, { name: 'start', type: 'date' }) }),
      h(TR, { key: 'b', label: 'เริ่ม', name: 'time' }),
      h(TR, { key: 'e', label: 'จบ', name: 'timeEnd' }),
      h(SR, { key: 'rep', label: 'ทำซ้ำ', val: takeFormFns().repSum(), k: 'rep' }),
      h(PN, { key: 'rep', k: 'rep' }, h(RepPanel)),
      D.unit !== 'none' ? h(SR, { key: 'range', label: 'ช่วงเวลา', val: takeFormFns().rangeSum(), k: 'range' }) : null,
      D.unit !== 'none' ? h(PN, { key: 'range', k: 'range' }, h(RangePanel, { lab: 'เริ่มวันที่' })) : null));
    els.push(SET(h(RemRow, { key: 'rem' })));
  }
  if (T === 'class') {
    els.push(h('div', { key: 'b', className: 'ev-block' },
      h('span', { className: 'ev-cap' }, 'วันที่เรียน'),
      h(Chips, { act: 'dday', opts: takeFormConsts().WEEK_OPTS, active: D.days })));
    els.push(SET(
      h(TR, { key: 'b', label: 'เริ่ม', name: 'time' }),
      h(TR, { key: 'e', label: 'จบ', name: 'timeEnd' }),
      h(SR, { key: 'range', label: 'ภาคเรียน', val: takeFormFns().rangeSum(), k: 'range' }),
      h(PN, { key: 'range', k: 'range' }, h(RangePanel, { lab: 'เปิดเทอม' }))));
    els.push(SET(h(RemRow, { key: 'rem' })));
  }
  return els;
}

// เนื้อฟอร์มเพิ่ม/แก้ไขของ Evarel เป็น React (S4 s4f-shell-layers-auth ไบต์ฟอร์ม): typeBody (ขั้นเลือกประเภท) + formBody (ฟอร์ม 4 ประเภท)
// เทียบ template ใน 14-ui__form ทุกไบต์: ลำดับ attribute ตาม template เดิม, data-act เดิมสำหรับ event delegation ของ 25-actions
// อินพุตใช้ defaultValue (uncontrolled) เหมือนพฤติกรรมเดิม: พิมพ์แล้ว document input listener (25-actions) เขียน ST.D ระหว่างพิมพ์ ไม่ re-render จนกว่าจะกดปุ่มแล้ว renderForm สั่ง mount ใหม่
// ค่าสรุป (repSum/remSum/rangeSum) และไอคอนรับผ่าน form.tray.js | ร่างฟอร์ม (ST.D) อ่านสดจาก takeFormDraft ทุกครั้งที่เรนเดอร์ | ไฟล์นี้เหลือแค่ลงทะเบียนตัวเองที่ EvarelPages/EvarelComponents
import { takeFormConsts, takeFormFns, takeFormIcon, takeFormDraft } from '../../data/form.tray.js';
import { esc } from '../core/dates.ts';
import { TYPES, remText } from '../core/schedule.ts';
const { h } = window.EvarelReact;
const raw = (html) => ({ __html: html });
const icon = (n) => takeFormIcon().icon(n);

/* == ชิ้นเล็กตาม template 14-ui__form (chips/seg/SR/PN/IR/ri/stepper) == */
function Chips(p) {
  return h('div', { className: 'ev-filters ev-wrap' }, p.opts.map(([k, l]) =>
    h('button', { key: k, type: 'button', 'aria-pressed': String(p.active.includes(k)), 'data-act': p.act, 'data-id': String(k) }, l)));
}
function Seg(p) {
  return h('div', { className: 'ev-seg' }, p.opts.map(([k, l]) =>
    h('button', { key: k, type: 'button', 'aria-pressed': String(p.cur === k), 'data-act': p.act, 'data-id': String(k) }, l)));
}
function SR(p) {
  const D = takeFormDraft();
  return h('button', { type: 'button', className: 'ev-set-row', 'data-act': 'dopen', 'data-id': p.k, 'aria-expanded': String(D.open === p.k) },
    h('span', {}, p.label),
    h('small', { dangerouslySetInnerHTML: raw(esc(p.val) + icon('chev')) }));
}
function PN(p) {
  const D = takeFormDraft();
  return h('div', { className: 'ev-panel', 'data-key': p.k, 'data-open': String(D.open === p.k) },
    h('div', {}, h('div', { className: 'ev-panel-in' }, p.children)));
}
function IR(p) {
  return h('div', { className: 'ev-set-row' }, h('span', {}, p.label), p.inner);
}
function TR(p) {
  /* TR (เดโม v20/v24): แถวเวลาแบบ tbox — DOM ตรงฉบับ string เป๊ะ */
  const D = takeFormDraft();
  const v = D[p.name] || '';
  return h('div', { className: 'ev-set-row' }, h('span', {}, p.label),
    h('span', { className: 'ev-tbox-w' },
      h('label', { className: 'ev-tbox', 'data-empty': String(!v) },
        h('span', { className: 'ev-tbox-t' }, v ? `${v} น.` : '＋ เพิ่มเวลา'),
        h('input', { name: p.name, 'aria-label': p.label, type: 'time', defaultValue: v })),
      v ? h('button', { type: 'button', className: 'ev-tx', 'data-tclear': p.name, 'aria-label': `ล้าง${p.label}` }, '✕')
        : h('small', { className: 'ev-tbox-h' }, 'ยังไม่ได้ตั้ง')));
}
function RI(p) {
  const D = takeFormDraft();
  return h('input', { className: 'ev-row-input', 'aria-label': p.name, type: p.type, defaultValue: D[p.name] ?? '', name: p.name }); /* prop order = React DOM: regular ก่อน แล้ว type,value,name ท้าย (SSR พิมพ์ตาม insertion order ตรงกัน) */
}
function Stepper(p) {
  return h('div', { className: 'ev-stepper' },
    h('span', {}, p.label),
    h('div', { className: 'ev-step' },
      h('button', { type: 'button', 'data-act': p.act, 'data-id': '-1', 'aria-label': 'ลด', disabled: p.v <= 1 ? true : undefined }, '−'),
      h('b', {}, p.v),
      h('button', { type: 'button', 'data-act': p.act, 'data-id': '1', 'aria-label': 'เพิ่ม' }, '+')),
    p.unit);
}

/* == พาเนลขั้นสูง (rep/range/rem) ตาม repPanel/rangePanel/remPanel == */
function RepPanel() {
  const D = takeFormDraft();
  const els = [h(Seg, { key: 's', act: 'dunit', opts: [['none', 'ไม่ซ้ำ'], ['day', 'วัน'], ['week', 'สัปดาห์'], ['month', 'เดือน']], cur: D.unit })];
  if (D.unit !== 'none') els.push(h(Stepper, { key: 'e', label: 'ทุก ๆ', act: 'devery', v: D.every, unit: h('span', {}, takeFormConsts().UNIT_TH[D.unit]) }));
  if (D.unit === 'week') els.push(h(Chips, { key: 'd', act: 'dday', opts: takeFormConsts().WEEK_OPTS, active: D.days }));
  return els;
}
function RangePanel(p) {
  const D = takeFormDraft();
  const els = [
    h('div', { key: 's', className: 'ev-stepper' }, h('span', {}, p.lab), h(RI, { name: 'start', type: 'date' })),
    h('div', { key: 'e', className: 'ev-stepper' }, h('span', {}, 'มีวันสิ้นสุด'),
      h('button', { type: 'button', className: 'ev-switch', role: 'switch', 'aria-checked': String(D.endMode === 'date'), 'data-act': 'dend', 'aria-label': 'มีวันสิ้นสุด' })),
  ];
  if (D.endMode === 'date') els.push(h('div', { key: 'd', className: 'ev-stepper' }, h('span', {}, 'สิ้นสุดวันที่'), h(RI, { name: 'end', type: 'date' })));
  return els;
}
function RemPanel() {
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
function RemRow() {
  /* notifyIssue ตามเดโม v24: เตือนเมื่อตั้งแจ้งก่อนถึงเวลาแต่ไม่มีเวลาทำรายการ พร้อมปุ่มปิดแจ้งเตือน */
  const issue = takeFormFns().notifyIssue();
  return [h(SR, { key: 'r', label: 'เตือน', val: takeFormFns().remSum(), k: 'rem' }), h(PN, { key: 'p', k: 'rem' }, h(RemPanel)),
    issue ? h('div', { key: 'e', className: 'ev-field-err', 'data-tone': 'hint', style: { padding: '6px 14px 12px' },
      dangerouslySetInnerHTML: raw(icon('alert') + '<span>' + issue + '</span><button type="button" data-act="rem-off">ปิดแจ้งเตือน</button>') }) : null];
}
function SET() { return h('div', { className: 'ev-set' }, ...arguments); }

/* == ขั้นที่ 1: เลือกประเภท (typeBody) == */
function TypeBody() {
  return h('div', { className: 'ev-types' }, Object.entries(takeFormFns().TYPE_INFO).map(([k, [ic, d]]) =>
    h('button', { key: k, className: 'ev-type', 'data-act': 'dtype', 'data-id': k },
      h('span', { key: 'o', className: 'orb', dangerouslySetInnerHTML: raw(icon(ic)) }),
      h('b', { key: 'n' }, TYPES[k]),
      h('span', { key: 'd', className: 'd' }, d))));
}

/* == ขั้นที่ 2: ฟอร์มตามประเภท (formBody) == */
function FormFields() {
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
function FormBody() {
  return h('form', { className: 'ev-form', id: 'addForm', noValidate: true }, h(FormFields));
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.typeBody = () => window.EvarelReact.renderToStaticMarkup(h(TypeBody));
window.EvarelPages.formBody = () => window.EvarelReact.renderToStaticMarkup(h(FormBody));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.typeBody = TypeBody;
window.EvarelComponents.formBody = FormBody;

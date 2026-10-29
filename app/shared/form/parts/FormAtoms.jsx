/**
 * ชิ้นเล็กของฟอร์มตาม template 14-ui__form: Chips Seg SR PN IR TR RI Stepper | ลำดับ attribute ตาม template เดิมทุกไบต์
 * อินพุตใช้ defaultValue (uncontrolled) เหมือนพฤติกรรมเดิม: พิมพ์แล้ว document input listener (25-actions) เขียน ST.D ระหว่างพิมพ์
 * ร่างฟอร์ม (ST.D) อ่านสดจากถาด takeFormDraft ทุกครั้งที่เรนเดอร์ | raw/icon ใช้ร่วมกับชิ้นส่วนอื่นของกล่องนี้ ประกาศที่นี่ที่เดียว
 */
import { esc } from '../../../src/core/dates.ts';
import { takeFormDraft, takeFormIcon } from '../form.tray.js';
export const raw = (html) => ({ __html: html });
export const icon = (n) => takeFormIcon().icon(n);

export function Chips(p) {
  return h('div', { className: 'ev-filters ev-wrap' }, p.opts.map(([k, l]) =>
    h('button', { key: k, type: 'button', 'aria-pressed': String(p.active.includes(k)), 'data-act': p.act, 'data-id': String(k) }, l)));
}
export function Seg(p) {
  return h('div', { className: 'ev-seg' }, p.opts.map(([k, l]) =>
    h('button', { key: k, type: 'button', 'aria-pressed': String(p.cur === k), 'data-act': p.act, 'data-id': String(k) }, l)));
}
export function SR(p) {
  const D = takeFormDraft();
  return h('button', { type: 'button', className: 'ev-set-row', 'data-act': 'dopen', 'data-id': p.k, 'aria-expanded': String(D.open === p.k) },
    h('span', {}, p.label),
    h('small', { dangerouslySetInnerHTML: raw(esc(p.val) + icon('chev')) }));
}
export function PN(p) {
  const D = takeFormDraft();
  return h('div', { className: 'ev-panel', 'data-key': p.k, 'data-open': String(D.open === p.k) },
    h('div', {}, h('div', { className: 'ev-panel-in' }, p.children)));
}
export function IR(p) {
  return h('div', { className: 'ev-set-row' }, h('span', {}, p.label), p.inner);
}
export function TR(p) {
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
export function RI(p) {
  const D = takeFormDraft();
  return h('input', { className: 'ev-row-input', 'aria-label': p.name, type: p.type, defaultValue: D[p.name] ?? '', name: p.name }); /* prop order = React DOM: regular ก่อน แล้ว type,value,name ท้าย (SSR พิมพ์ตาม insertion order ตรงกัน) */
}
export function Stepper(p) {
  return h('div', { className: 'ev-stepper' },
    h('span', {}, p.label),
    h('div', { className: 'ev-step' },
      h('button', { type: 'button', 'data-act': p.act, 'data-id': '-1', 'aria-label': 'ลด', disabled: p.v <= 1 ? true : undefined }, '−'),
      h('b', {}, p.v),
      h('button', { type: 'button', 'data-act': p.act, 'data-id': '1', 'aria-label': 'เพิ่ม' }, '+')),
    p.unit);
}

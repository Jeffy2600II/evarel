/* Path: app/js/core/undo.js | split mechanically from app.js (no logic edits) */
import { MAX_UNDO, UNDO_MS } from './constants.js';
import { esc } from './dates.js';
import { find } from './store.js';

/* ---------- Undo service: จับภาพก่อนแก้ แล้วคืนค่าได้ ---------- */
export const UNDO = { stack: [], timer: null };
export function pushUndo(entry) {
  UNDO.stack.push(entry); if (UNDO.stack.length > MAX_UNDO) UNDO.stack.shift();
  clearTimeout(UNDO.timer); UNDO.timer = setTimeout(() => { UNDO.last = null; renderToast(); }, UNDO_MS);
  UNDO.last = entry; renderToast();
}
export function doUndo() {
  const e = UNDO.stack.pop(); if (!e) return;
  e.restore();
  /* ถอยต่อได้: ถ้ายังมีรายการก่อนหน้า ให้ toast ชี้ไปที่รายการนั้น (กดถอยเป็นขั้นๆ ได้) */
  const prev = UNDO.stack[UNDO.stack.length - 1];
  clearTimeout(UNDO.timer);
  if (prev) { UNDO.last = prev; UNDO.timer = setTimeout(() => { UNDO.last = null; renderToast(); }, UNDO_MS); }
  else UNDO.last = null;
  renderToast();
}
/* บันทึกค่าเดิมของ log วันหนึ่ง แล้วคืนให้ตอนย้อนกลับ */
export function withUndo(it, ds, label, change) {
  const had = Object.prototype.hasOwnProperty.call(it.log, ds), old = it.log[ds], id = it.id;
  change();
  pushUndo({ label, restore: () => { const x = find(id); if (!x) return; if (had) x.log[ds] = old; else delete x.log[ds]; } });
}
export function renderToast() {
  const el = document.getElementById('toast'); if (!el) return;
  const e = UNDO.last;
  el.dataset.open = e ? 'true' : 'false';
  el.innerHTML = e ? `<span>${esc(e.label)}</span>${e.plain ? '' : '<button class="ev-toast-btn" data-act="undo">ย้อนกลับ</button>'}` : '';
}
/* ข้อความแจ้งสั้นๆ (ไม่มีปุ่มย้อนกลับ) ใช้ toast ตัวเดียวกัน */
export function toast(msg) { UNDO.last = { label: msg, restore: null, plain: true }; clearTimeout(UNDO.timer); UNDO.timer = setTimeout(() => { UNDO.last = null; renderToast(); }, UNDO_MS); renderToast(); }

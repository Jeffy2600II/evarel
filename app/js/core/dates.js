/* Path: app/js/core/dates.js | split mechanically from app.js (no logic edits) */

/* ---------- Date helpers ---------- */
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => new Date(`${s}T00:00:00`);
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const TODAY = ymd(new Date());
/* escape ข้อความผู้ใช้ก่อนแทรกลง HTML ทุกครั้ง (กัน XSS) */
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isFuture = ds => ds > TODAY;

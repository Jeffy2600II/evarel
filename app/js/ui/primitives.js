/* Path: app/js/ui/primitives.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { ICONS, TYPES } from '../core/constants.js';
import { TODAY, esc, pad } from '../core/dates.js';
import { UI } from '../core/store.js';
import { fmtClock, timerMs } from '../core/timer.js';
import { isDone, target, timeText, tracked, val } from '../services/schedule.js';

/* ---------- UI primitives ---------- */
export const icon = n => `<svg class="ev-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
export const empty = (t, h) => `<div class="ev-empty"><h3>${t}</h3><p>${h}</p></div>`;
export const skeleton = () => `<div class="ev-main"><div class="ev-skeleton"></div><div class="ev-skeleton"></div><div class="ev-skeleton"></div></div>`;
export const header = (sub, title) => `<header class="ev-header"><span class="ev-sub">${sub}</span><div class="ev-row">
  <button class="ev-icon-btn" data-tone="accent" data-act="ai" aria-label="ผู้ช่วย AI">${icon('spark')}</button>
  <button class="ev-avatar" data-act="settings" aria-label="ตั้งค่า">J</button></div></header><h1 class="ev-title">${title}</h1>`;
export const chipsRow = (act, opts, cur) => `<div class="ev-filters" role="group">${opts.map(([k, l]) => `<button aria-pressed="${cur === k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
/* ปุ่มควบคุมตัวจับเวลา: เริ่ม / หยุดชั่วคราว+จบ / ต่อ */
export function timerControls(it, ds) {
  const mine = ST.TIMER && ST.TIMER.id == it.id && ST.TIMER.date === ds;
  if (mine) return `<button class="ev-mini" data-tone="${ST.TIMER.startedAt ? 'ok' : ''}" data-act="timeropen" data-id="${it.id}" aria-label="เปิดหน้าจับเวลา"><span class="ev-clock" data-clock="${it.id}" style="color:inherit;min-width:0">${fmtClock(timerMs())}</span></button>`;
  return `<button class="ev-mini" data-act="timeropen" data-id="${it.id}" aria-label="เปิดหน้าจับเวลา">${icon('play')}</button>`;
}
/* งานที่ครบกำหนดแล้วแต่ยังไม่เสร็จ */
export const overdue = (it, ds) => it.type === 'task' && tracked(it) && it.start < ds && !isDone(it, it.start) && ds === TODAY;
export const overdueList = () => ST.S.items.filter(it => it.type === 'task' && tracked(it) && it.repeat.unit === 'none' && it.start < TODAY && !isDone(it, it.start))
  .sort((a, b) => a.start.localeCompare(b.start));
/* สรุปหัวการ์ดวันนี้: บอกสิ่งที่ผู้ใช้ต้องรู้ก่อน แล้วค่อยรายละเอียด */
export const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
export function summaryHead(tr, done) {
  if (!tr.length) return 'วันนี้ไม่มีอะไรต้องติ๊ก';
  if (done === tr.length) return 'ทำครบทุกอย่างแล้ว';
  return `ทำแล้ว ${done} จาก ${tr.length}`;
}
export function summarySub(list, tr, done) {
  if (tr.length && done === tr.length) return 'วันนี้เสร็จหมดแล้ว พักได้เลย';
  const next = list.filter(it => tracked(it) && !isDone(it, UI.date)).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const upcoming = UI.date === TODAY ? (next.find(it => it.time && it.time >= nowHM()) || next[0]) : next[0];
  if (upcoming) return `${UI.date === TODAY ? 'ถัดไป' : 'รายการแรก'}: ${esc(upcoming.title)}${upcoming.time ? ` · ${upcoming.time} น.` : ''}`;
  const others = list.length - tr.length;
  return others ? `มี ${others} คาบเรียน/นัดหมายในวันนี้` : 'ว่างทั้งวัน';
}
export const TYPE_ICON = { habit: 'repeat', task: 'task', event: 'event', class: 'book' };
/* ข้อความความคืบหน้าของกิจวัตรแบบนับ/จับเวลา: บอกสิ่งที่เหลือ ไม่ใช่แค่เลข */
export function progressText(it, v, tg) {
  const unit = esc(it.unitName || (it.track === 'timer' ? 'นาที' : ''));
  if (v >= tg) return v > tg ? `ครบแล้ว (${v}/${tg} ${unit})`.trim() : `ครบแล้ว ${v}/${tg} ${unit}`.trim();
  if (it.track === 'count') return `${v}/${tg} ${unit}`.trim();
  return `${v}/${tg} ${unit} · เหลืออีก ${tg - v}`.replace(/\s+/g, ' ').trim();
}
export function itemRow(it, ds) {
  const v = val(it, ds), tg = target(it), done = tracked(it) && isDone(it, ds), multi = it.track === 'count' || it.track === 'timer';
  const lead = it.track === 'check'
    ? `<button class="ev-check" role="checkbox" aria-checked="${done}" aria-label="ทำแล้ว" data-act="check" data-id="${it.id}">${icon('check')}</button>`
    : `<span class="ev-type" data-type="${it.type}" role="img" aria-label="${TYPES[it.type]}">${icon(TYPE_ICON[it.type])}</span>`;
  const tail = it.track === 'count'
    ? `<div class="ev-step"><button data-act="dec" data-id="${it.id}" aria-label="ลด">−</button><button data-act="inc" data-id="${it.id}" aria-label="เพิ่ม">+</button></div>`
    : it.track === 'timer' ? timerControls(it, ds) : '';
  const rem = tg - v;
  const remAttr = (it.track === 'count' && rem > 0) ? ` title="เหลืออีก ${rem}" aria-label="เหลืออีก ${rem}"` : '';
  const sub = [timeText(it), multi ? progressText(it, v, tg) : esc(it.subject), it.type === 'task' && overdue(it, ds) ? 'เลยวันส่ง' : ''].filter(Boolean).join(' · ');
  return `<li class="ev-list-item" data-state="${done ? 'done' : 'todo'}">${lead}<div class="grow"><b>${esc(it.title)}</b><span class="ev-sub"${remAttr}>${sub}</span>${multi ? `<div class="ev-bar"><i style="width:${Math.min(100, v / tg * 100)}%"></i></div>` : ''}</div>${tail}${kebab(it)}</li>`;
}
/* ---------- เมนูสามจุด (dropdown) ---------- */
export const kebab = it => `<button class="ev-kebab" data-act="menu" data-id="${it.id}" aria-label="ตัวเลือกของ ${esc(it.title)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button>`;

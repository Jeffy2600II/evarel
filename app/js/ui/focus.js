/* Path: app/js/ui/focus.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { TYPES } from '../core/constants.js';
import { esc, isFuture } from '../core/dates.js';
import { pushLayerState, syncLayer } from '../core/history.js';
import { UI, find } from '../core/store.js';
import { fmtClock, timerMs } from '../core/timer.js';
import { toast } from '../core/undo.js';
import { target, val } from '../services/schedule.js';
import { closeMenu } from './menu.js';
import { icon } from './primitives.js';
import { closeSheet } from './sheet.js';

/* ---------- หน้าจับเวลาเต็มจอ ---------- */
export const focusEl = document.getElementById('focus');
export const liveBar = document.createElement('button');
export function renderLive() {
  if (!ST.TIMER || ST.FOCUS_ID) { liveBar.hidden = true; return; }
  const it = find(ST.TIMER.id); if (!it) { liveBar.hidden = true; return; }
  liveBar.hidden = false; liveBar.dataset.id = it.id; liveBar.dataset.run = String(!!ST.TIMER.startedAt);
  liveBar.innerHTML = `<i></i><span>${ST.TIMER.startedAt ? 'กำลังจับเวลา' : 'หยุดชั่วคราว'} · ${esc(it.title)}</span><b data-clock="${it.id}">${fmtClock(timerMs())}</b>`;
}
export function focusHTML(it) {
  const mine = ST.TIMER && ST.TIMER.id == it.id, run = mine && !!ST.TIMER.startedAt, ms = mine ? timerMs() : 0;
  const goalMs = target(it) * 60000, base = val(it, mine ? ST.TIMER.date : UI.date) * 60000, p = Math.min(100, (base + ms) / goalMs * 100);
  const state = !mine ? 'พร้อมเริ่ม' : run ? 'กำลังจับเวลา' : 'หยุดชั่วคราว';
  const main = !mine
    ? `<div><button class="ev-round" data-big="true" data-act="tstart" data-id="${it.id}" aria-label="เริ่ม">${icon('play')}</button><span class="ev-round-label">เริ่ม</span></div>`
    : `<div><button class="ev-round" data-act="tstop" data-id="${it.id}" aria-label="จบและบันทึก" data-tone="ok">${icon('check')}</button><span class="ev-round-label">จบ</span></div>
       <div><button class="ev-round" data-big="true" data-act="${run ? 'tpause' : 'tresume'}" data-id="${it.id}" aria-label="${run ? 'หยุดชั่วคราว' : 'ทำต่อ'}">${icon(run ? 'pause' : 'play')}</button><span class="ev-round-label">${run ? 'หยุด' : 'ทำต่อ'}</span></div>
       <div><button class="ev-round" data-act="tcancel" data-id="${it.id}" aria-label="ยกเลิกโดยไม่บันทึก">${icon('x')}</button><span class="ev-round-label">ยกเลิก</span></div>`;
  return `<div class="ev-focus-top"><button class="ev-icon-btn" data-act="focusclose" aria-label="ย่อหน้าจับเวลา">${icon('down')}</button><span class="ev-sub">${TYPES[it.type]}</span><span style="width:44px"></span></div>
    <div class="ev-focus-body"><div><h2 class="ev-focus-title">${esc(it.title)}</h2><p class="ev-focus-state" id="focusState">${state}</p></div>
      <div class="ev-dial" id="dial" style="--p:${p}"><div class="ev-dial-face"><span class="ev-digits" id="digits" data-run="${run}" data-clock="${it.id}">${fmtClock(ms)}</span><span class="ev-goal">วันนี้ ${val(it, UI.date)}/${target(it)} ${esc(it.unitName)}</span></div></div>
      <div class="ev-focus-actions">${main}</div></div>`;
}
export function openFocus(id) { pushLayerState('focus');
  const it = find(id); if (!it || it.track !== 'timer') return;
  if (isFuture(UI.date) && !(ST.TIMER && ST.TIMER.id == id)) return toast('ยังไม่ถึงวันนี้ จับเวลาล่วงหน้าไม่ได้');
  closeMenu(true); closeSheet(); ST.FOCUS_RET = document.activeElement; ST.FOCUS_ID = +id; syncLayer();
  focusEl.hidden = false; focusEl.innerHTML = focusHTML(it);
  requestAnimationFrame(() => { focusEl.dataset.open = 'true'; focusEl.querySelector('[data-big]')?.focus(); });
  renderLive(); acquireWake();
}
export function refreshFocus() { const it = ST.FOCUS_ID && find(ST.FOCUS_ID); if (!it) return closeFocus(); focusEl.innerHTML = focusHTML(it); focusEl.querySelector('[data-big]')?.focus(); }
export function closeFocus() {
  const wasOpen = !!ST.FOCUS_ID;
  ST.FOCUS_ID = null; syncLayer(); focusEl.dataset.open = 'false'; setTimeout(() => { if (!ST.FOCUS_ID) { focusEl.hidden = true; focusEl.innerHTML = ''; } }, 300);
  renderLive(); releaseWake(); try { ST.FOCUS_RET?.focus?.({ preventScroll: true }); } catch {}
  if (wasOpen && history.state?.layer === 'focus') history.back();
}
export async function acquireWake() { try { if ('wakeLock' in navigator && !ST.WAKE) { ST.WAKE = await navigator.wakeLock.request('screen'); ST.WAKE.addEventListener('release', () => { ST.WAKE = null; }); } } catch { /* ไม่รองรับก็ข้าม */ } }
export function releaseWake() { try { ST.WAKE?.release(); } catch {} ST.WAKE = null; }

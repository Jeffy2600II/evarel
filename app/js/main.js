/* Path: app/js/main.js | split mechanically from app.js (no logic edits) */
import { register } from './core/bus.js';
import { ST } from './core/state.js';
import { ACTIONS, FORM, NOREDRAW, validateDraft } from './actions.js';
import { SKELETON_MS, TABS } from './core/constants.js';
import { menuEl, scrim, sheetEl } from './core/dom.js';
import { syncLayer } from './core/history.js';
import { AIUI } from './core/state-ui.js';
import { UI, normalize, saveState } from './core/store.js';
import { ensureTick, fmtClock, saveTimer, timerMs } from './core/timer.js';
import { pushUndo, renderToast, toast } from './core/undo.js';
import { handleRoute, navBack } from './router.js';
import { niceDate, target } from './services/schedule.js';
import { acquireWake, closeFocus, focusEl, liveBar, refreshFocus, releaseWake, renderLive } from './ui/focus.js';
import { buildItem, openAdd, remBlock, renderForm, timeLabel } from './ui/form.js';
import { closeMenu } from './ui/menu.js';
import { icon, skeleton } from './ui/primitives.js';
import { closeSheet } from './ui/sheet.js';
import { aiSend, autosize, closeAI, drawerEl, drawerScrim, renderDrawer } from './views/ai.js';
import { VIEWS } from './views/views.js';

liveBar.className = 'ev-live';
 liveBar.hidden = true;
 liveBar.dataset.act = 'timeropen';
 liveBar.setAttribute('aria-label', 'กลับไปหน้าจับเวลา');
document.body.appendChild(liveBar);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ST.FOCUS_ID) { acquireWake(); const d = document.getElementById('digits'); if (d) d.textContent = fmtClock(timerMs()); } });
window.addEventListener('hashchange', () => {
  if (!history.state?.layer && sheetEl.dataset.open !== 'true' && !ST.MENU_FOR && !ST.FOCUS_ID) {
    handleRoute();
  }
});
window.addEventListener('popstate', e => {
  if (sheetEl.dataset.open === 'true') {
    sheetEl.dataset.open = scrim.dataset.open = 'false';
    syncLayer();
    return;
  }
  if (ST.MENU_FOR) {
    if (ST.MENU_BTN) { ST.MENU_BTN.setAttribute('aria-expanded', 'false'); try { ST.MENU_BTN.focus({ preventScroll: true }); } catch {} }
    ST.MENU_FOR = null; ST.MENU_BTN = null; menuEl.dataset.open = 'false'; menuEl.hidden = true;
    return;
  }
  if (ST.FOCUS_ID) {
    ST.FOCUS_ID = null; syncLayer(); focusEl.dataset.open = 'false'; setTimeout(() => { if (!ST.FOCUS_ID) { focusEl.hidden = true; focusEl.innerHTML = ''; } }, 300);
    renderLive(); releaseWake();
    return;
  }
  handleRoute();
});
 drawerScrim.className = 'ev-drawer-scrim';
 drawerScrim.dataset.act = 'aidrawer-close';
 document.body.appendChild(drawerScrim);
 drawerEl.className = 'ev-drawer';
 drawerEl.setAttribute('aria-label', 'ประวัติแชท');
 drawerEl.setAttribute('role', 'dialog');
 document.body.appendChild(drawerEl);
document.addEventListener('click', e => {
  /* คลิกนอกเมนู = ปิดเมนู */
  if (ST.MENU_FOR && !e.target.closest('#menu') && !e.target.closest('[data-act="menu"]')) closeMenu();
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  const res = ACTIONS[act]?.(el.dataset.id, el);
  saveState();
  if (res === NOREDRAW) { renderToast(); renderLive(); return; }
  if (res === FORM) renderForm(); else render();
  /* ถ้าหน้าจับเวลาเปิดอยู่ ให้รีเฟรชปุ่มตามสถานะ */
  if (ST.FOCUS_ID && ['tstart', 'tpause', 'tresume', 'tstop', 'tcancel'].includes(act)) { if (act === 'tstop') { closeFocus(); } else refreshFocus(); }
  renderLive();
});
document.addEventListener('submit', e => { if (e.target.id === 'aiForm') { e.preventDefault(); aiSend(); } });
document.addEventListener('input', e => {
  if (e.target.id === 'aiText') { autosize(e.target); const b = document.getElementById('aiSend'); if (b) b.disabled = !e.target.value.trim() || AIUI.busy; }
  if (e.target.id === 'aiSearch') { AIUI.q = e.target.value; const pos = e.target.selectionStart; renderDrawer(); const s = document.getElementById('aiSearch'); s?.focus(); try { s.setSelectionRange(pos, pos); } catch {} }
});
/* Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่ (ไม่ส่งตอนกำลังพิมพ์ภาษาด้วย IME) */
document.addEventListener('keydown', e => {
  if (e.target.id === 'aiText' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(hover:hover)').matches) { e.preventDefault(); aiSend(); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (ST.MENU_FOR) return closeMenu();
  if (AIUI.open) { if (AIUI.drawer) { AIUI.drawer = false; return renderDrawer(); } return closeAI(); }
  if (ST.MENU_FOR) return closeMenu();
  if (ST.FOCUS_ID) return closeFocus();
  if (sheetEl.dataset.open === 'true') return closeSheet();
  if (UI.tab === 'settings') navBack(); /* หน้าตั้งค่าเดิมเป็นหน้าต่างล่างที่ Esc ปิดได้ คงพฤติกรรมเดิมไว้ */
});
document.addEventListener('change', e => { if (e.target.closest('#addForm') && e.target.name in ST.D) ST.D[e.target.name] = e.target.value; });
document.addEventListener('input', e => {
  if (!e.target.closest('#addForm') || !(e.target.name in ST.D)) return;
  const had = !!ST.D.time; ST.D[e.target.name] = e.target.value;
  /* เวลาของรายการเพิ่งมี/หาย -> วาดเฉพาะส่วนเตือนใหม่ (ไม่แตะช่องที่กำลังพิมพ์) */
  if (e.target.name === 'time' && had !== !!ST.D.time) {
    /* ล้างเวลาแล้ว เตือนแบบ "ก่อน…" ไม่มีเวลาให้อ้างอิง -> เอาออกและบอกผู้ใช้ตรงๆ (ไม่ปล่อยเตือนที่ไม่มีวันยิง) */
    if (!ST.D.time) {
      const dropped = ST.D.reminders.filter(r => r.k === 'before');
      if (dropped.length) { ST.D.reminders = ST.D.reminders.filter(r => r.k !== 'before'); toast(`เอาการเตือน “ก่อนเวลา” ออก ${dropped.length} รายการ เพราะไม่มี${timeLabel(ST.D.type)}แล้ว`); }
      if (ST.D.remMode === 'before') ST.D.remMode = 'at';
    }
    const blk = document.getElementById('remBlock'); if (!blk) return;
    const tmp = document.createElement('div'); tmp.innerHTML = remBlock(); blk.replaceWith(tmp.firstElementChild);
  }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'addForm') return; /* ฟอร์มอื่น (เช่น แชท AI) มีตัวจัดการของตัวเอง */
  e.preventDefault();
  const bad = validateDraft();
  if (bad) {
    const box = document.getElementById('formErr'); if (box) { box.textContent = bad; box.hidden = false; }
    /* พาโฟกัสไปที่ช่องที่ต้องแก้ ผู้ใช้ไม่ต้องหาเอง */
    const target = !ST.D.title.trim() ? 'title' : !ST.D.start ? 'start' : /เวลา/.test(bad) ? (ST.D.time && ST.D.timeEnd ? 'timeEnd' : 'time') : /เป้าหมาย/.test(bad) ? 'target' : /ทุกกี่|จำนวน/.test(bad) ? 'every' : /สิ้นสุด/.test(bad) ? 'end' : '';
    if (target) document.querySelector(`#addForm [name="${target}"]`)?.focus();
    return;
  }
  const next = buildItem();
  if (ST.D.editId) {
    const idx = ST.S.items.findIndex(x => x.id == ST.D.editId), prev = ST.S.items[idx];
    if (idx < 0) { closeSheet(); return toast('ไม่พบรายการนี้แล้ว'); }
    /* เก็บประวัติเดิมไว้เสมอ ยกเว้นวิธีติดตามเปลี่ยนความหมาย (เช่น ติ๊ก -> จับเวลา) จึงล้าง log เฉพาะกรณีนั้น */
    const sameMeaning = prev.track === next.track && (prev.track === 'check' || prev.track === 'none' || prev.unitName === next.unitName);
    next.log = sameMeaning ? prev.log : {}; next.skips = prev.skips || {};
    const firstLog = Object.keys(next.log).filter(k => next.log[k] > 0).sort()[0];
    if (firstLog && next.start > firstLog && !ST.D._okStart) {
      const box = document.getElementById('formErr');
      if (box) { box.textContent = `วันเริ่มใหม่ (${niceDate(next.start)}) อยู่หลังบันทึกเก่าที่เคยทำไว้ (${niceDate(firstLog)}) บันทึกช่วงก่อนหน้านั้นจะไม่ถูกนับในสถิติ กด “บันทึกการแก้ไข” อีกครั้งถ้าต้องการต่อ`; box.hidden = false; }
      ST.D._okStart = true; return;
    }
    if (ST.TIMER && ST.TIMER.id == prev.id && next.track !== 'timer') { ST.TIMER = null; saveTimer(); ensureTick(); }
    const snapshot = prev;
    ST.S.items[idx] = next;
    pushUndo({ label: `แก้ไข “${next.title}” แล้ว`, restore: () => { const k = ST.S.items.findIndex(x => x.id == next.id); if (k >= 0) ST.S.items[k] = snapshot; } });
  } else {
    const dup = ST.S.items.some(x => x.type === next.type && x.title.trim().toLowerCase() === next.title.toLowerCase());
    ST.S.items.push(next);
    pushUndo({ label: dup ? `เพิ่ม “${next.title}” แล้ว (มีชื่อนี้อยู่แล้ว)` : `เพิ่ม “${next.title}” แล้ว`, restore: () => { ST.S.items = ST.S.items.filter(x => x.id != next.id); } });
  }
  saveState(); closeSheet(); render();
});
/* เลือกไฟล์สำรอง: ตรวจรูปแบบก่อนแทนที่ และเก็บสำเนาข้อมูลเดิมให้ย้อนกลับได้ */
document.addEventListener('change', async e => {
  if (e.target.id !== 'importFile') return;
  const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
  try {
    if (f.size > 5e6) throw new Error('ไฟล์ใหญ่เกินไป');
    const j = JSON.parse(await f.text());
    if (j?.app !== 'evarel' || !Array.isArray(j?.data?.items)) throw new Error('ไม่ใช่ไฟล์สำรองของ Evarel');
    const next = normalize(j.data), prev = ST.S;
    ST.S = next; saveState(); closeSheet(); render();
    pushUndo({ label: `นำข้อมูลกลับมาแล้ว ${next.items.length} รายการ`, restore: () => { ST.S = prev; } });
  } catch (err) { toast(err.message === 'ไฟล์ใหญ่เกินไป' || err.message.startsWith('ไม่ใช่') ? err.message : 'อ่านไฟล์ไม่ได้ ลองเลือกไฟล์สำรองของ Evarel'); }
});
scrim.addEventListener('click', closeSheet);
document.getElementById('fab').addEventListener('click', () => openAdd(UI.tab === 'schedule' ? 'class' : UI.tab === 'stats' ? 'habit' : 'task'));
document.getElementById('nav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { if (location.hash === '#/' + b.dataset.tab) handleRoute(); } });
/* ---------- Render ---------- */
function render() {
  document.getElementById('app').innerHTML = UI.loading ? skeleton() : VIEWS[UI.tab]();
  document.getElementById('nav').innerHTML = TABS.map(([id, label, ic]) => `<li><a href="#/${id}" data-tab="${id}" ${UI.tab === id ? 'aria-current="page"' : ''}>${icon(ic)}${label}</a></li>`).join('');
  document.getElementById('fab').innerHTML = icon('plus');
  renderToast();
  renderLive();
  ensureTick();
}
register('render', render);
handleRoute();
ensureTick();
setTimeout(() => { UI.loading = false; handleRoute(); ensureTick(); }, SKELETON_MS);
window.addEventListener('evarel-update', () => { if (ST.updateShown) return; ST.updateShown = true; toast('มีเวอร์ชันใหม่ ปิดแล้วเปิดแอปใหม่เพื่อใช้งาน'); });
/* test-hooks: every exported name is reachable as a window global (parity with the old single-file app) */
const __ns = await Promise.all([import('./actions.js'), import('./core/constants.js'), import('./core/dates.js'), import('./core/dom.js'), import('./core/history.js'), import('./core/seed.js'), import('./core/state-ui.js'), import('./core/store.js'), import('./core/timer.js'), import('./core/undo.js'), import('./router.js'), import('./services/chat-store.js'), import('./services/reminders.js'), import('./services/schedule.js'), import('./ui/focus.js'), import('./ui/form.js'), import('./ui/menu.js'), import('./ui/primitives.js'), import('./ui/sheet.js'), import('./views/ai.js'), import('./views/settings.js'), import('./views/views.js')]);
for (const mod of __ns) for (const k of Object.keys(mod)) if (!(k in window)) Object.defineProperty(window, k, { get: () => mod[k], configurable: true });
Object.defineProperty(window, 'S', { get: () => ST.S, set: v => { ST.S = v; }, configurable: true });
Object.defineProperty(window, 'D', { get: () => ST.D, set: v => { ST.D = v; }, configurable: true });
Object.defineProperty(window, 'TIMER', { get: () => ST.TIMER, set: v => { ST.TIMER = v; }, configurable: true });
Object.defineProperty(window, 'TICK', { get: () => ST.TICK, set: v => { ST.TICK = v; }, configurable: true });
Object.defineProperty(window, 'MENU_FOR', { get: () => ST.MENU_FOR, set: v => { ST.MENU_FOR = v; }, configurable: true });
Object.defineProperty(window, 'MENU_BTN', { get: () => ST.MENU_BTN, set: v => { ST.MENU_BTN = v; }, configurable: true });
Object.defineProperty(window, 'FOCUS_ID', { get: () => ST.FOCUS_ID, set: v => { ST.FOCUS_ID = v; }, configurable: true });
Object.defineProperty(window, 'FOCUS_RET', { get: () => ST.FOCUS_RET, set: v => { ST.FOCUS_RET = v; }, configurable: true });
Object.defineProperty(window, 'WAKE', { get: () => ST.WAKE, set: v => { ST.WAKE = v; }, configurable: true });
Object.defineProperty(window, 'updateShown', { get: () => ST.updateShown, set: v => { ST.updateShown = v; }, configurable: true });

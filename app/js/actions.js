/* Path: app/js/actions.js | split mechanically from app.js (no logic edits) */
import { ST } from './core/state.js';
import { HHMM, MAX_REMINDERS, TIMER_STEP, cleanReminders } from './core/constants.js';
import { TODAY, isFuture } from './core/dates.js';
import { AIUI } from './core/state-ui.js';
import { UI, find } from './core/store.js';
import { ensureTick, saveTimer, timerMin, timerMs } from './core/timer.js';
import { doUndo, pushUndo, toast, withUndo } from './core/undo.js';
import { navBack, navigate } from './router.js';
import { ChatStore } from './services/chat-store.js';
import { isDone, val } from './services/schedule.js';
import { closeFocus, openFocus } from './ui/focus.js';
import { openAdd, openEdit, renderForm, timeLabel, toggle } from './ui/form.js';
import { closeMenu, openChatMenu, openMenu } from './ui/menu.js';
import { closeSheet } from './ui/sheet.js';
import { aiSend, chatTitle, closeAI, drawerEl, renderAI, renderDrawer } from './views/ai.js';
import { openSettings } from './views/settings.js';

export const bump = (id, n, label) => {
  const it = find(id); if (!it) return;
  if (isFuture(UI.date)) return toast('ยังไม่ถึงวันนี้ บันทึกล่วงหน้าไม่ได้');
  const next = Math.max(0, val(it, UI.date) + n); if (next === val(it, UI.date)) return;
  withUndo(it, UI.date, label || `${n > 0 ? 'เพิ่ม' : 'ลด'} ${Math.abs(n)} ${it.unitName || ''}`.trim(), () => { it.log[UI.date] = next; });
};
export const FORM = 'form';
/* หยุดตัวจับเวลาที่กำลังทำอยู่ (ถ้ามี) แล้วบันทึกนาทีเข้า log ของวันที่เริ่ม */
export function commitTimer(label) {
  if (!ST.TIMER) return 0;
  const it = find(ST.TIMER.id), min = timerMin(timerMs()), ds = ST.TIMER.date;
  ST.TIMER = null; saveTimer(); ensureTick();
  if (it && min > 0) withUndo(it, ds, label || `บันทึก ${min} นาที`, () => { it.log[ds] = val(it, ds) + min; });
  else if (it) toast('ไม่ถึง 1 นาที จึงไม่บันทึก');
  return min;
}
export const ACTIONS = {
  check: id => { const it = find(id); if (!it) return;
    if (isFuture(UI.date)) return toast('ยังไม่ถึงวันนี้ ติ๊กล่วงหน้าไม่ได้');
    const was = isDone(it, UI.date); withUndo(it, UI.date, was ? `ยกเลิก “${it.title}”` : `ทำแล้ว “${it.title}”`, () => { it.log[UI.date] = was ? 0 : 1; }); },
  checkdue: id => { const it = find(id); if (it) withUndo(it, it.start, `ทำแล้ว “${it.title}”`, () => { it.log[it.start] = 1; }); },
  /* สำรอง/นำกลับข้อมูลเป็นไฟล์ JSON (ยังไม่มีบัญชี จึงเป็นทางเดียวที่ย้ายเครื่องหรือกันข้อมูลหาย) */
  export: () => {
    const blob = new Blob([JSON.stringify({ app: 'evarel', version: 1, exportedAt: new Date().toISOString(), data: ST.S }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `evarel-backup-${TODAY}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`สำรองแล้ว ${ST.S.items.length} รายการ`); return NOREDRAW;
  },
  import: () => { document.getElementById('importFile')?.click(); return NOREDRAW; },
  inc: id => bump(id, 1), dec: id => bump(id, -1),
  /* ตัวจับเวลา: ทีละตัวเท่านั้น, เก็บเป็น timestamp */
  tstart: id => { if (isFuture(UI.date)) return toast('ยังไม่ถึงวันนี้ จับเวลาล่วงหน้าไม่ได้');
    if (ST.TIMER && ST.TIMER.id != id) commitTimer(); /* เริ่มตัวใหม่ = จบตัวเก่าและบันทึกให้ */
    ST.TIMER = { id: +id, date: UI.date, startedAt: Date.now(), acc: 0 }; saveTimer(); ensureTick(); },
  tpause: () => { if (!ST.TIMER || !ST.TIMER.startedAt) return; ST.TIMER.acc += Date.now() - ST.TIMER.startedAt; ST.TIMER.startedAt = null; saveTimer(); ensureTick(); },
  tresume: () => { if (!ST.TIMER || ST.TIMER.startedAt) return; ST.TIMER.startedAt = Date.now(); saveTimer(); ensureTick(); },
  tstop: () => { commitTimer(); },
  tdec: id => bump(id, -TIMER_STEP, `ลด ${TIMER_STEP} นาที`),
  undo: doUndo,
  /* เมนูสามจุด */
  menu: (id, el) => { openMenu(el, id); return NOREDRAW; },
  'm-edit': id => { openEdit(id); return NOREDRAW; },
  'm-timeropen': id => { closeMenu(true); openFocus(id); return NOREDRAW; },
  'm-reset': id => { const it = find(id); closeMenu(); if (it && val(it, UI.date) > 0) withUndo(it, UI.date, `ล้างบันทึก “${it.title}”`, () => { delete it.log[UI.date]; }); },
  'm-skip': id => { const it = find(id); closeMenu(); if (!it) return; const had = !!it.skips[UI.date]; it.skips[UI.date] = true;
    pushUndo({ label: `ข้าม “${it.title}” วันนี้`, restore: () => { const x = find(id); if (x) { if (had) x.skips[UI.date] = true; else delete x.skips[UI.date]; } } }); },
  'm-unskip': id => { const it = find(id); closeMenu(); if (!it) return; const ds = UI.date; delete it.skips[ds];
    pushUndo({ label: `ยกเลิกการข้าม “${it.title}”`, restore: () => { const x = find(id); if (x) x.skips[ds] = true; } }); },
  'm-dup': id => { const it = find(id); closeMenu(); if (!it) return;
    const copy = { ...structuredClone(it), id: Date.now(), title: `${it.title} (สำเนา)`, log: {}, skips: {} };
    ST.S.items.push(copy); pushUndo({ label: `ทำสำเนา “${it.title}” แล้ว`, restore: () => { ST.S.items = ST.S.items.filter(x => x.id != copy.id); } }); },
  'm-del': id => { closeMenu(); return ACTIONS.del(id); },
  /* หน้าจับเวลาเต็มจอ */
  timeropen: id => { openFocus(id); return NOREDRAW; },
  focusclose: () => { closeFocus(); },
  tcancel: () => { if (!ST.TIMER) return; ST.TIMER = null; saveTimer(); ensureTick(); toast('ยกเลิกการจับเวลาแล้ว (ไม่บันทึก)'); },
  /* เตือนอิสระ */
  radd: () => { const v = (ST.D.remTime || '').trim(); if (!HHMM.test(v)) return toast('เลือกเวลาที่จะให้เตือนก่อน');
    if (ST.D.reminders.length >= MAX_REMINDERS) return toast(`ตั้งเตือนได้สูงสุด ${MAX_REMINDERS} ครั้ง`);
    ST.D.reminders = cleanReminders([...D.reminders, { k: 'at', t: v }]); ST.D.remTime = ''; return FORM; },
  rrem: id => { ST.D.reminders.splice(+id, 1); return FORM; },
  rmode: id => { ST.D.remMode = id; ST.D._modePicked = true; return FORM; },
  rcustom: () => { const n = Math.round(+ST.D.remNum), u = +ST.D.remUnit || 1, m = n * u;
    if (!(n >= 1)) return toast('ใส่ตัวเลขก่อน เช่น 15');
    if (m > 10080) return toast('ล่วงหน้าได้มากสุด 7 วัน');
    if (ST.D.reminders.length >= MAX_REMINDERS) return toast(`ตั้งเตือนได้สูงสุด ${MAX_REMINDERS} ครั้ง`);
    ST.D.reminders = cleanReminders([...D.reminders, { k: 'before', m }]); ST.D.remNum = ''; return FORM; },
  rday: () => { const d = Math.round(+ST.D.remDays), tm = ST.D.remTime || '18:00';
    if (!(d >= 1 && d <= 30)) return toast('ใส่จำนวนวันระหว่าง 1-30');
    if (!HHMM.test(tm)) return toast('เลือกเวลาที่จะให้เตือนก่อน');
    if (ST.D.reminders.length >= MAX_REMINDERS) return toast(`ตั้งเตือนได้สูงสุด ${MAX_REMINDERS} ครั้ง`);
    ST.D.reminders = cleanReminders([...D.reminders, { k: 'day', d, t: tm }]); return FORM; },
  rquick: id => { const m = +id, i = ST.D.reminders.findIndex(r => r.k === 'before' && r.m === m);
    if (i >= 0) ST.D.reminders.splice(i, 1); else if (ST.D.reminders.length < MAX_REMINDERS) ST.D.reminders = cleanReminders([...D.reminders, { k: 'before', m }]); else toast(`ตั้งเตือนได้สูงสุด ${MAX_REMINDERS} ครั้ง`); return FORM; },
  date: id => { UI.date = id; }, type: id => { UI.type = id; }, cday: id => { UI.cday = +id; },
  del: id => { const idx = ST.S.items.findIndex(x => x.id == id); if (idx < 0) return; const [gone] = ST.S.items.splice(idx, 1);
    if (ST.TIMER && ST.TIMER.id == gone.id) { ST.TIMER = null; saveTimer(); ensureTick(); }
    pushUndo({ label: `ลบ “${gone.title}” แล้ว`, restore: () => { if (!ST.S.items.some(x => x.id == gone.id)) ST.S.items.splice(Math.min(idx, ST.S.items.length), 0, gone); } }); },
  ai: () => { navigate('ai'); return NOREDRAW; }, close: () => { if (UI.tab === 'settings') { navBack(); return NOREDRAW; } closeSheet(); },
  settings: () => { navigate('settings'); return NOREDRAW; },
  notify: async () => { if (!('Notification' in window)) return toast('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน'); const p = await Notification.requestPermission(); openSettings(); toast(p === 'granted' ? 'อนุญาตแล้ว' : p === 'denied' ? 'ถูกปฏิเสธ ต้องไปเปิดในตั้งค่าเบราว์เซอร์' : 'ยังไม่ได้เลือก'); return NOREDRAW; },
  /* AI */
  aiclose: () => { navBack(); return NOREDRAW; },
  aidrawer: () => { AIUI.drawer = !AIUI.drawer; renderDrawer(); if (AIUI.drawer) setTimeout(() => drawerEl.querySelector('.ev-drawer-new')?.focus(), 50); return NOREDRAW; },
  'aidrawer-close': () => { AIUI.drawer = false; renderDrawer(); return NOREDRAW; },
  ainew: () => { const cur = ChatStore.get(ChatStore.current()); if (!cur || cur.msgs.length) ChatStore.setCurrent(null); AIUI.drawer = false; AIUI.q = ''; renderAI(false); setTimeout(() => document.getElementById('aiText')?.focus(), 60); return NOREDRAW; },
  aiopen: id => { ChatStore.setCurrent(id); AIUI.drawer = false; renderAI(false); return NOREDRAW; },
  'ai-sugg': id => { aiSend(decodeURIComponent(id)); return NOREDRAW; },
  'ai-ok': (id, el) => { const title = decodeURIComponent(id), due = el?.dataset?.due || TODAY, cid = ChatStore.current(); if (cid) ChatStore.patchLast(cid, { done: 'ok' });
    /* การ์ดยืนยันปิดหน้า AI เพื่อเปิดฟอร์ม: คืน hash เป็นหน้าเดิมแบบ replace ไม่เพิ่มประวัติ
       (ไม่งั้นปิดฟอร์มแล้วถอยกลับไป #/ai และหน้า AI โผล่ขึ้นมาเอง) */
    history.replaceState({ ...(history.state || {}), app: true, layer: undefined }, '', '#/' + (UI.tab === 'ai' || UI.tab === 'settings' ? 'today' : UI.tab));
    closeAI(); openAdd('task'); ST.D.title = title; ST.D.start = due; renderForm(); return NOREDRAW; },
  'ai-no': () => { const cid = ChatStore.current(); if (cid) ChatStore.patchLast(cid, { done: 'no' }); renderAI(true); return NOREDRAW; },
  aimenu: (id, el) => { openChatMenu(el, id); return NOREDRAW; },
  'cm-pin': id => { closeMenu(); ChatStore.pin(id); renderDrawer(); return NOREDRAW; },
  'cm-rename': id => { closeMenu(); const c = ChatStore.get(id); if (!c) return NOREDRAW; const v = prompt('ชื่อแชทใหม่', chatTitle(c)); if (v !== null && v.trim()) { ChatStore.rename(id, v); renderAI(true); } return NOREDRAW; },
  'cm-del': id => { closeMenu(); const gone = ChatStore.remove(id); if (!gone) return NOREDRAW; renderAI(false);
    pushUndo({ label: `ลบแชท “${chatTitle(gone)}” แล้ว`, restore: () => { ChatStore.restore(gone); if (AIUI.open) renderAI(true); } }); return NOREDRAW; },
  dtype: id => { ST.D = { ...newDraft(id), title: ST.D.title }; return FORM; },
  dunit: id => { ST.D.unit = id; return FORM; }, dend: id => { ST.D.endMode = id; return FORM; },
  dtrack: id => { ST.D.track = id; ST.D.target = id === 'timer' ? 30 : 8; ST.D.unitName = id === 'timer' ? 'นาที' : 'แก้ว'; return FORM; },
  dday: id => { toggle(ST.D.days, +id); return FORM; },
};
export const NOREDRAW = Symbol('noredraw');
/* ตรวจฟอร์มก่อนบันทึก: คืนข้อความผิดพลาดหรือ '' ถ้าผ่าน */
export function validateDraft() {
  if (!ST.D.title.trim()) return 'ใส่ชื่อก่อนนะ';
  if (!ST.D.start) return 'เลือกวันที่ก่อนนะ';
  if (ST.D.time && ST.D.timeEnd && ST.D.timeEnd <= ST.D.time) return 'เวลาจบต้องหลังเวลาเริ่ม';
  if (!ST.D.time && ST.D.reminders.some(r => r.k === 'before')) return `ตั้งเตือน “ก่อนเวลา” ไว้ แต่ยังไม่ได้ใส่${timeLabel(ST.D.type)} ใส่เวลา หรือลบการเตือนนั้นก่อน`;
  if (ST.D.type === 'class' && !ST.D.days.length) return 'เลือกวันที่เรียนอย่างน้อย 1 วัน';
  if (ST.D.endMode === 'date' && ST.D.end && ST.D.end < ST.D.start) return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
  if (ST.D.type === 'habit' && ST.D.track !== 'check' && !(+ST.D.target >= 1)) return 'เป้าหมายต่อวันต้องอย่างน้อย 1';
  if (ST.D.unit !== 'none' && !(+ST.D.every >= 1)) return 'ความถี่ต้องอย่างน้อย 1';
  return '';
}

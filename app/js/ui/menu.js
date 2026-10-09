/* Path: app/js/ui/menu.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { TODAY } from '../core/dates.js';
import { menuEl } from '../core/dom.js';
import { pushLayerState } from '../core/history.js';
import { UI, find } from '../core/store.js';
import { ChatStore } from '../services/chat-store.js';
import { isDone, occursOn, skipped, tracked, val } from '../services/schedule.js';
import { icon } from './primitives.js';

export function menuItems(it, ds) {
  const out = [['edit', 'edit', 'แก้ไข']];
  if (it.track === 'timer') out.push(['timeropen', 'clock', 'เปิดหน้าจับเวลา']);
  if (tracked(it) && occursOn(it, ds) && ds <= TODAY) {
    if (val(it, ds) > 0) out.push(['reset', 'reset', 'ล้างบันทึกวันนี้']);
    if (it.type === 'habit' && !isDone(it, ds) && !skipped(it, ds)) out.push(['skip', 'skip', 'ข้ามวันนี้']);
    if (skipped(it, ds)) out.push(['unskip', 'reset', 'ยกเลิกการข้าม']);
  }
  out.push(['dup', 'copy', 'ทำสำเนา'], ['---'], ['del', 'trash', 'ลบ', 'danger']);
  return out;
}
export function openMenu(btn, id) { pushLayerState('menu');
  const it = find(id); if (!it) return;
  if (ST.MENU_FOR == id) return closeMenu();
  closeMenu(); ST.MENU_FOR = id; ST.MENU_BTN = btn; btn.setAttribute('aria-expanded', 'true');
  menuEl.innerHTML = menuItems(it, UI.date).map(m => m[0] === '---' ? '<hr>' : `<button role="menuitem" data-act="m-${m[0]}" data-id="${id}" ${m[3] ? `data-tone="${m[3]}"` : ''}>${icon(m[1])}${m[2]}</button>`).join('');
  menuEl.hidden = false;
  const r = btn.getBoundingClientRect(), mw = 210, mh = menuEl.scrollHeight || 220;
  const left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw));
  const below = r.bottom + 6 + mh < innerHeight - 8;
  menuEl.style.left = left + 'px'; menuEl.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - mh - 6)) + 'px';
  menuEl.style.transformOrigin = below ? 'top right' : 'bottom right';
  requestAnimationFrame(() => { menuEl.dataset.open = 'true'; menuEl.querySelector('button')?.focus(); });
}
/* silent=true: ชั้นอื่น (หน้าต่างล่าง/จับเวลา) กำลังเข้ามาแทนเมนู -> ปิดเมนูโดยไม่ถอยประวัติ
   (ถ้าถอยแบบอะซิงก์ popstate จะมาถึงหลังชั้นใหม่เปิดแล้วและปิดชั้นใหม่ทิ้ง) */
export function closeMenu(silent = false) {
  const wasOpen = !!ST.MENU_FOR;
  if (ST.MENU_BTN) { ST.MENU_BTN.setAttribute('aria-expanded', 'false'); if (!silent) { try { ST.MENU_BTN.focus({ preventScroll: true }); } catch {} } }
  ST.MENU_FOR = null; ST.MENU_BTN = null; menuEl.dataset.open = 'false'; menuEl.hidden = true;
  if (wasOpen && !silent && history.state?.layer === 'menu') history.back();
}
/* เมนูของห้องแชท (ใช้เมนูลอยตัวเดียวกับรายการ) */
export function openChatMenu(btn, id) { pushLayerState('menu');
  const c = ChatStore.get(id); if (!c) return;
  if (ST.MENU_FOR == id) return closeMenu();
  closeMenu(); ST.MENU_FOR = id; ST.MENU_BTN = btn; btn.setAttribute('aria-expanded', 'true');
  menuEl.innerHTML = `<button role="menuitem" data-act="cm-pin" data-id="${id}">${icon('check')}${c.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}</button>
    <button role="menuitem" data-act="cm-rename" data-id="${id}">${icon('edit')}เปลี่ยนชื่อ</button><hr>
    <button role="menuitem" data-act="cm-del" data-id="${id}" data-tone="danger">${icon('trash')}ลบแชท</button>`;
  menuEl.hidden = false;
  const r = btn.getBoundingClientRect(), mw = 210, mh = menuEl.scrollHeight || 160;
  menuEl.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px';
  menuEl.style.top = (r.bottom + 6 + mh < innerHeight - 8 ? r.bottom + 6 : Math.max(8, r.top - mh - 6)) + 'px';
  menuEl.style.zIndex = 60;
  requestAnimationFrame(() => { menuEl.dataset.open = 'true'; menuEl.querySelector('button')?.focus(); });
}

/* ชั้นฐาน (ES module จริง): คำนวณตำแหน่งป๊อปอัปเมนู ฟังก์ชันบริสุทธิ์ ไม่อ่าน DOM/state กลาง
   ชั้น m (11-ui__popover) อ่าน getBoundingClientRect/offsetWidth/innerWidth เองแล้วส่งตัวเลขเข้ามา ที่นี่คิดเลขอย่างเดียว */
export interface PopRect { left: number; right: number; top: number; bottom: number; width: number }
export interface PopOpts { align?: string; prefer?: string }
export const popPlace = (r: PopRect, w: number, h: number, vw: number, vh: number, o: PopOpts = {}) => {
  let left = o.align === 'right' ? r.right - w : o.align === 'center' ? r.left + r.width / 2 - w / 2 : r.left;
  left = Math.max(8, Math.min(vw - w - 8, left));
  const below = o.prefer !== 'up' && r.bottom + 6 + h < vh - 8, top = below ? r.bottom + 6 : Math.max(8, r.top - h - 8);
  return { left, top, below };
};
/* HTML ของรายการเมนูป๊อปอัป (ตัดวางจาก m/11 ตรงตัวอักษร 31 ต.ค. 2026) | icon เป็นพารามิเตอร์ (primitive ของ m/12 ปักบน window ห้าม import ข้ามไฟล์ m) esc มาจาก core/dates */
import { esc } from './dates.js';
export const popItemsHTML = (items: any, icon: any) => items.map((m: any) => m === '-' ? '<hr>' : `<button role="menuitem" data-act="${m.act}" data-id="${esc(m.id ?? '')}" ${m.tone ? `data-tone="${m.tone}"` : ''}>${icon(m.icon)}<span>${m.label}</span>${m.hint ? `<small>${m.hint}</small>` : ''}</button>`).join('');

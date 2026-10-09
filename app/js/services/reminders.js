/* Path: app/js/services/reminders.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { remText } from '../core/constants.js';
import { addDays, pad, parse, ymd } from '../core/dates.js';
import { isDone, occursOn, skipped, tracked } from './schedule.js';

/* ---------- ตัวคำนวณเวลาเตือน (แกนเดียวกับที่ Worker จะใช้ยิง Push จริงในขั้นต่อไป) ----------
   คืนรายการ { at: 'HH:MM', itemId, title, label } ของวัน ds เรียงตามเวลา
   กฎ: รายการต้องเกิดขึ้นในวันนั้น / ไม่ใช่วันที่ข้าม / ถ้าทำครบแล้ว (เฉพาะที่ติดตามผล) ไม่เตือน / "ล่วงหน้า" ต้องมีเวลาอ้างอิง */
export const toMin = hhmm => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3);
export const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export function remindersFor(ds, { includeDone = false } = {}) {
  const out = [];
  for (const it of ST.S.items) {
    if (skipped(it, ds)) continue;
    const happens = occursOn(it, ds);
    for (const r of it.reminders || []) {
      if (r.k === 'day') { if (isDone(it, it.start) && !includeDone) continue; }
      else { if (!happens) continue; if (!includeDone && tracked(it) && isDone(it, ds)) continue; }
      let m = null;
      if (r.k === 'at') m = toMin(r.t);
      else if (r.k === 'before' && it.time) m = toMin(it.time) - r.m;
      else if (r.k === 'day') { /* ก่อนวันส่ง N วัน: วันนี้จะเตือนก็ต่อเมื่อ (วันส่ง - N วัน) = ds */
        if (ymd(addDays(parse(it.start), -r.d)) === ds) m = toMin(r.t); }
      if (m === null || m < 0 || m >= 1440) continue; /* ล่วงหน้าข้ามเที่ยงคืนไปวันก่อน: ไม่รองรับในเวอร์ชันนี้ */
      out.push({ at: fromMin(m), itemId: it.id, title: it.title, label: remText(r) });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title));
}

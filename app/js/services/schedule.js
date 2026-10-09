/* Path: app/js/services/schedule.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { DAY_MS, STAT_DAYS, STREAK_LOOKBACK, TH_DAY, TH_MON, UNIT_TH, WD } from '../core/constants.js';
import { TODAY, addDays, parse, ymd } from '../core/dates.js';

/* ---------- Service layer ---------- */
export function occursOn(it, ds) {
  const d0 = parse(it.start), d = parse(ds), r = it.repeat;
  if (d < d0 || (it.end && d > parse(it.end))) return false;
  if (r.unit === 'none') return ds === it.start;
  if (r.unit === 'day') return Math.round((d - d0) / DAY_MS) % r.every === 0;
  if (r.unit === 'week') return r.days.includes(d.getDay()) && Math.floor(Math.round((d - addDays(d0, -d0.getDay())) / DAY_MS) / 7) % r.every === 0;
  const months = (d.getFullYear() - d0.getFullYear()) * 12 + d.getMonth() - d0.getMonth();
  return d.getDate() === d0.getDate() && months % r.every === 0;
}
export const val = (it, ds) => it.log[ds] || 0;
export const target = it => (it.track === 'count' || it.track === 'timer' ? it.target : 1);
export const tracked = it => it.track !== 'none';
export const isDone = (it, ds) => val(it, ds) >= target(it);
export const onDate = ds => ST.S.items.filter(it => occursOn(it, ds)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
export function streak(it) {
  let n = 0;
  for (let i = 0; i < STREAK_LOOKBACK; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (!occursOn(it, ds) || skipped(it, ds)) continue;
    if (isDone(it, ds)) n++; else if (i > 0) break;
  }
  return n;
}
/* อายุข้อมูล: นับจากวันที่เก่าสุดระหว่าง วันเริ่ม กับ วันที่มีบันทึก (กันกรณีวันเริ่มถูกตั้งหลังประวัติ) */
export const daysSince = it => { const first = [it.start, ...Object.keys(it.log || {})].sort()[0]; return Math.max(1, Math.round((parse(TODAY) - parse(first)) / DAY_MS) + 1); };
export function rate(it) {
  let total = 0, ok = 0;
  for (let i = 0; i < STAT_DAYS; i++) { const ds = ymd(addDays(new Date(), -i)); if (ds < it.start) break; if (occursOn(it, ds) && !skipped(it, ds)) { total++; if (isDone(it, ds)) ok++; } }
  return total ? Math.round(100 * ok / total) : 0;
}
/* วันที่แบบคนอ่าน: วันนี้ / พรุ่งนี้ / เมื่อวาน / ศุกร์ 9 ต.ค. */
export function niceDate(ds) {
  const d = parse(ds), diff = Math.round((d - parse(TODAY)) / DAY_MS);
  if (diff === 0) return 'วันนี้'; if (diff === 1) return 'พรุ่งนี้'; if (diff === -1) return 'เมื่อวาน';
  return `${TH_DAY[d.getDay()]} ${d.getDate()} ${TH_MON[d.getMonth()]}`;
}
export function repeatText(it) {
  const r = it.repeat, tail = it.end ? ` · ถึง ${niceDate(it.end)}` : '';
  if (r.unit === 'none') return `ครั้งเดียว · ${niceDate(it.start)}`;
  const body = r.unit === 'week'
    ? `${r.every === 1 ? 'ทุกสัปดาห์' : `ทุก ${r.every} สัปดาห์`} (${r.days.map(d => WD[d]).join(' ')})`
    : `${r.every === 1 ? 'ทุก' : `ทุก ${r.every} `}${UNIT_TH[r.unit]}`;
  return body + tail;
}
export const timeText = it => (it.time ? it.time + (it.timeEnd ? `–${it.timeEnd}` : '') : '');
/* "ข้าม" = วันนี้ไม่นับเป็นพลาด (เช่น ป่วย/เดินทาง) เก็บเป็น -1 ใน log */
export const skipped = (it, ds) => !!(it.skips && it.skips[ds]);

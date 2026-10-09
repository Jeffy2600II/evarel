/* Path: app/js/core/seed.js | split mechanically from app.js (no logic edits) */
import { TODAY, addDays, ymd } from './dates.js';
import { target } from '../services/schedule.js';

/* ---------- Seed ---------- */
export const fill = (days, v) => Object.fromEntries(Array.from({ length: days }, (_, i) => [ymd(addDays(new Date(), -i - 1)), v]));
export const mkBase = () => ({ subject: '', start: TODAY, end: '', time: '', timeEnd: '', reminders: [], track: 'none', target: 1, unitName: '', log: {}, skips: {} });
export const daily = () => ({ unit: 'day', every: 1, days: [] });
export const cls = (id, d, time, timeEnd, title) => ({ ...mkBase(), id, type: 'class', title, time, timeEnd, repeat: { unit: 'week', every: 1, days: [d] } });
export const SEED = { items: [
  { ...mkBase(), start: ymd(addDays(new Date(), -7)), id: 1, type: 'habit', title: 'ดื่มน้ำ', track: 'count', target: 8, unitName: 'แก้ว', repeat: daily(), reminders: [{ k: 'at', t: '09:00' }, { k: 'at', t: '13:00' }, { k: 'at', t: '17:00' }], log: fill(6, 8) },
  { ...mkBase(), id: 2, type: 'habit', title: 'อ่านหนังสือ', time: '19:00', track: 'timer', target: 30, unitName: 'นาที', repeat: daily(), log: { ...fill(3, 30) } },
  { ...mkBase(), start: ymd(addDays(new Date(), -5)), id: 3, type: 'habit', title: 'นอนก่อน 22:00', time: '22:00', track: 'check', repeat: daily(), reminders: [{ k: 'at', t: '21:30' }, { k: 'before', m: 0 }], log: fill(4, 1) },
  { ...mkBase(), id: 4, type: 'habit', title: 'วิ่ง', time: '17:00', track: 'check', repeat: { unit: 'week', every: 1, days: [1, 3, 5] } },
  { ...mkBase(), id: 5, type: 'task', title: 'การบ้านคณิตศาสตร์', subject: 'คณิต', time: '16:00', track: 'check', repeat: { unit: 'none', every: 1, days: [] } },
  { ...mkBase(), id: 6, type: 'event', title: 'ประชุมชมรม', time: '16:30', timeEnd: '17:30', reminders: [{ k: 'before', m: 30 }], repeat: { unit: 'week', every: 1, days: [4] } },
  cls(7, 1, '08:30', '09:20', 'คณิตศาสตร์'), cls(8, 1, '09:20', '10:10', 'ภาษาไทย'), cls(9, 2, '08:30', '09:20', 'อังกฤษ'),
  cls(10, 3, '08:30', '09:20', 'วิทยาศาสตร์'), cls(11, 4, '09:20', '10:10', 'ศิลปะ'), cls(12, 5, '08:30', '09:20', 'ชุมนุม'),
] };

/* ชั้นฐาน (ES module จริง): ตารางซ้ำ ความคืบหน้า สตรีค เป็นฟังก์ชันบริสุทธิ์ รับ today/items เป็นอาร์กิวเมนต์
   ตรรกะชุดเดียว: โมดูลเดิม 06-services__schedule ห่อเรียกที่นี่ ส่วน React import ตรงๆ */
import { DAY_MS, WD, addDays, esc, fmtDate, parse, ymd } from './dates';

export type Repeat = { unit: 'none' | 'day' | 'week' | 'month'; every: number; days: number[] };
export type Rem = { k: 'before'; m: number } | { k: 'at'; t: string };
export interface Item {
  id: number | string; type: 'habit' | 'task' | 'event' | 'class'; title: string; subject: string;
  start: string; end: string; time: string; timeEnd: string; rem: Rem[];
  track: 'none' | 'check' | 'count' | 'timer'; target: number; unitName: string;
  repeat: Repeat; log: Record<string, number>; skip: Record<string, boolean | number>;
}
const UNIT_TH: Record<string, string> = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน' };
const STREAK_LOOKBACK = 365, STAT_DAYS = 30;
export const PERIODS = ['ทั้งวัน', 'ช่วงเช้า', 'ช่วงบ่าย', 'ช่วงเย็น–ค่ำ'];
export const TYPES = { habit: 'กิจวัตร', task: 'งาน', event: 'กิจกรรม', class: 'คาบเรียน' } as const;

export function occursOn(it: Item, ds: string): boolean {
  const d0 = parse(it.start), d = parse(ds), r = it.repeat;
  if (d < d0 || (it.end && d > parse(it.end))) return false;
  if (r.unit === 'none') return ds === it.start;
  if (r.unit === 'day') return Math.round((d.getTime() - d0.getTime()) / DAY_MS) % r.every === 0;
  if (r.unit === 'week') return r.days.includes(d.getDay()) && Math.floor(Math.round((d.getTime() - addDays(d0, -d0.getDay()).getTime()) / DAY_MS) / 7) % r.every === 0;
  return d.getDate() === d0.getDate() && ((d.getFullYear() - d0.getFullYear()) * 12 + d.getMonth() - d0.getMonth()) % r.every === 0;
}
export const val = (it: Item, ds: string): number => it.log[ds] || 0;
export const target = (it: Item): number => (it.track === 'count' || it.track === 'timer' ? it.target : 1);
export const tracked = (it: Item): boolean => it.track !== 'none';
export const isDone = (it: Item, ds: string): boolean => val(it, ds) >= target(it);
export const skipped = (it: Item, ds: string): boolean => !!it.skip[ds];
export const isFuture = (ds: string, today: string): boolean => ds > today;
export const onDate = (items: Item[], ds: string): Item[] =>
  items.filter((it) => occursOn(it, ds)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
export const overdue = (items: Item[], today: string): Item[] =>
  items.filter((it) => it.type === 'task' && it.start < today && !isDone(it, it.start)).sort((a, b) => a.start.localeCompare(b.start));
export function streak(it: Item): number {
  let n = 0;
  for (let i = 0; i < STREAK_LOOKBACK; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (!occursOn(it, ds) || skipped(it, ds)) continue;
    if (isDone(it, ds)) n++; else if (i > 0) break;
  }
  return n;
}
export function rate(it: Item): number {
  let t = 0, ok = 0;
  for (let i = 0; i < STAT_DAYS; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (ds < it.start || !occursOn(it, ds) || skipped(it, ds)) continue;
    t++; if (isDone(it, ds)) ok++;
  }
  return t ? Math.round(100 * ok / t) : 0;
}
export const remText = (r: Rem): string =>
  r.k === 'at' ? `เวลา ${r.t} น.` : r.m === 0 ? 'ตรงเวลา' : r.m % 1440 === 0 ? `ก่อน ${r.m / 1440} วัน` : r.m % 60 === 0 ? `ก่อน ${r.m / 60} ชม.` : `ก่อน ${r.m} นาที`;
export function repeatText(it: Item): string {
  const r = it.repeat, tail = it.end ? ` · ถึง ${fmtDate(it.end)}` : '';
  if (r.unit === 'none') return `ครั้งเดียว · ${fmtDate(it.start)}`;
  const one = r.every === 1, u = UNIT_TH[r.unit];
  return (r.unit === 'week' ? (one ? 'ทุกสัปดาห์' : `ทุก ${r.every} สัปดาห์`) + ` · ${[...r.days].sort().map((d) => WD[d]).join(' ')}` : one ? `ทุก${u}` : `ทุก ${r.every} ${u}`) + tail;
}
export const timeText = (it: Item): string => (it.time ? it.time + (it.timeEnd ? `–${it.timeEnd}` : '') : '');
export function periodOf(it: Item): number { if (!it.time) return 0; const h = +it.time.slice(0, 2); return h < 12 ? 1 : h < 17 ? 2 : 3; }
export const scheduled = (it: Item, ds: string): boolean => ds >= it.start && occursOn(it, ds);
export function dayState(it: Item, ds: string, today: string): string {
  if (!scheduled(it, ds)) return 'off';
  if (skipped(it, ds)) return 'skip';
  if (isDone(it, ds)) return 'done';
  if (val(it, ds) > 0) return 'part';
  if (ds > today) return 'future';
  return ds === today ? 'today' : 'miss';
}
/* เมนูต่อวันของรายการ (ปุ่มย่อในเลย์เอาต์ปฏิทิน/รายวัน): สร้างวัตถุเมนูล้วน ไม่แตะ DOM และไม่ผูก TODAY (พิสูจน์แล้วว่าไม่อ่าน)
   ผู้เรียกเดิม (m/06) ห่อส่งต่อที่เดียว | ตัวเชื่อมเครื่องหมาย '-' คือเส้นคั่นของ openPop */
export function dayMenu(it: Item, ds: string): any[] {
  const sk = skipped(it, ds), v = val(it, ds), tg = target(it), multi = it.track !== 'check', done = isDone(it, ds), out: any[] = [];
  if (sk) return [{ act: 'dm-skip', id: `0|${ds}`, icon: 'x', label: 'เลิกข้าม' }];
  if (multi) out.push({ act: 'dm-set', id: `${tg}|${ds}`, icon: 'check', label: `ทำครบเป้า (${tg} ${esc(it.unitName)})`, hint: done ? 'ปัจจุบัน' : '' }, { act: 'dm-num', id: ds, icon: 'edit', label: 'ปรับจำนวน…', hint: `${v}/${tg}` }, { act: 'dm-set', id: `0|${ds}`, icon: 'x', label: 'ล้างเป็น 0' });
  else out.push({ act: 'dm-set', id: `1|${ds}`, icon: 'check', label: 'ทำแล้ว', hint: done ? 'ปัจจุบัน' : '' }, { act: 'dm-set', id: `0|${ds}`, icon: 'x', label: 'ยังไม่ทำ', hint: done ? '' : 'ปัจจุบัน' });
  if (!done) out.push('-', { act: 'dm-skip', id: `1|${ds}`, icon: 'skip', label: 'ข้ามวันนี้ (ไม่นับเป็นพลาด)' }); return out;
}

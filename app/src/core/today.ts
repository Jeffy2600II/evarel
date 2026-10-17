/* ชั้นฐาน (ES module จริง): ค่าทุกอย่างที่หน้า "วันนี้" ต้องวาด คำนวณจากของดิบล้วน (items, วันที่, เวลา)
   ตรรกะชุดเดียว: React import ตรง หน้าเดิมไม่ใช้ (ท่อนคำนวณยังอยู่ใน VIEWS.today ตราบใดที่ยังไม่ได้ย้าย)
   ทุกฟังก์ชันรับ today เป็นอาร์กิวเมนต์ ไม่อ่าน Date.now() เอง เพื่อเทียบได้ด้วยเวลาล็อก */
import { Item } from './schedule';

export interface TodayRow { it: Item; late?: boolean; next?: boolean }
export interface TodayProps {
  empty: boolean; dateLabel: string; sub: string; hello: string;
  week: { ds: string; wd: string; d: number; isSel: boolean; isToday: boolean }[];
  showTodayChip: boolean; monthLabel: string; yearBE: number;
  done: number; trackedTotal: number; pct: number;
  nextItem: { time: string; title: string } | null;
  overdue: TodayRow[]; groups: { name: string; rows: TodayRow[] }[];
  mainRows: TodayRow[];
}
import { PERIODS, onDate, overdue, tracked, isDone, isFuture, periodOf } from './schedule';

export interface TodayUI { date: string; weekOff: number; weekDir: number; pop?: number }
export interface TodayFmt {
  fmtDate: (ds: string) => string; dayLab: (ds: string) => string; hello: (today: boolean, ds: string, now: Date) => string;
  WD: string[]; TH_MONTH: string[]; pad: (n: number) => string;
}
const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const ymdOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nowHMOf = (d: Date): string => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function buildTodayProps(items: Item[], ui: TodayUI, today: string, now: Date, fmt: TodayFmt): TodayProps {
  const ds = ui.date;
  const hello = (h: number): string => (h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น');
  const sub = ds === today ? hello(now.getHours()) : 'ย้อนดู/วางแผน';
  const start = addDays(now, -now.getDay() + 7 * ui.weekOff);
  const week = Array.from({ length: 7 }, (_, i) => ymdOf(addDays(start, i)));
  const mid = new Date(week[3] + 'T00:00:00');
  const list = onDate(items, ds);
  const tr = list.filter(tracked);
  const done = tr.filter((it) => isDone(it, ds)).length;
  const pct = tr.length ? Math.round((100 * done) / tr.length) : 0;
  const od = ds === today ? overdue(items, today) : [];
  const nextId = ds === today ? (list.find((it) => it.time && it.time >= nowHMOf(now) && !(tracked(it) && isDone(it, ds)))?.id ?? null) : null;
  const nextIt = list.find((it) => it.id === nextId) ?? null;
  let idx = 0;
  const groups = PERIODS.map((n, g) => [n, list.filter((it) => periodOf(it) === g)] as [string, Item[]])
    .filter(([, l]) => l.length)
    .map(([n, l]) => ({ name: n, rows: l.map((it) => ({ it, next: it.id === nextId, idx: idx++ })) }));
  return {
    empty: items.length === 0, dateLabel: fmt.fmtDate(ds), sub,
    hello: sub, week: week.map((w) => ({ ds: w, wd: fmt.WD[new Date(w + 'T00:00:00').getDay()], d: new Date(w + 'T00:00:00').getDate(), isSel: ui.date === w, isToday: w === today })),
    showTodayChip: ui.date !== today || ui.weekOff !== 0,
    monthLabel: fmt.TH_MONTH[mid.getMonth()], yearBE: mid.getFullYear() + 543,
    done, trackedTotal: tr.length, pct,
    nextItem: nextIt ? { time: nextIt.time, title: nextIt.title } : null,
    overdue: od.map((it, i) => ({ it, late: true, idx: i })),
    groups, mainRows: groups.flatMap((g) => g.rows),
  };
}

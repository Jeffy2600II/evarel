/* ชั้นฐาน (ES module จริง): สถิติ นับจากรายการที่ "ตั้งไว้" จริง ไม่รวมวันที่ข้าม ฟังก์ชันบริสุทธิ์ รับ items/period เป็นอาร์กิวเมนต์
   ตรรกะชุดเดียว: React import ตรงๆ ส่วนโมดูลเดิม 07-services__stats ยังอยู่จนกว่าทุก route จะถูกแทนที่ */
import { TH_MON, WD, addDays, ymd } from './dates';
import { isDone, occursOn, skipped } from './schedule';
import type { Item } from './schedule';

export type Period = 'week' | 'month';
export interface Col { t: number; ok: number; pct: number; label: string; today: boolean }
export const ARC_C = 2 * Math.PI * 42;

export const habits = (items: Item[]): Item[] => items.filter((it) => it.type === 'habit');
export const typeIcon = (it: Item): string =>
  it.track === 'timer' ? 'clock' : it.track === 'count' ? 'chart' : ({ habit: 'check', task: 'tasks', event: 'bell', class: 'cal' } as Record<string, string>)[it.type];
export function periodStats(it: Item, days: number): { t: number; ok: number } {
  let t = 0, ok = 0;
  for (let i = 0; i < days; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (ds < it.start || !occursOn(it, ds) || skipped(it, ds)) continue;
    t++; if (isDone(it, ds)) ok++;
  }
  return { t, ok };
}
export function chartData(items: Item[], period: Period): Col[] {
  const hs = habits(items), isM = period === 'month', n = isM ? 4 : 7, size = isM ? 7 : 1, out: Col[] = [];
  for (let k = 0; k < n; k++) {
    let t = 0, ok = 0, start: Date | null = null;
    for (let j = 0; j < size; j++) {
      const d = addDays(new Date(), -((n - 1 - k) * size + (size - 1 - j))), ds = ymd(d);
      if (j === 0) start = d;
      hs.forEach((h) => { if (ds < h.start || !occursOn(h, ds) || skipped(h, ds)) return; t++; if (isDone(h, ds)) ok++; });
    }
    const s = start as Date;
    out.push({ t, ok, pct: t ? Math.round(100 * ok / t) : 0, label: isM ? `${s.getDate()} ${TH_MON[s.getMonth()]}` : WD[s.getDay()], today: !isM && k === n - 1 });
  }
  return out;
}
export const totalDone = (it: Item): number => Object.keys(it.log).filter((ds) => occursOn(it, ds) && isDone(it, ds)).length;

/* ค่าทั้งหมดที่หน้าสถิติต้องใช้ คำนวณที่เดียวจาก items/period/today (เดิมคำนวณใน VIEWS.stats แล้วส่งเป็น props) */
import { streak } from './schedule';
export interface StatsRow { id: number | string; title: string; sub: string; full: boolean; pct: number; pctText: string; lv: string }
export interface StatsProps {
  isM: boolean; period: Period; rate: number; arcC: number; K: number; T: number; best: number;
  tdDone: number; tdTotal: number; cols: Col[]; rows: StatsRow[];
}
export function buildStatsProps(items: Item[], period: Period, today: string): StatsProps {
  const hs = habits(items), isM = period === 'month', days = isM ? 28 : 7;
  const per = hs.map((h) => [h, periodStats(h, days)] as const);
  const T = per.reduce((n, [, s]) => n + s.t, 0), K = per.reduce((n, [, s]) => n + s.ok, 0);
  const rate = T ? Math.round(100 * K / T) : 0, best = Math.max(0, ...hs.map(streak));
  const td = hs.filter((h) => occursOn(h, today) && !skipped(h, today)), tdDone = td.filter((h) => isDone(h, today)).length;
  const lv = (r: number): string => (r >= 80 ? 'hi' : r >= 50 ? 'mid' : 'lo');
  const rows = per.map(([h, s]): StatsRow => {
    const r = s.t ? Math.round(100 * s.ok / s.t) : 0, st = streak(h);
    return { id: h.id, title: h.title, sub: `${s.t ? `ทำ ${s.ok} จาก ${s.t} ครั้ง` : 'ไม่มีกำหนดในช่วงนี้'}${st ? ` · ต่อเนื่อง ${st} วัน` : ''}`, full: r >= 100, pct: r, pctText: s.t ? r + '%' : '–', lv: s.t ? lv(r) : '' };
  });
  return { isM, period, rate, arcC: ARC_C, K, T, best, tdDone, tdTotal: td.length, cols: chartData(items, period), rows };
}

/* ค่าทั้งหมดที่หน้ารายการต้องใช้ (เดิมคำนวณใน VIEWS.all แล้วส่งเป็น props) iconOf ส่งจากภายนอก: ตาราง ICONS ยังไม่ย้าย จึงไม่ผูก global */
import { TYPES, repeatText, timeText } from './schedule';
export interface AllRow { id: number | string; icon: string; title: string; sub: string }
export interface AllSection { key: string; label: string; count: number; plus: string; rows: AllRow[] }
export type TypeFilter = 'all' | keyof typeof TYPES;
export function buildAllProps(items: Item[], type: TypeFilter, iconOf: (name: string) => string): { sections: AllSection[] } {
  const types = (type === 'all' ? Object.keys(TYPES) : [type]) as Array<keyof typeof TYPES>, plus = iconOf('plus'), sections: AllSection[] = [];
  for (const k of types) {
    const g = items.filter((it) => it.type === k);
    if (g.length) sections.push({ key: k, label: TYPES[k], count: g.length, plus, rows: g.map((it) => ({ id: it.id, icon: iconOf(typeIcon(it)), title: it.title, sub: `${repeatText(it)}${it.time ? ` · ${timeText(it)}` : ''}` })) });
  }
  return { sections };
}

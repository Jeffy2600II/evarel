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

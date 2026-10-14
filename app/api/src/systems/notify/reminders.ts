// ตัวคำนวณ "ถึงเวลาเตือนหรือยัง" (โมดูลบริสุทธิ์ ไม่แตะฐานข้อมูล/เครือข่าย/Date ของเครื่อง)
// เวลาทั้งหมดเป็นข้อความเขตเวลา Asia/Bangkok: วัน 'YYYY-MM-DD' เวลา 'HH:MM' และ now = 'YYYY-MM-DD HH:MM'
import { dayNumber, occursOnStr, type Repeat } from './due.ts';

export type Rem = { k: 'before'; m: number } | { k: 'at'; t: string };
export type Item = {
  id: number | string; title?: string; time: string; start: string; end: string;
  repeat: Repeat; skip?: Record<string, unknown>; rem: unknown;
};
export type Due = { itemId: number | string; title: string; occDate: string; key: string };

// เตือนที่เลยเวลาไปเกินนี้ถือว่าเก่า ไม่ส่ง (รองรับ cron มาช้า)
export const WINDOW_MIN = 5;
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const hm = (s: unknown): number | null => {
  if (typeof s !== 'string') return null;
  const m = HM.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const abs = (day: string, minutes: number): number => dayNumber(day) * 1440 + minutes;
// วัน occurrence ที่เป็นไปได้: วันนี้และ 1 วันข้างหน้า (before ข้ามเที่ยงคืนได้ถึง 1440 นาที) บวกอีกนิดเผื่อค่ามากกว่า 1 วัน
const dayStr = (dn: number): string => {
  const d = new Date(dn * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export function dueReminders(items: Item[], now: string, maxBeforeDays = 3): Due[] {
  const [nowDay, nowTime] = now.split(' ');
  const nowMin = hm(nowTime);
  if (!DATE.test(nowDay ?? '') || nowMin === null) return [];
  const nowAbs = abs(nowDay, nowMin);
  const out: Due[] = [];
  for (const it of items) {
    try {
      if (!Array.isArray(it.rem) || !DATE.test(it.start)) continue;
      if (it.end && !DATE.test(it.end)) continue;
      const timeMin = hm(it.time); // null = รายการไม่มีเวลา
      for (let off = 0; off <= maxBeforeDays; off++) {
        const occDate = dayStr(dayNumber(nowDay) + off);
        if (!occursOnStr(it, occDate) || it.skip?.[occDate]) continue;
        for (const r of it.rem as Rem[]) {
          let at: number | null = null; let tag = '';
          if (r && r.k === 'before' && Number.isInteger(r.m) && r.m >= 0) {
            if (timeMin === null) continue; // ไม่มีเวลาให้นับถอยหลัง: ไม่ส่ง ปลอดภัยกว่าส่งผิดเวลา
            at = abs(occDate, timeMin) - r.m; tag = `before:${r.m}`;
          } else if (r && r.k === 'at') {
            const tm = hm(r.t);
            if (tm === null) continue;
            at = abs(occDate, tm); tag = `at:${r.t}`;
          }
          if (at === null) continue;
          if (nowAbs >= at && nowAbs - at < WINDOW_MIN) {
            out.push({ itemId: it.id, title: String(it.title ?? ''), occDate, key: `${it.id}|${occDate}|${tag}` });
          }
        }
      }
    } catch { /* รายการเดียวพังต้องไม่ล้มทั้งรอบ */ }
  }
  return out;
}

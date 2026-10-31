import { TODAY } from './02-core__dates.js';
import { S } from './05-data__auth.js';
import { occursOn, val, target, tracked, isDone, skipped, streak, rate, remText, repeatText, timeText, periodOf, PERIODS, scheduled, isFuture as isFutureOf, onDate as onDateOf, overdue as overdueOf, dayState as dayStateOf, dayMenu } from './core/schedule.js';
/* ===== MODULE: services/schedule ===== */
/* ตรรกะบริสุทธิ์ทั้งหมดอยู่ที่ core/schedule.ts แล้ว (occursOn val target tracked isDone skipped streak rate remText repeatText timeText periodOf PERIODS scheduled isFuture onDate overdue dayState dayMenu รับ items/today เป็นอาร์กิวเมนต์)
   ที่นี่ส่งออกชื่อเดิมต่อ และคงตัวห่อที่ส่งสถานะกลาง S.items กับ TODAY (คำนวณตอนโหลด) เข้าไป: isFuture onDate overdue dayState */
export { occursOn, val, target, tracked, isDone, skipped, streak, rate, remText, repeatText, timeText, periodOf, PERIODS, scheduled, dayMenu };
export const isFuture = ds => isFutureOf(ds, TODAY);
export const onDate = ds => onDateOf(S.items, ds);
export const overdue = () => overdueOf(S.items, TODAY);
export const dayState = (it, ds) => dayStateOf(it, ds, TODAY);
Object.assign(window, { occursOn, val, target, tracked, isDone, skipped, isFuture, onDate, overdue, streak, rate, remText, repeatText, timeText, periodOf, PERIODS, scheduled, dayState, dayMenu });

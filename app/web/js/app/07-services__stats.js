import { S, UI } from './05-data__auth.js';
import { habits as habitsOf, typeIcon, periodStats, ARC_C, chartData as chartDataOf, totalDone } from './core/stats.js';
/* ===== MODULE: services/stats (นับจากรายการที่ "ตั้งไว้" จริง ไม่รวมวันที่ข้าม) ===== */
/* ตรรกะบริสุทธิ์ (typeIcon periodStats ARC_C totalDone) อยู่ที่ core/stats.ts แล้ว ที่ยังอยู่ใน m/ คือตัวห่อบางที่อ่านสถานะกลาง S.items และ UI.period: habits chartData */
export { typeIcon, periodStats, ARC_C, totalDone };
export const habits = () => habitsOf(S.items);
export const chartData = () => chartDataOf(S.items, UI.period);
Object.assign(window, { habits, typeIcon, periodStats, ARC_C, chartData, totalDone });

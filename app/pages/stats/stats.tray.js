/**
 * ถาดข้อมูลของกล่อง stats (ชั้นที่ 3): ทางเดียวที่ข้อมูลเข้ากล่อง
 * รับ items/period/today ดิบจาก VIEWS.stats แล้วให้ core/stats คำนวณเป็น props ของหน้า (ไม่อ่าน global เอง)
 */
import { buildStatsProps } from '../../src/core/stats';

export function prepareStats(raw) {
  return buildStatsProps(raw.items, raw.period, raw.today);
}

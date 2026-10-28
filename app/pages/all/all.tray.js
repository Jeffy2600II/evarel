/**
 * ถาดข้อมูลของกล่อง all (ชั้นที่ 3): ทางเดียวที่ข้อมูลเข้ากล่อง
 * รับ items/type/iconOf ดิบจาก VIEWS.all แล้วให้ core/stats คำนวณเป็น props ของหน้า (ไม่อ่าน global เอง)
 */
import { buildAllProps } from '../../src/core/stats';

export function prepareAll(raw) {
  return buildAllProps(raw.items, raw.type, raw.iconOf);
}

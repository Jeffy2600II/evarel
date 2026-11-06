/**
 * ถาดข้อมูลของหน้าตั้งค่า (settings) | ทางเดียวที่ข้อมูลเข้ากล่อง (กติกาบ้านข้อ 2)
 * หน้านี้ไม่อ่านอะไรจาก window เอง: ข้อมูลทั้งหมดรับเป็น props จากชั้น m (settingsProps ใน 19-views__settings)
 * ถาดตรวจรูป props ตอนรับ แล้วคืนข้อมูลเดิม (ไม่แปลง ไม่คัดลอก ภาพจึงไม่ขยับ) ผิดรูปโยน TrayError ชี้ชื่อกล่องและทางของฟิลด์
 * ฟิลด์ที่เป็น HTML สตริง (usageHTML versionHTML themeSegHTML perfSegHTML backIconHTML googleChipInner) ตรวจแค่ว่าเป็นสตริง ไม่ตรวจเนื้อ HTML
 * user.provider อาจไม่มีค่า (ST.USER?.provider) จึงเป็น optional
 */
import { tray, T } from '../tray.js';

const settingsProps = tray('settings', {
  usageHTML: T.string, versionHTML: T.string, googleChipInner: T.string,
  themeSegHTML: T.string, perfSegHTML: T.string, backIconHTML: T.string,
  avatarBg: T.string, avatarName: T.string, avatarText: T.string,
  user: T.shape({ name: T.string, email: T.string, provider: T.optional(T.string) }),
  notif: T.shape({ state: T.string, note: T.string }),
  total: T.number, showNotifyBtn: T.boolean, notifyBtnLabel: T.string,
});

/** บิลด์เรียกผ่าน export prepare ของหน้า: ตรวจรูป props จากชั้น m แล้วคืนค่าเดิม */
export function prepareSettings(raw) {
  return settingsProps.take(raw);
}

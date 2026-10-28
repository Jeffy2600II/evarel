/**
 * ข้อความบรรทัดรองของแถว (ชิ้นส่วนของ item-row): ค้างกำหนด · เวลา · ความคืบหน้า/หัวเรื่อง · ข้ามวันนี้
 * คืนอาร์เรย์สตริงที่กรองค่าว่างแล้ว หน้าหลักเอาไป join ด้วยจุดกลาง | รับ D (ถาด), it, late, multi, v, tg, sk
 */
export function rowSubParts({ D, it, late, multi, v, tg, sk }) {
  return [
    late ? `เลยกำหนด ${D.fmtDate(it.start)}` : '',
    D.timeText(it) || 'ไม่ระบุเวลา',
    multi ? `${v}/${tg} ${D.esc(it.unitName)}` : D.esc(it.subject),
    sk ? 'ข้ามวันนี้' : '',
  ].filter(Boolean);
}

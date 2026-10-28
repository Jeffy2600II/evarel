/**
 * การ์ดกลางหน้าจอ (dialog) ของ Evarel: การ์ดทั่วไป + การ์ดยืนยัน (ชั้นที่ 1 ของกล่อง dialog โซน shared เพราะหลายหน้าเปิดใช้)
 * ลงทะเบียนจากบัตร BOX.md สี่รายการ: pages.dialogCard / pages.confirmCard (สตริง ใช้ตอน mount) และ components.dialogCard / components.confirmCard (React)
 * กล่องนี้ไม่อ่าน window และไม่มีข้อมูลเข้า (รับ props จากผู้เรียกตรงๆ) | h/Fragment บิลด์ฉีดให้
 */
import { DialogCard } from './parts/DialogCard.jsx';
import { ConfirmCard } from './parts/ConfirmCard.jsx';

export default DialogCard;
export { ConfirmCard };

/* ตัวแปรส่วนกลางที่มาจากนอกโมดูล (S4 ชั้น 2) ใช้เพื่อตรวจชนิดเท่านั้น ไม่ถูกเสิร์ฟ
   EVAREL_API: ใส่โดย index.html ตอน build ต่อสภาพแวดล้อม | FullCalendar: โหลดจาก CDN แบบ lazy (โค้ดเช็ก typeof ก่อนใช้) */
interface Window { EVAREL_API?: string }
declare const FullCalendar: any;

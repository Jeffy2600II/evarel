/* ชนิดข้อมูลส่วนกลางของส่วนหน้า (S4 ชั้น 1) ใช้เพื่อตรวจชนิดเท่านั้น ไม่ถูกเสิร์ฟให้ผู้ใช้
   ประกาศจาก const ST ใน app/web/js/m/00-head.js ฟิลด์ที่ยังไม่พิสูจน์ชนิดย่อยเขียนเป็น any (ไม่ใช่ unknown เพราะ unknown ทำให้เกิด error ปลอม 13 จุด วัดจริง) เพื่อไม่เข้มกว่าที่รู้
   (วัด 16 ต.ค. 2026: ST มี 16 ฟิลด์ ถูกอ้าง 309 ครั้ง) */
interface EvarelState {
  sheetMode: string;
  drag: any;
  popBtn: any;
  /* แบบร่างฟอร์ม: ฟิลด์ไม่ตายตัว (title dirty fromType step ฯลฯ) ยังไม่ได้ไล่ครบ */
  D: Record<string, any>;
  TM: any;
  focusId: any;
  CH: { list: any[]; cur: any };
  DETAIL: any;
  DV: any;
  swipeX: any;
  USER: any;
  Repo: any;
  _render: () => void;
  QUOTA: any;
  quotaTimer: number;
  quotaTick: number;
}
/* สถานะ: ชนิดนี้ยังไม่ถูกผูกกับ ST จริง เพราะผูกได้ทางเดียวคือเพิ่มคอมเมนต์ JSDoc ชนิด @type ที่อ้าง EvarelState หน้า const ST ใน 00-head.js
   ซึ่งเปลี่ยนไฟล์ที่ส่งผู้ใช้ (รออนุมัติจาก Master) ทางประกาศจากฝั่งนี้อย่างเดียวชนกับ const ST (TS2451, วัดจริง)
   วัดบนสำเนาเมื่อผูกแล้ว: error คงเดิม 99 ชุดเดียวกัน และจับการพิมพ์ชื่อฟิลด์ผิด (เช่น ST.TMM) ได้ */

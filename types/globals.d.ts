/* ตัวแปรส่วนกลางที่มาจากนอกโมดูล (S4 ชั้น 2) ใช้เพื่อตรวจชนิดเท่านั้น ไม่ถูกเสิร์ฟ
   EVAREL_API: ใส่โดย index.html ตอน build ต่อสภาพแวดล้อม | FullCalendar: โหลดจาก CDN แบบ lazy (โค้ดเช็ก typeof ก่อนใช้) */
/* สะพานระหว่างโค้ดเดิมกับหน้า React (S4 ชั้น 4): หน้า React ลงทะเบียนฟังก์ชันสร้าง markup ที่ window.EvarelPages.<ชื่อ> ผ่าน bundle ใน js/react
   EvarelReact: runtime ร่วมของ bundle (h, Fragment, renderToStaticMarkup) | UI กับ render: ตัวแปรสถานะและฟังก์ชันวาดหน้าของโค้ดเดิม ที่ตัวโหลด React อ่านผ่าน window */
type EvarelPageRenderer = (props: any) => string;
interface Window {
  EVAREL_API?: string;
  EvarelPages?: Record<string, EvarelPageRenderer | undefined>;
  EvarelReact?: { h: (...a: any[]) => any; Fragment: any; renderToStaticMarkup: (el: any) => string };
  UI?: { tab?: string; [k: string]: any };
  render?: () => void;
}
declare const FullCalendar: any;

/* ชนิด DOM ที่โค้ดเดิมใช้โดยถือว่า event.target / closest() เป็นองค์ประกอบ HTML (S4 ชั้น 2)
   ใช้เพื่อตรวจชนิดเท่านั้น ไม่ถูกเสิร์ฟ ไม่แก้ไฟล์ที่ส่งผู้ใช้
   ข้อจำกัด: ทำให้ตัวตรวจไม่เตือนเมื่อ target เป็น document/window ที่ไม่มี closest โค้ดจริงกันไว้ด้วย ?. ที่ keydown/pointerout/contextmenu */
interface EventTarget {
  closest(sel: string): HTMLElement | null;
  id: string; name: string; value: string; dataset: DOMStringMap;
  classList: DOMTokenList; querySelector(sel: string): HTMLElement | null;
  getAttribute(n: string): string | null; setAttribute(n: string, v: string): void;
  insertAdjacentHTML(pos: InsertPosition, html: string): void;
  matches(sel: string): boolean; removeAttribute(n: string): void;
}
interface Element {
  dataset: DOMStringMap; style: CSSStyleDeclaration; value: string; disabled: boolean; focus(o?: FocusOptions): void; select(): void;
}
interface HTMLElement {
  value: string; disabled: boolean; placeholder: string; type: string; requestSubmit?(): void; _undo?: any;
}
/* เบราว์เซอร์แปลงตัวเลขเป็นสตริงให้เองเมื่อกำหนด custom property และ dataset จึงรับ number ได้ตามพฤติกรรมจริง */
interface CSSStyleDeclaration { setProperty(name: string, value: string | number | null, priority?: string): void; }
interface DOMStringMap { [name: string]: string | number | undefined; }
/* relatedTarget ของ event ชี้ Node หรือ null เสมอในทางปฏิบัติ */
interface FocusEvent { readonly relatedTarget: (EventTarget & Node) | null; }
interface MouseEvent { readonly relatedTarget: (EventTarget & Node) | null; }
interface PointerEvent { readonly relatedTarget: (EventTarget & Node) | null; }
/* API ของเบราว์เซอร์ที่ lib มาตรฐานยังไม่ครอบ (ใช้ใน ui/perf: เดากำลังเครื่อง) ค่าอาจไม่มีในบางเบราว์เซอร์ โค้ดจริงกันไว้ด้วย ?. และค่าเริ่มต้น */
interface Navigator { readonly deviceMemory?: number; readonly connection?: { saveData?: boolean }; }
/* querySelector('meta[name=theme-color]') คืน HTMLElement ตามชนิดทั่วไป แต่ตัวจริงคือ HTMLMetaElement ที่มี content */
interface HTMLElement { content: string; }

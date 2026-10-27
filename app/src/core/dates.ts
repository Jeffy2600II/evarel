/* ชั้นฐาน (ES module จริง): วันที่และข้อความวัน ฟังก์ชันบริสุทธิ์ ไม่อ่าน state กลาง
   ตรรกะชุดเดียว: โมดูลเดิม 02-core__dates เรียกใช้ที่นี่ผ่านตัวห่อ ส่วน React import ตรงๆ */
export const TH_MON = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
export const TH_DAY = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสฯ','ศุกร์','เสาร์'];
export const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const WD = ['อา','จ','อ','พ','พฤ','ศ','ส'];
export const DAY_MS = 86400000;

export const pad = (n: number): string => String(n).padStart(2, '0');
export const ymd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string): Date => new Date(`${s}T00:00:00`);
export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const fmtDate = (ds: string): string => { const d = parse(ds); return `${TH_DAY[d.getDay()]}ที่ ${d.getDate()} ${TH_MON[d.getMonth()]}`; };
export const nowHM = (): string => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtClock = (ms: number): string => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
/* today เป็นอาร์กิวเมนต์ ไม่ใช่ตัวแปรที่คำนวณตอนโหลดโมดูล เพื่อให้ทดสอบล็อกเวลาและ React ส่งค่าเข้าได้ */
export const dayLab = (ds: string, today: string): string =>
  ds === today ? 'วันนี้' : ds === ymd(addDays(new Date(), -1)) ? 'เมื่อวาน' : ds === ymd(addDays(new Date(), 1)) ? 'พรุ่งนี้' : fmtDate(ds);

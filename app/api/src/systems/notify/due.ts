// ตัดสินว่ารายการถึงเวลาเตือนหรือยัง (โมดูลบริสุทธิ์ ไม่แตะฐานข้อมูล/เครือข่าย)
// วัน/เวลาเป็นข้อความเขตเวลา Asia/Bangkok ทั้งหมด ไม่ใช้ Date ของเครื่อง จึงให้ผลเท่ากันทุกเขตเวลาที่ Worker รัน
// เทียบกับ occursOn ของแอป (app/web/js/m/06-services__schedule.js) ด้วย due.test.mjs

export type Repeat = { unit: 'none' | 'day' | 'week' | 'month'; every: number; days: number[] };
export type ItemLite = { start: string; end: string; repeat: Repeat };

const DAY_MS = 86400000;

// 'YYYY-MM-DD' -> จำนวนวันนับจาก epoch (คำนวณด้วย UTC ล้วน ไม่มีผลของเขตเวลา)
export function dayNumber(ds: string): number {
  const [y, m, d] = ds.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

// วันในสัปดาห์ 0=อาทิตย์ ตรงกับ Date.getDay() ของแอป (1970-01-01 เป็นวันพฤหัส = 4)
const weekday = (dn: number): number => (((dn + 4) % 7) + 7) % 7;
const ymdParts = (ds: string): [number, number, number] => { const [y, m, d] = ds.split('-').map(Number); return [y, m, d]; };

// ตรงกับ occursOn ของแอปทุกกรณี (พิสูจน์ด้วย due.test.mjs T2)
export function occursOnStr(it: ItemLite, ds: string): boolean {
  const r = it.repeat;
  const d0 = dayNumber(it.start), d = dayNumber(ds);
  if (d < d0 || (it.end && d > dayNumber(it.end))) return false;
  if (r.unit === 'none') return ds === it.start;
  if (r.unit === 'day') return (d - d0) % r.every === 0;
  if (r.unit === 'week') {
    return r.days.includes(weekday(d)) && Math.floor((d - (d0 - weekday(d0))) / 7) % r.every === 0;
  }
  const [y0, m0, dd0] = ymdParts(it.start), [y, m, dd] = ymdParts(ds);
  return dd === dd0 && ((y - y0) * 12 + (m - m0)) % r.every === 0;
}

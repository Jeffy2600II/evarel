import { HAPTIC_MS } from './01-core__constants.js';
import { pad, ymd, parse, addDays, fmtDate, nowHM, esc, fmtClock } from './core/dates.js';
/* ===== MODULE: core/dates ===== */
/* ฟังก์ชันบริสุทธิ์ (pad ymd parse addDays fmtDate nowHM esc fmtClock) อยู่ที่ core/dates.ts แล้ว ที่นี่ส่งออกชื่อเดิมต่อ และคงส่วนที่ผูกกับเบราว์เซอร์/เวลาโหลด: TODAY, dayLab, haptic */
export { pad, ymd, parse, addDays, fmtDate, nowHM, esc, fmtClock };
export const TODAY=ymd(new Date());
/* Haptics: ระบบสั่นสั้น — เรียก navigator.vibrate ตรง ๆ แบบของเดิม (v13) เป๊ะ ไม่มีตัวกัดการเรียก
   บทเรียนจากรุ่น 2026.9.0: เคยเก็บ supported จาก 'vibrate' in navigator ตอนโหลดโมดูลครั้งเดียวแล้วใช้กัดการเรียก
   snapshot ตอนโหลดไม่ใช่ความจริงตอนใช้ ทำให้การ์ดตั้งค่ารายงาน "เครื่องไม่รองรับ" ทั้งที่เครื่องสั่นได้ และเสี่ยงหยุดสั่นโดยไม่จำเป็น
   รุ่นนี้จึงกลับมาเรียกตรงทุกกรณีเหมือนเดิม ส่วนการ์ดตั้งค่าตรวจ 'vibrate' in navigator สด ๆ ตอน render แทน (ดู 19-views__settings) */
export const haptic=()=>{try{navigator.vibrate?.(HAPTIC_MS)}catch(e){console.warn('haptic',e)}};

/* moved by move_defs (evarel-ts-1f) */
export const dayLab=ds=>ds===TODAY?'วันนี้':ds===ymd(addDays(new Date(),-1))?'เมื่อวาน':ds===ymd(addDays(new Date(),1))?'พรุ่งนี้':fmtDate(ds);

Object.assign(window, { pad, ymd, parse, addDays, TODAY, fmtDate, nowHM, esc, fmtClock, haptic, dayLab });

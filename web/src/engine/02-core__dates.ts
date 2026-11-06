import { HAPTIC_MS } from './01-core__constants.js';
import { pad, ymd, parse, addDays, fmtDate, nowHM, esc, fmtClock } from './core/dates.js';
/* ===== MODULE: core/dates ===== */
/* ฟังก์ชันบริสุทธิ์ (pad ymd parse addDays fmtDate nowHM esc fmtClock) อยู่ที่ core/dates.ts แล้ว ที่นี่ส่งออกชื่อเดิมต่อ และคงส่วนที่ผูกกับเบราว์เซอร์/เวลาโหลด: TODAY, dayLab, haptic */
export { pad, ymd, parse, addDays, fmtDate, nowHM, esc, fmtClock };
export const TODAY=ymd(new Date());
/* Haptics: ระบบสั่นสั้น — Vibration API มีเฉพาะ Android (iOS ทุกเบราว์เซอร์/เดสก์ท็อป/กรอบ iframe พรีวิวไม่มีหรือถูกปิด)
   เดิมเรียกแล้ว fail เงียบ ๆ ผู้ใช้เลยรู้สึกเหมือน "ระบบสั่นหายไป" โดยไม่รู้สาเหตุ จึง (1) คงจุดเรียก haptic() เดิมทั้งหมด สั่นสั้น 10ms เหมือนเดิม
   (2) รับ pattern ได้สำหรับปุ่มทดสอบ (3) จดสถานะล่าสุดไว้ให้หน้าตั้งค่าแสดงผลวินิจฉัยแทนการเงียบ */
export const HAPTIC_TEST_PATTERN=[30,80,30,80,60];
export const hapticState:{supported:boolean,last:string}={supported:typeof navigator!=='undefined'&&'vibrate'in navigator,last:'ยังไม่ได้ทดสอบ'};
export const haptic:(p?:number|number[])=>boolean=(p?)=>{try{
  if(!hapticState.supported||typeof navigator.vibrate!=='function'){hapticState.last='อุปกรณ์นี้ไม่มี Vibration API (iPhone/iPad และเดสก์ท็อป)';return false}
  const ok=navigator.vibrate(p??HAPTIC_MS);hapticState.last=ok?'สั่นแล้ว':'เรียกแล้วแต่ถูกปฏิเสธ — เช็คโหมดเงียบของเครื่อง หรือถ้าเปิดในกรอบพรีวิว (iframe) ให้เปิดแท็บใหม่เต็มจอ';return ok
}catch(e){hapticState.last='ผิดพลาด: '+(e instanceof Error?e.message:String(e));console.warn('haptic',e);return false}};

/* moved by move_defs (evarel-ts-1f) */
export const dayLab=ds=>ds===TODAY?'วันนี้':ds===ymd(addDays(new Date(),-1))?'เมื่อวาน':ds===ymd(addDays(new Date(),1))?'พรุ่งนี้':fmtDate(ds);

Object.assign(window, { pad, ymd, parse, addDays, TODAY, fmtDate, nowHM, esc, fmtClock, haptic, hapticState, HAPTIC_TEST_PATTERN, dayLab });

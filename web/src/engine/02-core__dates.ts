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
const HAPTIC_DEDUPE_MS=200;
let lastHapticAt=0;
export const haptic=()=>{const now=Date.now();if(now-lastHapticAt<HAPTIC_DEDUPE_MS)return;lastHapticAt=now;
 try{navigator.vibrate?.(HAPTIC_MS)}catch(e){console.warn('haptic',e)}};

/* สั่นเมื่อแตะสิ่งที่กดได้ — ทำครั้งเดียวที่ระดับกลไก (Master สั่ง 6 พ.ย. 2026)
   สาเหตุที่ของเดิมหาย: หลังย้ายหน้าจอส่วนใหญ่ไปเรนเดอร์ด้วย React ตัวจัดการคลิกย้ายออกจากเอนจิน
   ทำให้ปุ่มในหน้าจอใหม่ไม่เรียก haptic เลย (เดิมทุก handler ในเอนจินเรียกเอง)
   ตัวดักกลางนี้ทำให้ทุกปุ่มสั่นเหมือนเดิมไม่ว่าหน้าไหนจะเรนเดอร์ด้วยอะไร
   - ใช้ capture เพื่อให้ได้ผลแม้ตัวจัดการของ React จะหยุดการกระจายเหตุการณ์
   - ข้ามช่องพิมพ์/ข้อความ (ไม่สั่นตอนพิมพ์) ปุ่มที่ปิดอยู่ และสิ่งที่ติด data-no-haptic
   - กันสั่นซ้ำ: haptic() ไม่สั่นถ้าเพิ่งสั่นภายใน HAPTIC_DEDUPE_MS */
const HAPTIC_TARGETS='button,[role="button"],[data-act],[data-tab],[data-haptic],a[href],.ev-card,.ev-chip,.ev-seg button,label.ev-switch,input[type="checkbox"],input[type="radio"],select';
const hapticSkip=(el:HTMLElement)=>{
  if(!el||(el as any).disabled)return true;
  if(el.getAttribute('aria-disabled')==='true')return true;
  if(el.closest('[data-no-haptic]'))return true;
  const tag=el.tagName;
  if(tag==='INPUT'&&!/checkbox|radio/i.test(el.getAttribute('type')||''))return true;
  if(tag==='TEXTAREA'||(el as any).isContentEditable)return true;
  return false;
};
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){ /* เทสต์ใน Node จำลอง document แบบไม่มี addEventListener */
  document.addEventListener('click',(e)=>{
    const t=e.target as HTMLElement|null;
    const el=(t&&t.closest?t.closest(HAPTIC_TARGETS):null) as HTMLElement|null;
    if(!el||hapticSkip(el))return;
    haptic();
  },true);
}

/* moved by move_defs (evarel-ts-1f) */
export const dayLab=ds=>ds===TODAY?'วันนี้':ds===ymd(addDays(new Date(),-1))?'เมื่อวาน':ds===ymd(addDays(new Date(),1))?'พรุ่งนี้':fmtDate(ds);

Object.assign(window, { pad, ymd, parse, addDays, TODAY, fmtDate, nowHM, esc, fmtClock, haptic, dayLab });

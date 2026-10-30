/* ชั้นฐาน (ES module จริง): ตรรกะแจ้งเตือนบริสุทธิ์ (ความหมายของ rem / สถานะ / เปิดปิดตามเวลา-ล่วงหน้า / นับรายการที่แจ้งได้) ไม่แตะ DOM, ST, เครือข่าย, เวลา
   ตัดวางจาก m/10-services__notify ตรงตัวอักษร ต่างแค่ export และชนิด :any ที่พารามิเตอร์ (core ตรวจ noImplicitAny) | โมดูลเดิมนำเข้าแล้วส่งชื่อเดิมต่อทาง window ตรรกะชุดเดียวไม่มีสองสำเนา */
/* ความหมายของฟิลด์ rem (evarel-notify-default, 14 ต.ค. 2026 ตามที่ Master สั่ง):
   {k:'before',m:0} = แจ้งเตือนตรงเวลา "เปิด" (ค่าเริ่มต้นของรายการใหม่) | ไม่มี = ผู้ใช้ปิดเอง
   {k:'before',m>0} = เตือนล่วงหน้า m นาที (เพื่อเตือนความจำ) | {k:'at',t:'HH:MM'} = เตือนตามเวลาที่ตั้งเอง
   แหล่งความจริงเดียวของความหมายนี้: ฟอร์ม validate และการแสดงผลต้องเรียกที่นี่ ไม่ตีความ rem เอง (Worker ตีความตรงกันใน reminders.ts) */
export const AHEAD_PRESETS=[10,30,60,1440];
/* REM_PRESETS ตามเดโม v24 จริง (REM_PRESETS=[0,10,30,60,1440]): ชิปแรก m=0 คือ ตรงเวลา อยู่ในชุดเดียวกับล่วงหน้า — ใช้ในฟอร์มเท่านั้น (string + React) */
export const isRemObj=(r:any)=>r&&typeof r==='object'&&!Array.isArray(r);
export const remList=(rem:any)=>Array.isArray(rem)?rem.filter(isRemObj):[];
export const defaultRem=()=>[{k:'before',m:0}];
export function notifyState(rem:any,hasTime:any){
 const L=remList(rem),onTime=L.some(r=>r.k==='before'&&r.m===0);
 const ahead=[...new Set(L.filter(r=>r.k==='before'&&Number.isInteger(r.m)&&r.m>0).map(r=>r.m))].sort((a,b)=>a-b);
 const at=[...new Set(L.filter(r=>r.k==='at'&&typeof r.t==='string').map(r=>r.t))].sort();
 const issue=(onTime||ahead.length)&&!hasTime?'ต้องใส่เวลา จึงจะแจ้งเตือนได้ ถ้าไม่ต้องการแจ้งเตือน ให้ปิดแจ้งเตือน':'';
 return {onTime,ahead,at,issue}}
export const checkNotify=(rem:any,time:any)=>notifyState(rem,!!time).issue;
export function toggleOnTime(rem:any,on:any){
 const L=remList(rem).map(r=>({...r})),has=L.some(r=>r.k==='before'&&r.m===0);
 if(on)return has?L:[{k:'before',m:0},...L];
 return L.filter(r=>!(r.k==='before'&&r.m===0))}
export function toggleAhead(rem:any,m:any){
 const L=remList(rem).map(r=>({...r}));
 if(!Number.isInteger(m)||m<=0)return L;
 const has=L.some(r=>r.k==='before'&&r.m===m);
 return has?L.filter(r=>!(r.k==='before'&&r.m===m)):[...L,{k:'before',m}]}
/** จำนวนรายการที่แจ้งเตือนได้จริง (หน้าตั้งค่า): มีเวลาของรายการ และเปิดตรงเวลาหรือล่วงหน้า หรือมีเวลาตั้งเอง (at) ทนข้อมูลผิดรูป */
export function countNotifiable(items:any) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items) {
    if (!it || typeof it !== 'object' || !Array.isArray(it.rem)) continue;
    const s = notifyState(it.rem, true);
    if (s.at.length || ((s.onTime || s.ahead.length) && it.time)) n++;
  }
  return n;
}

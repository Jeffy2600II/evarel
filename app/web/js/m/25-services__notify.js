/* ===== MODULE: services/notify ===== */
/* ความหมายของฟิลด์ rem (evarel-notify-default, 14 ต.ค. 2026 ตามที่ Master สั่ง):
   {k:'before',m:0} = แจ้งเตือนตรงเวลา "เปิด" (ค่าเริ่มต้นของรายการใหม่) | ไม่มี = ผู้ใช้ปิดเอง
   {k:'before',m>0} = เตือนล่วงหน้า m นาที (เพื่อเตือนความจำ) | {k:'at',t:'HH:MM'} = เตือนตามเวลาที่ตั้งเอง
   แหล่งความจริงเดียวของความหมายนี้: ฟอร์ม validate และการแสดงผลต้องเรียกที่นี่ ไม่ตีความ rem เอง (Worker ตีความตรงกันใน reminders.ts) */
const AHEAD_PRESETS=[10,30,60,1440];
const isRemObj=r=>r&&typeof r==='object'&&!Array.isArray(r);
const remList=rem=>Array.isArray(rem)?rem.filter(isRemObj):[];
const defaultRem=()=>[{k:'before',m:0}];
function notifyState(rem,hasTime){
 const L=remList(rem),onTime=L.some(r=>r.k==='before'&&r.m===0);
 const ahead=[...new Set(L.filter(r=>r.k==='before'&&Number.isInteger(r.m)&&r.m>0).map(r=>r.m))].sort((a,b)=>a-b);
 const at=[...new Set(L.filter(r=>r.k==='at'&&typeof r.t==='string').map(r=>r.t))].sort();
 const issue=(onTime||ahead.length)&&!hasTime?'ต้องใส่เวลา จึงจะแจ้งเตือนได้ ถ้าไม่ต้องการแจ้งเตือน ให้ปิดแจ้งเตือน':'';
 return {onTime,ahead,at,issue}}
const checkNotify=(rem,time)=>notifyState(rem,!!time).issue;
function toggleOnTime(rem,on){
 const L=remList(rem).map(r=>({...r})),has=L.some(r=>r.k==='before'&&r.m===0);
 if(on)return has?L:[{k:'before',m:0},...L];
 return L.filter(r=>!(r.k==='before'&&r.m===0))}
function toggleAhead(rem,m){
 const L=remList(rem).map(r=>({...r}));
 if(!Number.isInteger(m)||m<=0)return L;
 const has=L.some(r=>r.k==='before'&&r.m===m);
 return has?L.filter(r=>!(r.k==='before'&&r.m===m)):[...L,{k:'before',m}]}
/** จำนวนรายการที่แจ้งเตือนได้จริง (หน้าตั้งค่า): มีเวลาของรายการ และเปิดตรงเวลาหรือล่วงหน้า หรือมีเวลาตั้งเอง (at) ทนข้อมูลผิดรูป */
function countNotifiable(items) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items) {
    if (!it || typeof it !== 'object' || !Array.isArray(it.rem)) continue;
    const s = notifyState(it.rem, true);
    if (s.at.length || ((s.onTime || s.ahead.length) && it.time)) n++;
  }
  return n;
}
Object.assign(window, { AHEAD_PRESETS, defaultRem, notifyState, checkNotify, toggleOnTime, toggleAhead, countNotifiable });

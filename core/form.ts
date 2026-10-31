/* ชั้นฐาน (ES module จริง): ตรรกะฟอร์มเพิ่ม/แก้ไขบริสุทธิ์ (ร่างเริ่มต้น ร่างจากรายการ ข้อความสรุป การตรวจความถูกต้อง และการสร้างรายการ) ไม่แตะ DOM/ST
   ตัดวางจาก m/14-ui__form ตรงตัวอักษร 31 ต.ค. 2026 ต่างแค่ export และ ST.D ที่กลายเป็นพารามิเตอร์ d
   ส่วน HTML builder ของแผง (SR PN IR ri TR repPanel rangePanel remPanel formBody typeBody) และการวาด sheet ยังอยู่ฝั่งตัวห่อ (ผูก UI primitive ของ m/01) */
import { UNIT_TH, WD, MAX_REM } from './constants.js';
import { esc, parse } from './dates.js';
import { remText } from './schedule.js';
import { checkNotify } from './notify.js';

/** ร่างเริ่มต้นของประเภท t | base = วันเริ่มที่ควรใช้ (ตัวห่อคำนวณจาก UI/TODAY ผ่าน startBase เดิม) */
export const newDraftOf=(t:any,base:any)=>({id:null,step:'form',open:'',type:t,title:'',subject:'',start:base,end:'',endMode:'never',time:'',timeEnd:'',unit:t==='habit'?'day':'none',every:1,days:[],track:'check',target:1,unitName:'',rem:[{k:'before',m:0}],err:''});
/** ร่างจากรายการที่มีอยู่ (แก้ไข) */
export const draftFromOf=(it:any)=>({id:it.id,step:'form',open:'',type:it.type,title:it.title,subject:it.subject,start:it.start,end:it.end,endMode:it.end?'date':'never',time:it.time,timeEnd:it.timeEnd,unit:it.repeat.unit,every:it.repeat.every,days:[...it.repeat.days],track:it.track==='none'?'check':it.track,target:it.target,unitName:it.unitName,rem:it.rem.map((r:any)=>({...r})),err:''});
export const everyTxtOf=(d:any)=>d.every>1?`ทุก ${d.every} `:'ทุก';
export const repSumOf=(d:any)=>d.unit==='none'?'ไม่ซ้ำ':d.unit==='week'?`${everyTxtOf(d)}สัปดาห์${d.days.length?` · ${[...d.days].sort().map((x:any)=>WD[x]).join(' ')}`:''}`:`${everyTxtOf(d)}${(UNIT_TH as any)[d.unit]}`;
export const remSumOf=(d:any)=>d.rem.length?d.rem.slice(0,2).map(remText).join(', ')+(d.rem.length>2?` +${d.rem.length-2}`:''):'ปิดแจ้งเตือน';
export const rangeSumOf=(d:any,today:any)=>`${d.start===today?'เริ่มวันนี้':`เริ่ม ${d.start}`} · ${d.endMode==='date'&&d.end?`ถึง ${d.end}`:'ไม่สิ้นสุด'}`;
/** แจ้งเตือนผิดพลาด: ตั้งเตือนก่อนถึงเวลาแต่ไม่มีเวลาทำรายการ (ตามเดโม v24) */
export const notifyIssueOf=(d:any)=>d.rem.some((r:any)=>r.k==='before'&&r.m>=0)&&!d.time?'ต้องใส่เวลา จึงจะแจ้งเตือนได้ ถ้าไม่ต้องการแจ้งเตือน ให้ปิดแจ้งเตือน':'';
/** ตรวจความถูกต้องของร่าง คืนข้อความผิดพลาด (ค่าว่าง = ผ่าน) | checkNotify มาจาก core/notify (กติกาเดียวกับ notifyState) */
export function validateOf(d:any){const T=d.type;if(!d.title.trim())return 'กรุณาใส่ชื่อรายการ';if(!d.start)return 'กรุณาเลือกวันที่';
 if(d.time&&d.timeEnd&&d.timeEnd<=d.time)return 'เวลาจบต้องหลังเวลาเริ่ม';if(d.endMode==='date'&&(!d.end||d.end<d.start))return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
 {const ne=checkNotify(d.rem,d.time);if(ne)return ne}
 if(T==='class'&&!d.days.length)return 'เลือกวันที่เรียนอย่างน้อย 1 วัน';return ''}
/** สร้างรายการจากร่าง | mk = ตัวสร้างรายการของผู้เรียก (m/03 ห่อ core/store โดยส่ง TODAY) | old = รายการเดิมตอนแก้ไข (รักษา log/skip) */
export function buildItemOf(d:any,mk:any,old:any){const T=d.type,week=T==='class'||d.unit==='week',days=week?(d.days.length?[...d.days]:[parse(d.start).getDay()]):[];
 const unit=T==='task'?'none':T==='class'?'week':d.unit,multi=T==='habit'&&d.track!=='check';
 return mk({id:d.id||Date.now(),type:T,title:d.title.trim(),subject:(d.subject||'').trim(),start:d.start,end:d.endMode==='date'&&unit!=='none'?d.end:'',time:d.time,timeEnd:T==='task'||T==='habit'?'':d.timeEnd,
  rem:d.rem.slice(0,MAX_REM).map((r:any)=>({...r})),repeat:{unit,every:Math.max(1,Math.round(+d.every||1)),days},track:T==='habit'?d.track:T==='task'?'check':'none',target:multi?Math.max(1,Math.round(+d.target||1)):1,unitName:multi?(d.unitName||'').trim():'',log:old?old.log:{},skip:old?old.skip:{}})}

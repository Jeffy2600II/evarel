import { TODAY, esc } from './02-core__dates.js';
import { S } from './05-data__auth.js';
import { occursOn, val, target, tracked, isDone, skipped, streak, rate, remText, repeatText, timeText, periodOf, PERIODS, scheduled } from './core/schedule.js';
/* ===== MODULE: services/schedule ===== */
/* ตรรกะบริสุทธิ์ 14 ตัว (occursOn val target tracked isDone skipped streak rate remText repeatText timeText periodOf PERIODS scheduled) อยู่ที่ core/schedule.ts แล้ว ที่นี่ส่งออกชื่อเดิมต่อ
   ที่ยังอยู่ใน m/ เพราะอ่านสถานะกลาง S.items หรือ TODAY ที่คำนวณตอนโหลด: isFuture onDate overdue dayState dayMenu */
export { occursOn, val, target, tracked, isDone, skipped, streak, rate, remText, repeatText, timeText, periodOf, PERIODS, scheduled };
export const isFuture=ds=>ds>TODAY;
export const onDate=ds=>S.items.filter(it=>occursOn(it,ds)).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
export const overdue=()=>S.items.filter(it=>it.type==='task'&&it.start<TODAY&&!isDone(it,it.start)).sort((a,b)=>a.start.localeCompare(b.start));

/* moved by move_defs (evarel-ts-1f) */
export function dayState(it,ds){if(!scheduled(it,ds))return 'off';if(skipped(it,ds))return 'skip';if(isDone(it,ds))return 'done';if(val(it,ds)>0)return 'part';if(ds>TODAY)return 'future';return ds===TODAY?'today':'miss'}
export function dayMenu(it,ds){const sk=skipped(it,ds),v=val(it,ds),tg=target(it),multi=it.track!=='check',done=isDone(it,ds),out=[];
 if(sk)return [{act:'dm-skip',id:`0|${ds}`,icon:'x',label:'เลิกข้าม'}];
 if(multi)out.push({act:'dm-set',id:`${tg}|${ds}`,icon:'check',label:`ทำครบเป้า (${tg} ${esc(it.unitName)})`,hint:done?'ปัจจุบัน':''},{act:'dm-num',id:ds,icon:'edit',label:'ปรับจำนวน…',hint:`${v}/${tg}`},{act:'dm-set',id:`0|${ds}`,icon:'x',label:'ล้างเป็น 0'});
 else out.push({act:'dm-set',id:`1|${ds}`,icon:'check',label:'ทำแล้ว',hint:done?'ปัจจุบัน':''},{act:'dm-set',id:`0|${ds}`,icon:'x',label:'ยังไม่ทำ',hint:done?'':'ปัจจุบัน'});
 if(!done)out.push('-',{act:'dm-skip',id:`1|${ds}`,icon:'skip',label:'ข้ามวันนี้ (ไม่นับเป็นพลาด)'});return out}

Object.assign(window, { occursOn, val, target, tracked, isDone, skipped, isFuture, onDate, overdue, streak, rate, remText, repeatText, timeText, periodOf, PERIODS, scheduled, dayState, dayMenu });

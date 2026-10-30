/* ชั้นฐาน (ES module จริง): ตรรกะปฏิทินบริสุทธิ์ (บวกนาที/สร้างรายการเหตุการณ์ตามช่วงวัน/จุดสีของวัน) ไม่แตะ DOM, FullCalendar และไม่อ่านสถานะกลาง S
   ตัดวางจาก m/20-services__calendar ตรงตัวอักษร ต่างแค่ export, ชนิด (พารามิเตอร์ out:any[] ev:any ให้ tsc ยอมให้ออกไฟล์) และ S.items ที่เปลี่ยนเป็น items ซึ่งรับจากผู้เรียก
   โมดูลเดิมห่อ occurrenceEvents(start,end) = occurrenceEventsOf(S.items,start,end) และ dotsFor(ds) = dotsForOf(S.items,ds) ตรรกะชุดเดียวไม่มีสองสำเนา */
import { pad, ymd, addDays } from './dates.js';
import { scheduled, skipped, tracked, isDone } from './schedule.js';

export const addMin=(t:string,m:number)=>{const [h,mi]=t.split(':').map(Number),x=Math.min(h*60+mi+m,1439);return `${pad(Math.floor(x/60))}:${pad(x%60)}`};
export function occurrenceEventsOf(items:any[],start:Date,end:Date){const out:any[]=[];
 for(let d=new Date(start);d<end;d=addDays(d,1)){const ds=ymd(d);
  items.forEach(it=>{if(!scheduled(it,ds)||skipped(it,ds)||(it.type==='habit'&&!it.time))return;const done=tracked(it)&&isDone(it,ds),ev:any={id:`${it.id}_${ds}`,title:it.title,classNames:[`ev-fc-${it.type}`,...(done?['is-done']:[])],extendedProps:{itemId:it.id}};
   if(it.time){ev.start=`${ds}T${it.time}:00`;ev.end=`${ds}T${it.timeEnd||addMin(it.time,it.type==='habit'?30:60)}:00`}else{ev.start=ds;ev.allDay=true}out.push(ev)})}
 return out}
export const dotsForOf=(items:any[],ds:string)=>{const ts=[...new Set(items.filter(it=>scheduled(it,ds)&&!skipped(it,ds)).map(it=>it.type))].slice(0,4);return ts.map(t=>`<i data-t="${t}"></i>`).join('')};

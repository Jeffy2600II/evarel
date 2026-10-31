/* ชั้นฐาน (ES module จริง): ตรรกะปฏิทินบริสุทธิ์ (บวกนาที/สร้างรายการเหตุการณ์ตามช่วงวัน/จุดสีของวัน) ไม่แตะ DOM, FullCalendar และไม่อ่านสถานะกลาง S
   ตัดวางจาก m/20-services__calendar ตรงตัวอักษร ต่างแค่ export, ชนิด (พารามิเตอร์ out:any[] ev:any ให้ tsc ยอมให้ออกไฟล์) และ S.items ที่เปลี่ยนเป็น items ซึ่งรับจากผู้เรียก
   โมดูลเดิมห่อ occurrenceEvents(start,end) = occurrenceEventsOf(S.items,start,end) และ dotsFor(ds) = dotsForOf(S.items,ds) ตรรกะชุดเดียวไม่มีสองสำเนา */
import { pad, ymd, addDays } from './dates.js';
import { occursOn, scheduled, skipped, tracked, isDone } from './schedule.js';

export const addMin=(t:string,m:number)=>{const [h,mi]=t.split(':').map(Number),x=Math.min(h*60+mi+m,1439);return `${pad(Math.floor(x/60))}:${pad(x%60)}`};
export function occurrenceEventsOf(items:any[],start:Date,end:Date){const out:any[]=[];
 for(let d=new Date(start);d<end;d=addDays(d,1)){const ds=ymd(d);
  items.forEach(it=>{if(!scheduled(it,ds)||skipped(it,ds)||(it.type==='habit'&&!it.time))return;const done=tracked(it)&&isDone(it,ds),ev:any={id:`${it.id}_${ds}`,title:it.title,classNames:[`ev-fc-${it.type}`,...(done?['is-done']:[])],extendedProps:{itemId:it.id}};
   if(it.time){ev.start=`${ds}T${it.time}:00`;ev.end=`${ds}T${it.timeEnd||addMin(it.time,it.type==='habit'?30:60)}:00`}else{ev.start=ds;ev.allDay=true}out.push(ev)})}
 return out}
export const dotsForOf=(items:any[],ds:string)=>{const ts=[...new Set(items.filter(it=>scheduled(it,ds)&&!skipped(it,ds)).map(it=>it.type))].slice(0,4);return ts.map(t=>`<i data-t="${t}"></i>`).join('')};
/* ===== ส่วนคำนวณที่เหลือของ m/20 (ตัดวางตรงตัวอักษร 31 ต.ค. 2026): สถิติของเดือนในหน้ารายละเอียด และครั้งถัดไปของรายการ
   ตัวเลขเดิมคำนวณกลางไฟล์ HTML builder (detailHabit/detailSchedule) ย้ายลูปออกมา โมดูลเดิมเรียกใช้ผ่านตัวห่อ (รับ today แทนการอ่าน TODAY เอง) */
/** นับวันของเดือน y/m ที่: ยังไม่ถึงวันนี้ (ds<=today) มีกำหนด (scheduled) และไม่ได้ข้าม (skipped) = t | ในจำนวนนั้นที่ทำเสร็จ = ok (เหมือนลูปเดิมใน detailHabit ทุกเงื่อนไข) */
export function monthStatsOf(it:any,y:number,m:number,today:string){let t=0,ok=0;
 const dim=new Date(y,m+1,0).getDate();
 for(let d=1;d<=dim;d++){const ds=ymd(new Date(y,m,d));if(ds<=today&&scheduled(it,ds)&&!skipped(it,ds)){t++;if(isDone(it,ds))ok++}}
 return {t,ok}}
/** ครั้งถัดไปของรายการ: กวาดหา maxDays วันนับจากวันนี้ เก็บไม่เกิน maxCount วันที่ occursOn (เหมือนลูปเดิมใน detailSchedule: ใช้ occursOn ไม่ใช่ scheduled — คงพฤติกรรมเดิมทุกจุด) */
export function nextOccurrencesOf(it:any,today:string,maxDays=90,maxCount=5){const next:string[]=[];
 for(let i=0;i<maxDays&&next.length<maxCount;i++){const ds=ymd(addDays(new Date(today+'T00:00:00'),i));if(occursOn(it,ds))next.push(ds)}
 return next}

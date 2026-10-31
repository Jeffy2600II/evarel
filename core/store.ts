/* ชั้นฐาน (ES module จริง): สร้างรายการเริ่มต้นและตัวช่วย mk fill daily weekly cls seed เป็นฟังก์ชันบริสุทธิ์ รับ today เป็นอาร์กิวเมนต์
   ตรรกะชุดเดียว: โมดูลเดิม 03-core__store ห่อเรียกที่นี่โดยส่ง TODAY (คำนวณตอนโหลด) เข้าไป */
import { addDays, ymd } from './dates';
import type { Item, Repeat } from './schedule';

export const mk = (today: string, o: Partial<Item>): Item => ({ id: o.id as number, type: 'habit', title: '', subject: '', start: today, end: '', time: '', timeEnd: '', rem: [{ k: 'before', m: 0 }], track: 'none', target: 1, unitName: '', repeat: { unit: 'none', every: 1, days: [] }, log: {}, skip: {}, ...o } as Item);
export const fill = (n: number, v: number): Record<string, number> => Object.fromEntries(Array.from({ length: n }, (_, i) => [ymd(addDays(new Date(), -i - 1)), v]));
export const daily = (): Repeat => ({ unit: 'day', every: 1, days: [] });
export const weekly = (d: number[]): Repeat => ({ unit: 'week', every: 1, days: d });
export const cls = (today: string, id: number, d: number, t: string, te: string, title: string): Item => mk(today, { id, type: 'class', title, time: t, timeEnd: te, repeat: weekly([d]) });
export const seed = (today: string): { items: Item[] } => ({ items: [
 mk(today,{id:1,title:'ดื่มน้ำ',track:'count',target:8,unitName:'แก้ว',repeat:daily(),log:fill(6,8),start:ymd(addDays(new Date(),-10))}),
 mk(today,{id:2,title:'อ่านหนังสือ',time:'19:00',track:'timer',target:30,unitName:'นาที',repeat:daily(),log:fill(3,30),start:ymd(addDays(new Date(),-10))}),
 mk(today,{id:3,title:'นอนก่อน 22:00',time:'22:00',track:'check',repeat:daily(),log:fill(4,1),start:ymd(addDays(new Date(),-10))}),
 mk(today,{id:4,title:'วิ่ง',time:'17:00',track:'check',repeat:weekly([1,3,5]),start:ymd(addDays(new Date(),-10)),log:Object.fromEntries(Array.from({length:5},(_,i)=>[ymd(addDays(new Date(),-i*2-1)),1]))}),
 mk(today,{id:5,type:'task',title:'การบ้านคณิตศาสตร์',subject:'คณิต',time:'16:00',track:'check'}),
 mk(today,{id:6,type:'task',title:'ท่องคำศัพท์ Unit 4',subject:'อังกฤษ',time:'20:00',track:'check',start:ymd(addDays(new Date(),-1))}),
 mk(today,{id:7,type:'task',title:'รายงานวิทยาศาสตร์',subject:'วิทย์',track:'check',start:ymd(addDays(new Date(),2))}),
 mk(today,{id:8,type:'event',title:'ประชุมชมรม',time:'16:30',timeEnd:'17:30',repeat:weekly([4])}),
 cls(today,9,1,'08:30','09:20','คณิตศาสตร์'),cls(today,10,1,'09:20','10:10','ภาษาไทย'),cls(today,11,2,'08:30','09:20','อังกฤษ'),cls(today,12,3,'08:30','09:20','วิทยาศาสตร์'),cls(today,13,4,'09:20','10:10','ศิลปะ'),cls(today,14,5,'08:30','09:20','ชุมนุม')]});

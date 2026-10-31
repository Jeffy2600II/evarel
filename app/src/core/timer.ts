/* ชั้นฐาน (ES module จริง): ตรรกะตัวจับเวลาบริสุทธิ์ (มิลลิวินาทีสะสม/เปอร์เซ็นต์หน้าปัด/นาทีที่จะบันทึก) ไม่แตะ DOM, ST, localStorage และไม่อ่านเวลาเอง (รับ now จากผู้เรียก)
   ตัดวางจาก m/15-core__timer ตรงตัวอักษร 31 ต.ค. 2026 | โมดูลเดิมห่อ tmMs() = tmMsOf(ST.TM, Date.now()) ตรรกะชุดเดียวไม่มีสองสำเนา */
/** มิลลิวินาทีรวมของตัวจับเวลา: สะสมก่อนหน้า + ช่วงที่กำลังรัน (ถ้าไม่มีตัวจับ คืน 0 | เงื่อนไข startedAt ตรงตัวเดิม — ล้มเหลวเมื่อ clock ย้อนหลังเหมือนเดิม) */
export const tmMsOf=(tm:any,now:any)=>tm?tm.acc+(tm.startedAt?now-tm.startedAt:0):0;
/** เปอร์เซ็นต์หน้าปัดจับเวลา: บีบบนที่ 100 (เหมือนที่ focusBody และ tick ใช้สูตรเดียวกัน) */
export const dialPctOf=(doneMs:any,goalMs:any)=>Math.min(100,doneMs/goalMs*100);
/** นาทีที่จะบันทึกตอนจบ (ปัดครึ่งขึ้นเหมือนเดิม: <30 วินาที = 0 นาที -> ไม่บันทึก) */
export const timerMinsOf=(tm:any,now:any)=>Math.round(tmMsOf(tm,now)/60000);

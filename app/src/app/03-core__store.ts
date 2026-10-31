import { TODAY } from './02-core__dates.js';
import { mk as mkOf, fill, daily, weekly, cls as clsOf, seed as seedOf } from './core/store.js';
/* ===== MODULE: core/store ===== */
/* ตรรกะสร้างรายการเริ่มต้นอยู่ที่ core/store.ts แล้ว (รับ today เป็นอาร์กิวเมนต์) ที่นี่เหลือตัวห่อบางที่ส่ง TODAY (คำนวณตอนโหลด) เข้าไป คงลายเซ็นเดิม: mk cls seed */
export { fill, daily, weekly };
export const mk=(o:any)=>mkOf(TODAY,o);
export const cls=(id:number,d:number,t:string,te:string,title:string)=>clsOf(TODAY,id,d,t,te,title);
export const seed=()=>seedOf(TODAY);

Object.assign(window, { mk, fill, daily, weekly, cls, seed });

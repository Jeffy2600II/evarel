/* ชั้นฐาน (ES module จริง): อวาตาร์สร้างอัตโนมัติจากชื่อ/อีเมล (ตัวอักษรแรก + สีประจำคน) ไม่แตะ ST/DOM
   ตัดวางจาก m/05-data__auth ตรงตัวอักษร 31 ต.ค. 2026 ต่างแค่ export, ชนิด (! ที่ codePointAt) และผู้ใช้ที่เคยอ่านจาก ST.USER กลายเป็นพารามิเตอร์
   โมดูลเดิมห่อ profileOf() = profileOfUser(ST.USER) ตรรกะชุดเดียวไม่มีสองสำเนา */
import { esc } from './dates.js';
export const AV_HUES=[250,268,286,306,330,352,12,24,162,176,190,204,222],THAI_LEAD=/^[เแโใไ]+/;
const AV_LIGHT_FIX:Record<number,number>={162:33,176:33,190:33}; /* เฉด 162/176/190 -> L 33% = 4.70/4.60/5.9:1 ผ่าน 4.5:1 | อีก 10 เฉดผ่านอยู่แล้ว ไม่แตะ */
export const hashStr=(s:any)=>{let h=2166136261;for(const ch of String(s)){h^=ch.codePointAt(0)!;h=Math.imul(h,16777619)}return h>>>0};
/** ข้อมูลอวาตาร์ของผู้ใช้: ชื่อ/ตัวอักษรแรก (ตัดสระนำไทย) และไล่สีประจำคนจาก seed */
export function profileOfUser(U:any){const user:any=U,name=(user?.name||'').trim(),seed=user?.id||user?.email||name||'?',src=(name||user?.email||'?').replace(THAI_LEAD,'')||'?',h=AV_HUES[hashStr(seed)%AV_HUES.length],L=AV_LIGHT_FIX[h]??38; /* L = ความสว่างจุดสว่างของไล่สี: เฉดเขียวน้ำทะเลที่ 38% ให้ตัวอักษรขาวได้ 3.58-4.33:1 ไม่ผ่าน WCAG 1.4.3 จึงลดเฉพาะเฉดนั้น (วัด 23 ต.ค. 2026) */
 return {name:name||user?.email||'',letter:([...src][0]||'?').toUpperCase(),bg:`linear-gradient(140deg,hsl(${h} 55% ${L}%),hsl(${(h+26)%360} 55% 28%))`}}
/** HTML อวาตาร์ (ปุ่มเปิดตั้งค่า หรือรูปประกอบ) — เรียก profileOfUser เองจากผู้ใช้ที่รับเข้ามา */
export function avatarHTMLOf(U:any,o:any={}){const p=profileOfUser(U),tag=o.tag==='button'?'button':'span',a=tag==='button'?` type="button" data-act="${o.act||'settings'}" aria-label="${o.label||'ตั้งค่า'}"`:` role="img" aria-label="${esc(p.name||'โปรไฟล์')}"`;
 return `<${tag} class="ev-avatar"${a} style="--av: ${p.bg};${o.size?` --sz: ${o.size}px;`:''}">${esc(p.letter)}</${tag}>`}
/** ชื่อต้นของผู้ใช้ (คำแรกของชื่อที่ trim แล้ว) */
export const firstNameOf=(U:any)=>((U?.name||'').trim().split(/\s+/)[0]);

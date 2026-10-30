/* ชั้นฐาน (ES module จริง): ตรรกะโควตา AI บริสุทธิ์ (สถานะ/ข้อความสั้น/นาฬิการีเซ็ต/เวลาที่เหลือ) ไม่แตะ DOM, ST, เครือข่าย และไม่อ่านเวลาเอง
   ตัดวางจาก m/16-services__ai-quota ตรงตัวอักษร ต่างแค่ export และ resetInAt(iso, now) ที่รับเวลาจากผู้เรียก (เดิม resetIn เรียก Date.now() เอง)
   โมดูลเดิมห่อ resetIn(iso) = resetInAt(iso, Date.now()) เพื่อให้เวลาปัจจุบันยังอยู่ฝั่งแอป ตรรกะชุดเดียวไม่มีสองสำเนา */
import { pad } from './dates.js';

export const QUOTA_LOW = 0.2;
export const resetMs=(iso:any)=>{const v=+new Date(iso);return Number.isFinite(v)?v:NaN};
export function quotaState(q:any){if(!q||q.unknown||!q.calls||!q.tokens||!(q.calls.limit>0)||!(q.tokens.limit>0))return null;if(q.blocked||q.calls.remaining<=0||q.tokens.remaining<=0)return 'out';const r=Math.min(q.calls.remaining/q.calls.limit,q.tokens.remaining/q.tokens.limit);return r<=QUOTA_LOW?'low':'ok'}
export function quotaShort(q:any){const st=quotaState(q);if(st==='out')return 'โควตาหมด';
 const cr=q.calls.remaining/q.calls.limit,tr=q.tokens.remaining/q.tokens.limit;
 if(tr<=QUOTA_LOW&&tr<cr)return 'ใกล้ถึงขีดจำกัดวันนี้';
 return `เหลือ ${q.calls.remaining} จาก ${q.calls.limit} ครั้ง`}
export function resetClock(iso:any){const d=new Date(iso);if(isNaN(d.getTime()))return '';const b=new Date(+d+7*3600000);return `${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`}
export function resetInAt(iso:any,now:number){const ms=resetMs(iso)-now;if(!(ms>0))return 'ในอีกสักครู่';const m=Math.ceil(ms/60000),h=Math.floor(m/60);return h>=1?`อีก ${h} ชม. ${m%60} นาที`:`อีก ${m} นาที`}

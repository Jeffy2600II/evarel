import { TODAY, parse } from './02-core__dates.js';
import { authErr, SUPA_SESS, nowS, supaLoad, supaSave, supaClear, SupaCore, SUPA_HOST, SupaAuth, SupaAdapter } from './core/authclient.js';
/* ===== MODULE: data/auth — จุดต่อระบบบัญชี: เปลี่ยน `Auth` ตัวเดียว (UI ไม่รู้ว่าล็อกอินทำงานอย่างไร) =====
   ตรรกะไคลเอนต์ (authErr SUPA_SESS nowS supaLoad supaSave supaClear SupaCore SUPA_HOST SupaAuth SupaAdapter) อยู่ที่ core/authclient.ts แล้ว
   ที่นี่ส่งออกชื่อเดิมต่อ และคงส่วนที่ผูกกับเวลาโหลด: อ่าน window.EVAREL_API สร้าง Auth กับ ST.Repo */
export { authErr, SUPA_SESS, nowS, supaLoad, supaSave, supaClear, SupaCore, SUPA_HOST, SupaAuth, SupaAdapter };

export const SUPA_API=typeof window!=='undefined'&&window.EVAREL_API?String(window.EVAREL_API).replace(/\/+$/,'')+'/api':null;
if(!SUPA_API)throw new Error('EVAREL_API ไม่ถูกตั้งค่า: แอปทำงานได้เฉพาะเมื่อเชื่อม API จริง');
export const Auth=SupaAuth(SUPA_API);ST.Repo=SupaAdapter(SUPA_API);
/* ===== ui/profile (v24): อวาตาร์สร้างอัตโนมัติจากชื่อ/อีเมล (ตัวอักษรแรก + สีประจำคน) ทุกหน้าเรียก avatarHTML()/profileOf() ที่เดียว ===== */
export const AV_HUES=[250,268,286,306,330,352,12,24,162,176,190,204,222],THAI_LEAD=/^[เแโใไ]+/;
const AV_LIGHT_FIX:Record<number,number>={162:33,176:33,190:33}; /* เฉด 162/176/190 -> L 33% = 4.70/4.60/5.9:1 ผ่าน 4.5:1 | อีก 10 เฉดผ่านอยู่แล้ว ไม่แตะ */
export const hashStr=(s:any)=>{let h=2166136261;for(const ch of String(s)){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function profileOf(){const U:any=ST.USER,name=(U?.name||'').trim(),seed=U?.id||U?.email||name||'?',src=(name||U?.email||'?').replace(THAI_LEAD,'')||'?',h=AV_HUES[hashStr(seed)%AV_HUES.length],L=AV_LIGHT_FIX[h]??38; /* L = ความสว่างจุดสว่างของไล่สี: เฉดเขียวน้ำทะเลที่ 38% ให้ตัวอักษรขาวได้ 3.58-4.33:1 ไม่ผ่าน WCAG 1.4.3 จึงลดเฉพาะเฉดนั้น (วัด 23 ต.ค. 2026) */
 return {name:name||U?.email||'',letter:([...src][0]||'?').toUpperCase(),bg:`linear-gradient(140deg,hsl(${h} 55% ${L}%),hsl(${(h+26)%360} 55% 28%))`}}
export const initial=()=>profileOf().letter;
export const firstName=()=>((ST.USER?.name||'').trim().split(/\s+/)[0]);
export function avatarHTML(o:any={}){const p=profileOf(),tag=o.tag==='button'?'button':'span',a=tag==='button'?` type="button" data-act="${o.act||'settings'}" aria-label="${o.label||'ตั้งค่า'}"`:` role="img" aria-label="${esc(p.name||'โปรไฟล์')}"`;
 return `<${tag} class="ev-avatar"${a} style="--av: ${p.bg};${o.size?` --sz: ${o.size}px;`:''}">${esc(p.letter)}</${tag}>`}

export const S={items:[]};
export const UI={tab:'today',date:TODAY,auth:{status:'loading',screen:'welcome',email:'',cool:0},type:'all',period:'week',cal:null,lastW:{},calView:'dayGridMonth',calSel:TODAY,calDate:null,weekOff:0,weekDir:0,fdate:TODAY,error:null,loading:true,animate:true,pop:null,lastP:0};
export const find=id=>S.items.find(x=>x.id==id);

/* moved by move_defs (evarel-ts-1f) */
export const AI_LIVE=()=>!!SUPA_API;

Object.assign(window, { authErr, SUPA_SESS, nowS, supaLoad, supaSave, supaClear, SupaCore, SUPA_HOST, SupaAuth, SupaAdapter, SUPA_API, Auth, initial, profileOf, avatarHTML, firstName, AV_HUES, THAI_LEAD, hashStr, S, UI, find, AI_LIVE });

/* ชั้นฐาน (ES module จริง): ตัวสร้าง HTML ของหน้าตั้งค่าที่บริสุทธิ์ (รับสถานะเป็นอาร์กิวเมนต์ ไม่อ่าน ST/DOM เอง)
   ตัดวางจาก m/19-views__settings ตรงตัวอักษร ต่างแค่ export และจุดที่เปลี่ยนจากอ่าน global เป็นอาร์กิวเมนต์:
   usageCardHTML เดิมอ่าน ST.QUOTA -> รับ q, resetIn(iso) ของ m/16 (ห่อ resetInAt(iso,Date.now())) -> เรียก resetInAt(iso,Date.now()) ตรงนี้
   versionCardHTML เดิมอ่าน ST.APPVER -> รับ v, providerChip บริสุทธิ์อยู่แล้ว (GLOGO มาจาก core/authviews)
   ชั้น m (19-views__settings) ห่อให้เรียกแบบไม่มีอาร์กิวเมนต์เหมือนเดิม และอ่าน ST ตอนเรียกเหมือนเดิม */
import { quotaState, resetInAt } from './quota.js';
import { GLOGO } from './authviews.js';

export function usageCardHTML(q:any){const st=quotaState(q);
 if(!st)return `<b>การใช้งาน AI วันนี้</b><p class="ev-sub" style="margin-top:6px">${q?'ดูข้อมูลการใช้งานไม่ได้ในขณะนี้ แต่ยังใช้ AI ได้ตามปกติ':'กำลังโหลด…'}</p>${q?'<button class="ev-btn-ghost ev-btn-sm" style="margin-top:10px" data-act="usage-refresh">ลองใหม่</button>':''}`;
 const c=q.calls,t=q.tokens,cp=Math.min(100,Math.round(100*c.used/c.limit)),tp=Math.min(100,Math.round(100*t.used/t.limit)),lab={ok:'ปกติ',low:'ใกล้ถึงขีดจำกัด',out:'ถึงขีดจำกัดแล้ว'}[st];
 return `<div class="ev-stat"><b>การใช้งาน AI วันนี้</b><span class="ev-chip" data-state="${st==='out'?'late':st==='low'?'soon':'done'}">${lab}</span></div>
  <div class="ev-use"><div class="ev-stat"><span>จำนวนครั้งที่ถาม</span><b>${c.used} / ${c.limit}</b></div><div class="ev-bar ev-bar-lg"><i data-k="u-calls" data-to="${cp}" data-lv="${st}"></i></div></div>
  <div class="ev-use"><div class="ev-stat"><span>ความยาวบทสนทนา</span><b>${tp}%</b></div><div class="ev-bar ev-bar-lg"><i data-k="u-tok" data-to="${tp}" data-lv="${st}"></i></div></div>
  <p class="ev-sub" style="margin-top:14px">รีเซ็ตทุกเที่ยงคืน (00:00 น.) · ${resetInAt(q.resetAt,Date.now())}</p>`}

export const providerChip=(u:any)=>u?.provider==='google'?`<span class="ev-chip ev-chip-g">${GLOGO}Google</span>`:'<span class="ev-chip">อีเมล</span>';

export function versionCardHTML(v:any){const ver=v.version||'—';const bld=v.build?` · build ${v.build}`:'';
 return `<b>เกี่ยวกับ</b><div class="ev-stat" style="margin-top:12px"><div><div id="appVerNum" style="font-size:20px;font-weight:700;letter-spacing:-.01em">${ver}</div><p class="ev-sub" id="appVerSub">${v.date?v.date:'ตรวจสอบรุ่น…'}${bld}</p></div></div>`}

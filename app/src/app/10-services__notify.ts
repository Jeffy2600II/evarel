import { AHEAD_PRESETS, defaultRem, notifyState, checkNotify, toggleOnTime, toggleAhead, countNotifiable, urlB64ToU8, pushWhyTextOf, pushSubscribeOf } from './core/notify.js';
/* ===== MODULE: services/notify ===== */
/* ตรรกะความหมายของ rem (notifyState/toggleOnTime/toggleAhead/countNotifiable/defaultRem/checkNotify) และตรรกะสมัคร Web Push (urlB64ToU8/PUSH_WHY/pushSubscribe) อยู่ที่ core/notify.ts แล้ว (แหล่งความจริงเดียว Worker ตีความตรงกัน)
   ที่นี่เหลือตัวห่อส่ง deps เข้าไป + ส่วนที่ผูกเบราว์เซอร์โดยตรง (Notification navigator localStorage) คงชื่อบน window เดิมทุกชื่อ */
/* ===== สมัครรับ Web Push (15 ต.ค. 2026) =====
   สาเหตุที่แจ้งเตือนไม่เด้ง: เดิมปุ่มขอแค่สิทธิ์ของเบราว์เซอร์ ไม่เคยสมัครเครื่องกับ Worker (push_subscriptions ว่าง)
   ลำดับ: สิทธิ์ -> กุญแจ VAPID -> pushManager.subscribe -> POST /push/subscribe -> จำสถานะ
   คืนรหัสผลลัพธ์เป็นข้อความ ไม่ throw (ให้ UI บอกผู้ใช้ตามจริง) */
const PUSH_KEY='evarel-push-sub';
const pushSupported=()=>typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const pushSavedState=()=>{try{return JSON.parse(localStorage.getItem(PUSH_KEY)||'null')}catch(e){return null}};
const pushSaveState=v=>{try{v?localStorage.setItem(PUSH_KEY,JSON.stringify(v)):localStorage.removeItem(PUSH_KEY)}catch(e){}};
const pushSubscribe=(askPermission)=>pushSubscribeOf({supported:pushSupported,api:()=>SUPA_API,permission:()=>Notification.permission,requestPermission:()=>Notification.requestPermission(),token:()=>ST.Repo.token(),swReady:()=>navigator.serviceWorker.ready,save:pushSaveState})(askPermission);
/** ซิงก์เงียบหลังเข้าสู่ระบบ: ถ้าอนุญาตแล้วแต่เครื่องนี้ยังไม่ลงทะเบียน -> ลงทะเบียนเอง (ไม่ขอสิทธิ์ ไม่ถ่วงการเปิดแอป ล้มเงียบ) */
function pushAutoSync(){
 try{if(!pushSupported()||!SUPA_API||Notification.permission!=='granted'||pushSavedState())return;
  pushSubscribe(false).then(r=>{if(r.ok&&pageOf('settings')?.querySelector('[data-act="notify"]'))ST._render()}).catch(()=>{})}catch(e){}}
const pushWhyText=w=>pushWhyTextOf(w);
Object.assign(window, { AHEAD_PRESETS, REM_PRESETS, defaultRem, notifyState, checkNotify, toggleOnTime, toggleAhead, countNotifiable, urlB64ToU8, pushSupported, pushSavedState, pushSaveState, pushSubscribe, pushAutoSync, pushWhyText });

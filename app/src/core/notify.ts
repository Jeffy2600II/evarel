/* ชั้นฐาน (ES module จริง): ตรรกะแจ้งเตือนบริสุทธิ์ (ความหมายของ rem / สถานะ / เปิดปิดตามเวลา-ล่วงหน้า / นับรายการที่แจ้งได้) ไม่แตะ DOM, ST, เครือข่าย, เวลา
   ตัดวางจาก m/10-services__notify ตรงตัวอักษร ต่างแค่ export และชนิด :any ที่พารามิเตอร์ (core ตรวจ noImplicitAny) | โมดูลเดิมนำเข้าแล้วส่งชื่อเดิมต่อทาง window ตรรกะชุดเดียวไม่มีสองสำเนา */
/* ความหมายของฟิลด์ rem (evarel-notify-default, 14 ต.ค. 2026 ตามที่ Master สั่ง):
   {k:'before',m:0} = แจ้งเตือนตรงเวลา "เปิด" (ค่าเริ่มต้นของรายการใหม่) | ไม่มี = ผู้ใช้ปิดเอง
   {k:'before',m>0} = เตือนล่วงหน้า m นาที (เพื่อเตือนความจำ) | {k:'at',t:'HH:MM'} = เตือนตามเวลาที่ตั้งเอง
   แหล่งความจริงเดียวของความหมายนี้: ฟอร์ม validate และการแสดงผลต้องเรียกที่นี่ ไม่ตีความ rem เอง (Worker ตีความตรงกันใน reminders.ts) */
export const AHEAD_PRESETS=[10,30,60,1440];
/* REM_PRESETS ตามเดโม v24 จริง (REM_PRESETS=[0,10,30,60,1440]): ชิปแรก m=0 คือ ตรงเวลา อยู่ในชุดเดียวกับล่วงหน้า — ใช้ในฟอร์มเท่านั้น (string + React) */
export const isRemObj=(r:any)=>r&&typeof r==='object'&&!Array.isArray(r);
export const remList=(rem:any)=>Array.isArray(rem)?rem.filter(isRemObj):[];
export const defaultRem=()=>[{k:'before',m:0}];
export function notifyState(rem:any,hasTime:any){
 const L=remList(rem),onTime=L.some(r=>r.k==='before'&&r.m===0);
 const ahead=[...new Set(L.filter(r=>r.k==='before'&&Number.isInteger(r.m)&&r.m>0).map(r=>r.m))].sort((a,b)=>a-b);
 const at=[...new Set(L.filter(r=>r.k==='at'&&typeof r.t==='string').map(r=>r.t))].sort();
 const issue=(onTime||ahead.length)&&!hasTime?'ต้องใส่เวลา จึงจะแจ้งเตือนได้ ถ้าไม่ต้องการแจ้งเตือน ให้ปิดแจ้งเตือน':'';
 return {onTime,ahead,at,issue}}
export const checkNotify=(rem:any,time:any)=>notifyState(rem,!!time).issue;
export function toggleOnTime(rem:any,on:any){
 const L=remList(rem).map(r=>({...r})),has=L.some(r=>r.k==='before'&&r.m===0);
 if(on)return has?L:[{k:'before',m:0},...L];
 return L.filter(r=>!(r.k==='before'&&r.m===0))}
export function toggleAhead(rem:any,m:any){
 const L=remList(rem).map(r=>({...r}));
 if(!Number.isInteger(m)||m<=0)return L;
 const has=L.some(r=>r.k==='before'&&r.m===m);
 return has?L.filter(r=>!(r.k==='before'&&r.m===m)):[...L,{k:'before',m}]}
/** จำนวนรายการที่แจ้งเตือนได้จริง (หน้าตั้งค่า): มีเวลาของรายการ และเปิดตรงเวลาหรือล่วงหน้า หรือมีเวลาตั้งเอง (at) ทนข้อมูลผิดรูป */
export function countNotifiable(items:any) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items) {
    if (!it || typeof it !== 'object' || !Array.isArray(it.rem)) continue;
    const s = notifyState(it.rem, true);
    if (s.at.length || ((s.onTime || s.ahead.length) && it.time)) n++;
  }
  return n;
}

/* ===== Web Push (ตัดวางจาก m/10-services__notify ตรงตัวอักษร 31 ต.ค. 2026) =====
   ตรรกะสมัครรับ push ชุดเดียว: โมดูลเดิมเรียกใช้ที่นี่ผ่านตัวห่อที่ส่ง deps เข้ามา (supported api permission requestPermission token swReady save)
   คงพฤติกรรมตรงตัวทุกจุด: ลำดับตรวจเงื่อนไข รหัส why การเทียบกุญแจ VAPID และการบันทึกสถานะหลังสมัครสำเร็จ
   fetch ยังเป็น global เหมือนเดิม (core/ailive ใช้วิธีเดียวกัน) | สิ่งที่ผูกเบราว์เซอร์โดยตรง (Notification navigator localStorage) อยู่ฝั่งตัวห่อ */
export const PUSH_WHY = { unsupported: 'เบราว์เซอร์นี้ไม่รองรับ Push', denied: 'ถูกปิดไว้ ต้องเปิดที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์', 'no-backend': 'โหมดนี้ยังไม่เชื่อมระบบหลังบ้าน', 'not-asked': 'ยังไม่ได้อนุญาต', auth: 'ต้องเข้าสู่ระบบก่อน', 'no-key': 'ระบบยังไม่พร้อมรับสมัคร ลองใหม่ภายหลัง', subscribe: 'เครื่องนี้สมัครไม่สำเร็จ ลองใหม่อีกครั้ง', server: 'ระบบหลังบ้านไม่รับการสมัคร ลองใหม่ภายหลัง', limit: 'สมัครครบ 5 เครื่องแล้ว' };
export const pushWhyTextOf = (w: any) => (PUSH_WHY as any)[w] || 'สมัครไม่สำเร็จ';
/* ถอดรหัส base64url เป็นไบต์ (กุญแจ VAPID จาก /push/key) — บริสุทธิ์ ใช้ atob global เหมือนเดิม */
export function urlB64ToU8(b64: any) {
  if (typeof b64 !== 'string' || !b64) throw new Error('empty key');
  const pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
export type PushDeps = { supported: () => boolean; api: () => string; permission: () => string; requestPermission: () => Promise<string>; token: () => Promise<string>; swReady: () => Promise<any>; save: (v: any) => void };
/** คืน {ok:true} หรือ {ok:false,why:'unsupported|denied|no-backend|no-key|sw|subscribe|server|limit|auth'} (ลำดับตรวจเงื่อนไขตรงตัวเดิม) */
export function pushSubscribeOf(deps: PushDeps) {
  return async (askPermission: any) => {
    if (!deps.supported()) return { ok: false, why: 'unsupported' };
    if (!deps.api()) return { ok: false, why: 'no-backend' };
    if (deps.permission() === 'denied') return { ok: false, why: 'denied' };
    if (deps.permission() !== 'granted') {
      if (!askPermission) return { ok: false, why: 'not-asked' };
      const p = await deps.requestPermission();
      if (p !== 'granted') return { ok: false, why: p === 'denied' ? 'denied' : 'not-asked' } }
    let t: any; try { t = await deps.token() } catch (e) { return { ok: false, why: 'auth' } }
    let key: any; try { const r = await fetch(`${deps.api()}/push/key`); if (!r.ok) return { ok: false, why: 'no-key' }; key = (await r.json()).publicKey } catch (e) { return { ok: false, why: 'no-key' } }
    let sub: any; try {
      const reg = await deps.swReady();
      sub = await reg.pushManager.getSubscription();
      /* กุญแจ VAPID เปลี่ยน (เช่น เปลี่ยนชุด forge) -> สมัครเก่าใช้ไม่ได้ ต้องยกเลิกแล้วสมัครใหม่ */
      const want = urlB64ToU8(key);
      if (sub && sub.options && sub.options.applicationServerKey) { const have = new Uint8Array(sub.options.applicationServerKey); if (have.length !== want.length || have.some((v: any, i: number) => v !== want[i])) { await sub.unsubscribe(); sub = null } }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want })
    } catch (e) { return { ok: false, why: 'subscribe' } }
    try {
      const r = await fetch(`${deps.api()}/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(sub.toJSON()) });
      if (r.status === 403) return { ok: false, why: 'limit' };
      if (r.status === 401) return { ok: false, why: 'auth' };
      if (!r.ok) return { ok: false, why: 'server' };
    } catch (e) { return { ok: false, why: 'server' } }
    deps.save({ at: Date.now(), endpoint: sub.endpoint });
    return { ok: true } };
}

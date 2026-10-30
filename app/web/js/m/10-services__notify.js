import { AHEAD_PRESETS, defaultRem, notifyState, checkNotify, toggleOnTime, toggleAhead, countNotifiable } from './core/notify.js';
/* ===== MODULE: services/notify ===== */
/* ตรรกะความหมายของ rem (notifyState/toggleOnTime/toggleAhead/countNotifiable/defaultRem/checkNotify) อยู่ที่ core/notify.ts แล้ว (แหล่งความจริงเดียว Worker ตีความตรงกัน) ที่นี่เหลือส่วน Web Push ที่ผูกกับเบราว์เซอร์ */
/* ===== สมัครรับ Web Push (15 ต.ค. 2026) =====
   สาเหตุที่แจ้งเตือนไม่เด้ง: เดิมปุ่มขอแค่สิทธิ์ของเบราว์เซอร์ ไม่เคยสมัครเครื่องกับ Worker (push_subscriptions ว่าง)
   ลำดับ: สิทธิ์ -> กุญแจ VAPID -> pushManager.subscribe -> POST /push/subscribe -> จำสถานะ
   คืนรหัสผลลัพธ์เป็นข้อความ ไม่ throw (ให้ UI บอกผู้ใช้ตามจริง) */
const PUSH_KEY = 'evarel-push-sub';
function urlB64ToU8(b64) {
    if (typeof b64 !== 'string' || !b64)
        throw new Error('empty key');
    const pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++)
        out[i] = raw.charCodeAt(i);
    return out;
}
const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const pushSavedState = () => { try {
    return JSON.parse(localStorage.getItem(PUSH_KEY) || 'null');
}
catch (e) {
    return null;
} };
const pushSaveState = v => { try {
    v ? localStorage.setItem(PUSH_KEY, JSON.stringify(v)) : localStorage.removeItem(PUSH_KEY);
}
catch (e) { } };
/** คืน {ok:true} หรือ {ok:false,why:'unsupported|denied|no-backend|no-key|sw|subscribe|server|limit|auth'} */
async function pushSubscribe(askPermission) {
    if (!pushSupported())
        return { ok: false, why: 'unsupported' };
    if (!SUPA_API)
        return { ok: false, why: 'no-backend' };
    if (Notification.permission === 'denied')
        return { ok: false, why: 'denied' };
    if (Notification.permission !== 'granted') {
        if (!askPermission)
            return { ok: false, why: 'not-asked' };
        const p = await Notification.requestPermission();
        if (p !== 'granted')
            return { ok: false, why: p === 'denied' ? 'denied' : 'not-asked' };
    }
    let t;
    try {
        t = await ST.Repo.token();
    }
    catch (e) {
        return { ok: false, why: 'auth' };
    }
    let key;
    try {
        const r = await fetch(`${SUPA_API}/push/key`);
        if (!r.ok)
            return { ok: false, why: 'no-key' };
        key = (await r.json()).publicKey;
    }
    catch (e) {
        return { ok: false, why: 'no-key' };
    }
    let sub;
    try {
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.getSubscription();
        /* กุญแจ VAPID เปลี่ยน (เช่น เปลี่ยนชุด forge) -> สมัครเก่าใช้ไม่ได้ ต้องยกเลิกแล้วสมัครใหม่ */
        const want = urlB64ToU8(key);
        if (sub && sub.options && sub.options.applicationServerKey) {
            const have = new Uint8Array(sub.options.applicationServerKey);
            if (have.length !== want.length || have.some((v, i) => v !== want[i])) {
                await sub.unsubscribe();
                sub = null;
            }
        }
        if (!sub)
            sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want });
    }
    catch (e) {
        return { ok: false, why: 'subscribe' };
    }
    try {
        const r = await fetch(`${SUPA_API}/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(sub.toJSON()) });
        if (r.status === 403)
            return { ok: false, why: 'limit' };
        if (r.status === 401)
            return { ok: false, why: 'auth' };
        if (!r.ok)
            return { ok: false, why: 'server' };
    }
    catch (e) {
        return { ok: false, why: 'server' };
    }
    pushSaveState({ at: Date.now(), endpoint: sub.endpoint });
    return { ok: true };
}
/** ซิงก์เงียบหลังเข้าสู่ระบบ: ถ้าอนุญาตแล้วแต่เครื่องนี้ยังไม่ลงทะเบียน -> ลงทะเบียนเอง (ไม่ขอสิทธิ์ ไม่ถ่วงการเปิดแอป ล้มเงียบ) */
function pushAutoSync() {
    try {
        if (!pushSupported() || !SUPA_API || Notification.permission !== 'granted' || pushSavedState())
            return;
        pushSubscribe(false).then(r => { if (r.ok && pageOf('settings')?.querySelector('[data-act="notify"]'))
            ST._render(); }).catch(() => { });
    }
    catch (e) { }
}
const PUSH_WHY = { unsupported: 'เบราว์เซอร์นี้ไม่รองรับ Push', denied: 'ถูกปิดไว้ ต้องเปิดที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์', 'no-backend': 'โหมดนี้ยังไม่เชื่อมระบบหลังบ้าน', 'not-asked': 'ยังไม่ได้อนุญาต', auth: 'ต้องเข้าสู่ระบบก่อน', 'no-key': 'ระบบยังไม่พร้อมรับสมัคร ลองใหม่ภายหลัง', subscribe: 'เครื่องนี้สมัครไม่สำเร็จ ลองใหม่อีกครั้ง', server: 'ระบบหลังบ้านไม่รับการสมัคร ลองใหม่ภายหลัง', limit: 'สมัครครบ 5 เครื่องแล้ว' };
const pushWhyText = w => PUSH_WHY[w] || 'สมัครไม่สำเร็จ';
Object.assign(window, { AHEAD_PRESETS, REM_PRESETS, defaultRem, notifyState, checkNotify, toggleOnTime, toggleAhead, countNotifiable, urlB64ToU8, pushSupported, pushSavedState, pushSaveState, pushSubscribe, pushAutoSync, pushWhyText });

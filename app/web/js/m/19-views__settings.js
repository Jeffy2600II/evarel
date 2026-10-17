"use strict";
/* ===== MODULE: views/settings ===== */
function notifInfo() { if (!('Notification' in window))
    return ['ไม่รองรับ', 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน']; const p = Notification.permission; if (p === 'denied')
    return ['ถูกปิดไว้', 'ต้องเปิดที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์']; if (p === 'granted')
    return pushSavedState() ? ['อนุญาตแล้ว', 'เครื่องนี้พร้อมรับการแจ้งเตือน'] : ['อนุญาตแล้ว แต่ยังไม่ได้ลงทะเบียน', 'กดปุ่มเพื่อลงทะเบียนเครื่องนี้กับระบบ']; return ['ยังไม่ได้ขอ', 'กดปุ่มเพื่อให้เครื่องนี้รับการแจ้งเตือนได้']; }
const themeNow = () => document.documentElement.dataset.theme || 'auto';
function settingsHTMLClassic() {
    const [st, note] = notifInfo(), total = countNotifiable(S.items);
    return `<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>ตั้งค่า</h2></div><div class="ev-page-scroll">
 <section class="ev-card ev-row" style="gap:14px"><span class="ev-avatar" style="width:52px;height:52px;font-size:20px;display:grid">${initial()}</span><div class="grow"><b>${esc(ST.USER?.name || 'ผู้ใช้')}</b><p class="ev-sub" style="overflow:hidden;text-overflow:ellipsis">${esc(ST.USER?.email || '')}</p></div><span class="ev-chip">${ST.USER?.provider === 'google' ? 'Google' : 'อีเมล'}</span></section>
 <section class="ev-card"><b>ธีม</b><div style="margin-top:12px">${seg('theme', [['auto', 'ตามเครื่อง'], ['light', 'สว่าง'], ['dark', 'มืด']], themeNow())}</div></section>
 <section class="ev-card"><div class="ev-stat"><div><b>การแจ้งเตือน</b><p class="ev-sub">${note}</p></div><span class="ev-chip">${st}</span></div>${'Notification' in window && (Notification.permission === 'default' || (Notification.permission === 'granted' && !pushSavedState())) ? `<button class="ev-btn-primary ev-btn-block" style="margin-top:12px" data-act="notify">${Notification.permission === 'granted' ? 'ลงทะเบียนเครื่องนี้' : 'อนุญาตการแจ้งเตือน'}</button>` : ''}
  <p class="ev-sub" style="margin-top:12px">ตั้งเวลาแจ้งเตือนไว้ ${total} รายการ แจ้งเฉพาะเวลาที่คุณตั้งเท่านั้น เวลาที่ตั้งไว้บันทึกกับบัญชีของคุณและส่งถึงเครื่องนี้ตามเวลา</p></section>
 
 <section class="ev-card"><b>บัญชี</b><div class="ev-form" style="margin-top:12px"><button class="ev-btn-ghost ev-btn-block" data-act="au-signout-ask">ออกจากระบบ</button><button class="ev-btn-danger ev-btn-block" data-act="au-delete-ask">ลบบัญชี</button></div></section></div>`;
}
/* ชั้น 4: หน้าตั้งค่าผลิตโดย React (runtime ร่วม + ไฟล์หน้า โหลดแบบ lazy หลัง load) ถ้ายังโหลดไม่ครบหรือโหลดไม่ได้ ใช้ template เดิมแทนทันที ผู้ใช้เห็นเหมือนเดิม */
function settingsHTML() {
    const R = window.EvarelPages?.settings;
    if (typeof R !== 'function')
        return settingsHTMLClassic();
    try {
        const [st, note] = notifInfo(), granted = 'Notification' in window && Notification.permission === 'granted', canBtn = 'Notification' in window && (Notification.permission === 'default' || (granted && !pushSavedState()));
        return R({ user: { name: ST.USER?.name || 'ผู้ใช้', email: ST.USER?.email || '', provider: ST.USER?.provider }, notif: { state: st, note }, total: countNotifiable(S.items), themeSegHTML: seg('theme', [['auto', 'ตามเครื่อง'], ['light', 'สว่าง'], ['dark', 'มืด']], themeNow()), backIconHTML: icon('back'), avatarText: initial(), showNotifyBtn: canBtn, notifyBtnLabel: granted ? 'ลงทะเบียนเครื่องนี้' : 'อนุญาตการแจ้งเตือน' });
    }
    catch (e) {
        console.warn('settings react', e);
        return settingsHTMLClassic();
    }
}
/* โหลดทีละไฟล์ตามลำดับ runtime ก่อนแล้วหน้า (หน้าอ่าน window.EvarelReact ตอนรัน) พลาดไฟล์ใดก็ไม่เป็นไร ใช้ของเดิมต่อ */
function loadReactFile(name) {
    return new Promise((ok, no) => {
        const k = `script[data-ev-react="${name}"]`;
        if (document.querySelector(k))
            return ok(0);
        const el = document.createElement('script');
        el.src = `js/react/${name}.js`;
        el.async = false;
        el.dataset.evReact = name;
        el.onload = () => ok(0);
        el.onerror = () => no(new Error(name));
        document.head.appendChild(el);
    });
}
/* หน้าที่ย้ายเป็น React แล้ว (เพิ่มชื่อหน้าใหม่ที่นี่ที่เดียว) โหลด runtime ก่อนแล้วไล่ทีละหน้า พลาดไฟล์ใดใช้ของเดิมต่อ */
const REACT_PAGES = ['settings', 'stats'];
function loadReactSettings() {
    const W = window;
    if (REACT_PAGES.every(n => W.EvarelPages?.[n]))
        return Promise.resolve(0);
    /* เรียก render ผ่าน window ตอนรันเท่านั้น (ไม่อ้างชื่อตรง) ไม่ให้เกิดเส้นพึ่งพาย้อนทิศไป 23-render ซึ่งโหลดหลังไฟล์นี้ */
    return loadReactFile('runtime').then(() => REACT_PAGES.reduce((p, n) => p.then(() => loadReactFile(n)), Promise.resolve(0))).then(() => { try {
        if (W.UI?.tab === 'stats' && typeof W.render === 'function')
            W.render();
    }
    catch (e) { } }).catch(e => console.warn('react ไม่พร้อม ใช้หน้าเดิม', e && e.message));
}
window.addEventListener('load', () => setTimeout(loadReactSettings, 0));
function applyTheme(t) { t === 'auto' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.dataset.theme = t; try {
    localStorage.setItem(THEME_KEY, t);
}
catch (e) {
    console.warn('theme', e);
} }
try {
    const t = localStorage.getItem(THEME_KEY);
    if (t && t !== 'auto')
        applyTheme(t);
}
catch (e) {
    console.warn('theme load', e);
}
Object.assign(window, { notifInfo, themeNow, settingsHTML, settingsHTMLClassic, loadReactSettings, loadReactFile, applyTheme });

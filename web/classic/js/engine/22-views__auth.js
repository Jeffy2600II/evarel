import { EMAIL_RE, PW_MIN, MAIL_TYPO, authValidate, pwStrength, coolView, resendToast } from './core/authform.js'; /* mailHint ไม่ถูกเรียกแล้ว (ห้ามเดาอีเมล) */
import { fld } from './core/uihtml.js';
/* ===== MODULE: views/auth (เข้าสู่ระบบ / สร้างบัญชี / ลืมรหัสผ่าน) ===== */
const AU_MSG = { invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', email_taken: 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน', verify_pending: 'อีเมลนี้มีบัญชีอยู่ในระบบแล้ว (ยังไม่ได้ยืนยันอีเมล) เข้าสู่ระบบเพื่อยืนยันให้เสร็จก่อน', network: 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', unknown: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง', needs_link: 'อีเมลนี้มีบัญชีอยู่แล้ว เข้าสู่ระบบด้วยบัญชีเดิมก่อน', code_invalid: 'รหัสไม่ถูกต้อง ลองตรวจอีกครั้ง', code_expired: 'รหัสหมดอายุแล้ว กดส่งรหัสใหม่', too_many_requests: 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่', unverified: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' };
const RESEND_SEC = 30;
import { GLOGO, EV_MARK, RINGS, authBack, gBtn, legal, eyeBtn, EMAIL_X, submitBtn, authViews, AUTH_SPLASH } from './core/authviews.js';
/* AUTH_VIEWS: เดิมเป็นอ็อบเจ็กต์ของฟังก์ชันที่อ่าน UI.auth ตอนเรียก ตอนนี้ตัวสร้างอยู่ core/authviews (รับ email/codeType เป็นพารามิเตอร์) ชั้นนี้ห่อให้เรียก AUTH_VIEWS[sc]() แบบไม่มีอาร์กิวเมนต์เหมือนเดิม และอ่าน UI.auth ตอนเรียกเหมือนเดิม */
const AUTH_VIEWS = Object.fromEntries(['welcome', 'login', 'signup', 'forgot', 'sent', 'code', 'newpw'].map(k => [k, () => authViews(UI.auth)[k]()]));
function renderAuthRoot() {
    window.evBootHide?.(); /* สแปลชบูตแบบนิ่ง (index.html วาดไว้ก่อน JS) เข้าช่วงเครื่องยนต์แล้ว มอบหมายให้หน้า auth ต่อ */
    const au = $('auth');
    au.hidden = false;
    const sc = UI.auth.status === 'loading' ? 'loading' : UI.auth.screen;
    if (au.dataset.screen === sc)
        return;
    au.dataset.screen = sc;
    const MT = window.EvarelMount;
    if (MT?.ready('auth')) {
        MT.mountAt(au, 'auth', { screen: sc });
    }
    else {
        au.innerHTML = `<div class="ev-auth-in">${sc === 'loading' ? AUTH_SPLASH : AUTH_VIEWS[sc]()}</div>`;
    }
    au.scrollTop = 0;
    [...au.firstElementChild.children].forEach((el, i) => el.style.setProperty('--i', i));
    if (sc === 'sent' || sc === 'code')
        startCool();
    if (['login', 'signup', 'forgot', 'code', 'newpw'].includes(sc))
        setTimeout(() => au.querySelector('input')?.focus({ preventScroll: true }), 400);
}
let coolT = null;
function paintCool() { const b = $('resendBtn'); if (!b)
    return; const v = coolView(UI.auth.cool, UI.auth.screen); b.disabled = v.disabled; b.innerHTML = v.html; }
function startCool() { stopCool(); UI.auth.cool = RESEND_SEC; paintCool(); coolT = setInterval(() => { UI.auth.cool = Math.max(0, UI.auth.cool - 1); paintCool(); if (!UI.auth.cool)
    stopCool(); }, 1000); }
function stopCool() { clearInterval(coolT); coolT = null; }
async function resendReset() { if (UI.auth.cool > 0)
    return; const b = $('resendBtn'); b.disabled = true; b.innerHTML = '<span class="ev-spin"></span>'; try {
    if (UI.auth.screen === 'code' && Auth.resend)
        await Auth.resend(UI.auth.email, UI.auth.codeType);
    else
        await Auth.sendReset(UI.auth.email);
    toast(resendToast(UI.auth.screen));
}
catch (err) {
    toast(AU_MSG[err.code] || AU_MSG.unknown);
} startCool(); }
const fieldErr = (form, name, msg) => { const inp = form.querySelector(`[name="${name}"]`), box = form.querySelector(`#e-${name}`); if (inp && inp.type !== 'checkbox')
    inp.setAttribute('aria-invalid', String(!!msg)); if (box) {
    box.hidden = !msg;
    box.removeAttribute('data-tone');
    box.innerHTML = msg ? `${icon('alert')}<span>${esc(msg)}</span>` : '';
} };
function clearErrs(form) { form.querySelectorAll('.ev-input').forEach(i => i.setAttribute('aria-invalid', 'false')); form.querySelectorAll('.ev-field-err').forEach(b => { b.hidden = true; b.innerHTML = ''; }); const fe = form.querySelector('#form-err'); if (fe) {
    fe.hidden = true;
    fe.textContent = '';
} }
function setBusy(form, on) { const b = form.querySelector('button[type="submit"]'); b.disabled = on; b.innerHTML = on ? '<span class="ev-spin"></span>' : `<span>${b.dataset.label}</span>`; form.querySelectorAll('input').forEach(i => { i.readOnly = on; }); }
document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'f-password' && t.closest('[data-kind="signup"]')) {
        const m = pwStrength(t.value);
        $('pwMeter').dataset.lv = String(m.lv);
        $('pwLabel').textContent = m.label;
    }
    if (t.closest('.ev-authform') && t.getAttribute('aria-invalid') === 'true') {
        t.setAttribute('aria-invalid', 'false');
        const b = $('e-' + t.name);
        if (b) {
            b.hidden = true;
            b.innerHTML = '';
        }
    }
});
/* ตรวจอีเมลสดระหว่างกรอกหน้าสมัคร — ปรับรอบ 2026.8.1 (Master สั่ง 3 พ.ย. 2026 ให้ตรวจ "ทุก" การแก้ไขค่า):
   - ครอบพิมพ์ ลบ วาง และ autocomplete ผ่าน input+change — เดิมเคสลบแล้วหยุดพักไปสักพัก ระบบไม่ตรวจซ้ำให้
   - หน่วง 650ms หลังแก้ไขครั้งสุดท้าย (ไม่ยิงทุกตัวอักษร) / ออกจากช่อง (focusout) = ตรวจทันที
   - จำผลตรวจต่ออีเมลไว้ในหน้า (สูงสุด 40 ค่า): ลบแล้วพิมพ์คืนเป็นอีเมลเดิม = ตอบทันที ไม่ยิงเครือข่ายซ้ำ
   - โน้ตอยู่ div ของตัวเอง (#n-email) ไม่เหยียบข้อความ error ของฟอร์ม (#e-email)
   - ตรวจไม่ได้ (เน็ต/เซิร์ฟเวอร์ล่ม) = เงียบ และห้ามเดา/ชี้ทางอีเมล (กฎ 2 พ.ย. 2026) */
let chkTimer = null, chkSeq = 0;
const chkMemo = new Map();
function chkNote(msg) { const b = $('n-email'); if (!b)
    return; b.hidden = !msg; if (msg)
    b.innerHTML = `<span>${esc(msg)}</span>`; }
function chkPaint(em) { const hit = chkMemo.get(em); chkNote(hit === true ? 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน' : ''); }
async function chkRun(em) {
    if (!EMAIL_RE.test(em) || chkMemo.has(em))
        return;
    const seq = ++chkSeq;
    let r = null;
    try {
        r = Auth.checkEmail ? await Auth.checkEmail(em) : null;
    }
    catch (err) {
        r = null;
    }
    if (seq !== chkSeq || !r || !r.ok)
        return; /* คำขอเก่า/ตรวจไม่ได้ = ไม่แตะหน้าจอ */
    if (chkMemo.size >= 40)
        chkMemo.delete(chkMemo.keys().next().value);
    chkMemo.set(em, !!r.exists);
    chkPaint(em);
}
const chkSoon = v => {
    clearTimeout(chkTimer);
    const em = String(v || '').trim().toLowerCase();
    if (!EMAIL_RE.test(em)) {
        chkNote('');
        return;
    } /* ลบจนอีเมลยังไม่ครบ: เอาโน้ตออกทันที ไม่รอตรวจ */
    if (chkMemo.has(em)) {
        chkPaint(em);
        return;
    } /* ค่าที่รู้ผลแล้ว: วาดทันที ไม่เปลี่ยนอะไรบนจอถ้าผลเดิม */
    chkNote('');
    chkTimer = setTimeout(() => chkRun(em), 650);
}; /* ค่าใหม่ที่ยังไม่รู้ผล: หน่วงรอหยุดพิมพ์/หยุดลบ */
document.addEventListener('input', e => { const t = e.target; if (t.name === 'email' && t.closest?.('[data-kind="signup"]'))
    chkSoon(t.value); });
document.addEventListener('change', e => { const t = e.target; if (t.name === 'email' && t.closest?.('[data-kind="signup"]'))
    chkSoon(t.value); });
document.addEventListener('focusout', e => { const t = e.target; if (t.name === 'email' && t.closest?.('[data-kind="signup"]')) {
    clearTimeout(chkTimer);
    chkRun(String(t.value || '').trim().toLowerCase());
} });
async function doSignOut(del) {
    /* ออกจากระบบต้องสำเร็จเสมอ: ตัดการเชื่อม realtime แบบผ่อนปรน (ถ้าโมดูล live-sync ยังไม่พร้อมก็ข้าม ไม่ให้พังทั้ง flow) */
    try {
        window.stopLiveSync?.();
    }
    catch (err) {
        console.warn('stopLiveSync', err);
    }
    try {
        if (del)
            await Auth.deleteAccount();
        else
            await Auth.signOut();
    }
    catch (err) {
        console.warn('signout', err);
        toast(AU_MSG.unknown);
        return;
    }
    while (LAYERS.length)
        popLayer();
    closePop();
    destroyCal('main');
    destroyCal('habit');
    ST.DETAIL = null;
    S.items = [];
    ST.CH = { list: [], cur: null };
    ST.TM = null;
    ST.USER = null;
    Object.assign(UI, { tab: 'today', date: TODAY, type: 'all', weekOff: 0, loading: true, error: null });
    UI.auth = { status: 'out', screen: 'welcome', email: '', cool: 0 };
    $('auth').dataset.screen = '';
    ST._render();
    if (del)
        toast('ลบบัญชีแล้ว');
}
document.addEventListener('touchstart', e => { ST.swipeX = e.target.closest('.ev-week') ? e.touches[0].clientX : null; }, { passive: true });
document.addEventListener('touchend', e => { if (ST.swipeX == null)
    return; const dx = e.changedTouches[0].clientX - ST.swipeX; ST.swipeX = null; if (Math.abs(dx) > 50) {
    UI.weekOff += dx < 0 ? 1 : -1;
    UI.weekDir = dx < 0 ? 1 : -1;
    ST._render();
} }, { passive: true });
const errorView = () => `<div class="ev-error">${empty('x', 'โหลดข้อมูลไม่สำเร็จ', 'ตรวจสอบการเชื่อมต่อแล้วลองใหม่')}<button class="ev-btn-primary" data-act="retry">ลองใหม่</button></div>`;
Object.assign(window, { AU_MSG, EMAIL_RE, PW_MIN, RESEND_SEC, MAIL_TYPO, GLOGO, EV_MARK, RINGS, authBack, gBtn, legal, eyeBtn, fld, EMAIL_X, submitBtn, AUTH_VIEWS, AUTH_SPLASH, renderAuthRoot, coolT, paintCool, startCool, stopCool, resendReset, fieldErr, clearErrs, setBusy, authValidate, doSignOut, errorView });

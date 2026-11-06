import { HAPTIC_MS } from './01-core__constants.js';
import { pad, ymd, parse, addDays, fmtDate, nowHM, esc, fmtClock } from './core/dates.js';
/* ===== MODULE: core/dates ===== */
/* ฟังก์ชันบริสุทธิ์ (pad ymd parse addDays fmtDate nowHM esc fmtClock) อยู่ที่ core/dates.ts แล้ว ที่นี่ส่งออกชื่อเดิมต่อ และคงส่วนที่ผูกกับเบราว์เซอร์/เวลาโหลด: TODAY, dayLab, haptic */
export { pad, ymd, parse, addDays, fmtDate, nowHM, esc, fmtClock };
export const TODAY = ymd(new Date());
/* Haptics: สั่นสั้นเฉพาะ "การกระทำที่มีความหมาย" (Master สั่ง 6 พ.ย. 2026 ให้ลดลง)
   สั่นเมื่อ: กดปุ่มสั่งงานของแอป ([data-act]) หรือแท็บนำทาง ([data-tab]) เท่านั้น
   ไม่สั่นเมื่อ: แตะการ์ด/ลิงก์/ชิป/ช่องเลือก/เลื่อนจอ/พิมพ์ (เดิมดักกว้างเกินไป จึงสั่นพร่ำเพรื่อ)
   ตัวเรียกเดิมในเอนจิน (เพิ่ม/เช็คงาน/จับเวลา/โหวต/ฟอร์มไม่ผ่าน) ยังทำงาน และไม่สั่นซ้ำเพราะกัน 200ms */
const HAPTIC_DEDUPE_MS = 200;
const HAPTIC_TARGETS = '[data-act],[data-tab]';
const HAPTIC_SKIP_ACT = 'close';
let lastHapticAt = 0;
export const haptic = () => {
    const now = Date.now();
    if (now - lastHapticAt < HAPTIC_DEDUPE_MS)
        return;
    lastHapticAt = now;
    try {
        navigator.vibrate?.(HAPTIC_MS);
    }
    catch (e) {
        console.warn('haptic', e);
    }
};
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') { /* เทสต์ใน Node จำลอง document บาง ๆ */
    document.addEventListener('click', (e) => {
        const t = e.target;
        const el = (t && t.closest ? t.closest(HAPTIC_TARGETS) : null);
        if (!el || el.closest('[data-no-haptic]'))
            return;
        if ((el.getAttribute('data-act') || '') === HAPTIC_SKIP_ACT)
            return;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true')
            return;
        haptic();
    }, true);
}
export const dayLab = ds => ds === TODAY ? 'วันนี้' : ds === ymd(addDays(new Date(), -1)) ? 'เมื่อวาน' : ds === ymd(addDays(new Date(), 1)) ? 'พรุ่งนี้' : fmtDate(ds);
Object.assign(window, { pad, ymd, parse, addDays, TODAY, fmtDate, nowHM, esc, fmtClock, haptic, dayLab });

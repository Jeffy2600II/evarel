'use client';
/* S4 next-pages ไบต์ N1: บูตเครื่องยนต์ทั้งหมดตามลำดับเดิมของ index.html เป๊ะ
   (FullCalendar vendor → react runtime → today/calendar/nav → m/00..25 → route → boot/SW)
   ใช้ dynamic import เรียงลำดับใน useEffect เพราะ static import จะถูกรันตอน Next prerender ฝั่ง server (window ไม่มี)
   turbopack บันเดิลแต่ละไฟล์เป็น chunk — โมดูลคุยกันผ่าน window ภายในบันเดิล js/m/*.js จึงไม่ถูกเสิร์ฟแยกอีก */
import { useEffect } from 'react';

/* FullCalendar เป็น UMD ที่ bundler กลืนค่า (import แล้ว window.FullCalendar ไม่ถูกตั้ง) —
   โหลดเป็นไฟล์ script tag ตรงๆ ตาม index.html เดิม: ไฟล์อยู่ที่ public/vendor ในเส้นทางเสิร์ฟเสมอ */
const loadScript = (src: string) => new Promise<void>((res, rej) => {
  const el = document.createElement('script');
  el.src = src; el.async = false;
  el.onload = () => res();
  el.onerror = () => rej(new Error('โหลด ' + src + ' ไม่ได้'));
  document.head.appendChild(el);
});

export default function AppBoot() {
  useEffect(() => {
    /* ลำดับสำคัญ: react runtime ก่อน แล้วหน้า boot ต้น (index เดิมโหลดทันที) แล้วเครื่องยนต์ 00..25 แล้ว route แล้ว SW */
    const seq: Array<() => Promise<unknown>> = [
      () => loadScript('vendor/morphdom-umd.min.js'),
      () => loadScript('vendor/fullcalendar.min.js'),
      () => import('../../../runtime/js/react/runtime.js'),
      /* โหลดครบทุกหน้าตั้งแต่บูต (รวมที่เดิมเป็น lazy) — แก้ที่ต้นตอ React #130:
         today.jsx เรียก EvarelComponents.itemRow ตอน render ถ้าข้อมูล API มาถึงก่อนหน้า lazy โหลดเสร็จ = h(undefined)
         โหลดครบตั้งแต่บูตทำให้ loadReactSettings ของ 19-views__settings เป็น no-op (ทุก EvarelPages ลงทะเบียนแล้ว) ไม่เกิด React สองชุด */
      () => import('../../../runtime/js/react/today.js'),
      () => import('../../../runtime/js/react/calendar.js'),
      () => import('../../../runtime/js/react/nav.js'),
      () => import('../../../runtime/js/react/item-row.js'),
      () => import('../../../runtime/js/react/settings.js'),
      () => import('../../../runtime/js/react/stats.js'),
      () => import('../../../runtime/js/react/all.js'),
      () => import('../../../runtime/js/react/ai.js'),
      () => import('../../../runtime/js/react/dialog.js'),
      () => import('../../../runtime/js/react/sheet.js'),
      () => import('../../../runtime/js/react/form.js'),
      () => import('../../../runtime/js/react/detail.js'),
      () => import('../../../runtime/js/react/auth.js'),
      () => import('../../../runtime/js/react/quota.js'),
      () => import('../../../runtime/js/react/aiShell.js'),
      () => import('../../../runtime/js/react/focus.js'),
      () => import('../../../runtime/js/engine/00-head.js'),
      () => import('../../../runtime/js/engine/01-core__constants.js'),
      () => import('../../../runtime/js/engine/02-core__dates.js'),
      () => import('../../../runtime/js/engine/03-core__store.js'),
      () => import('../../../runtime/js/engine/04-data__repo.js'),
      () => import('../../../runtime/js/engine/05-data__auth.js'),
      () => import('../../../runtime/js/engine/06-services__schedule.js'),
      () => import('../../../runtime/js/engine/07-services__stats.js'),
      () => import('../../../runtime/js/engine/08-core__undo.js'),
      () => import('../../../runtime/js/engine/09-ui__layers.js'),
      () => import('../../../runtime/js/engine/10-services__notify.js'),
      () => import('../../../runtime/js/engine/11-ui__popover.js'),
      () => import('../../../runtime/js/engine/12-ui__primitives.js'),
      () => import('../../../runtime/js/engine/13-views.js'),
      () => import('../../../runtime/js/engine/14-ui__form.js'),
      () => import('../../../runtime/js/engine/15-core__timer.js'),
      () => import('../../../runtime/js/engine/16-services__ai-quota.js'),
      () => import('../../../runtime/js/engine/17-views__ai.js'),
      () => import('../../../runtime/js/engine/18-services__ai-live.js'),
      () => import('../../../runtime/js/engine/19-views__settings.js'),
      () => import('../../../runtime/js/engine/20-services__calendar.js'),
      () => import('../../../runtime/js/engine/21-views__detail.js'),
      () => import('../../../runtime/js/engine/22-views__auth.js'),
      /* 22-views__live-sync ตกหล่นจากลำดับบูตเดิมของ index.html (ไบต์ N1) — ไม่โหลด = stopLiveSync เป็น undefined
         ทำให้กดออกจากระบบไม่ตอบสนอง (doSignOut โยน ReferenceError เงียบ ๆ) และ realtime sync/push auto-sync ไม่เริ่มหลังล็อกอิน */
      () => import('../../../runtime/js/engine/22-views__live-sync.js'),
      () => import('../../../runtime/js/engine/23-render.js'),
      () => import('../../../runtime/js/engine/24-services__legacy-import.js'),
      () => import('../../../runtime/js/engine/25-actions.js'),
      () => import('../../../runtime/js/route.js'),
      () => import('../../../runtime/js/boot.js'),
    ];
    let dead = false;
    seq.reduce((p, load) => p.then(() => { if (!dead) return load(); }), Promise.resolve())
      .catch(e => console.warn('boot โหลดโมดูลไม่ครบ ใช้ตัวเดิมต่อไม่ได้', e));
    return () => { dead = true; };
  }, []);
  return null;
}

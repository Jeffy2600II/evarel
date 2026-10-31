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
      () => import('../../../app/web/js/react/runtime.js'),
      /* โหลดครบทุกหน้าตั้งแต่บูต (รวมที่เดิมเป็น lazy) — แก้ที่ต้นตอ React #130:
         today.jsx เรียก EvarelComponents.itemRow ตอน render ถ้าข้อมูล API มาถึงก่อนหน้า lazy โหลดเสร็จ = h(undefined)
         โหลดครบตั้งแต่บูตทำให้ loadReactSettings ของ 19-views__settings เป็น no-op (ทุก EvarelPages ลงทะเบียนแล้ว) ไม่เกิด React สองชุด */
      () => import('../../../app/web/js/react/today.js'),
      () => import('../../../app/web/js/react/calendar.js'),
      () => import('../../../app/web/js/react/nav.js'),
      () => import('../../../app/web/js/react/item-row.js'),
      () => import('../../../app/web/js/react/settings.js'),
      () => import('../../../app/web/js/react/stats.js'),
      () => import('../../../app/web/js/react/all.js'),
      () => import('../../../app/web/js/react/ai.js'),
      () => import('../../../app/web/js/react/dialog.js'),
      () => import('../../../app/web/js/react/sheet.js'),
      () => import('../../../app/web/js/react/form.js'),
      () => import('../../../app/web/js/react/detail.js'),
      () => import('../../../app/web/js/react/auth.js'),
      () => import('../../../app/web/js/react/quota.js'),
      () => import('../../../app/web/js/react/aiShell.js'),
      () => import('../../../app/web/js/react/focus.js'),
      () => import('../../../app/web/js/app/00-head.js'),
      () => import('../../../app/web/js/app/01-core__constants.js'),
      () => import('../../../app/web/js/app/02-core__dates.js'),
      () => import('../../../app/web/js/app/03-core__store.js'),
      () => import('../../../app/web/js/app/04-data__repo.js'),
      () => import('../../../app/web/js/app/05-data__auth.js'),
      () => import('../../../app/web/js/app/06-services__schedule.js'),
      () => import('../../../app/web/js/app/07-services__stats.js'),
      () => import('../../../app/web/js/app/08-core__undo.js'),
      () => import('../../../app/web/js/app/09-ui__layers.js'),
      () => import('../../../app/web/js/app/10-services__notify.js'),
      () => import('../../../app/web/js/app/11-ui__popover.js'),
      () => import('../../../app/web/js/app/12-ui__primitives.js'),
      () => import('../../../app/web/js/app/13-views.js'),
      () => import('../../../app/web/js/app/14-ui__form.js'),
      () => import('../../../app/web/js/app/15-core__timer.js'),
      () => import('../../../app/web/js/app/16-services__ai-quota.js'),
      () => import('../../../app/web/js/app/17-views__ai.js'),
      () => import('../../../app/web/js/app/18-services__ai-live.js'),
      () => import('../../../app/web/js/app/19-views__settings.js'),
      () => import('../../../app/web/js/app/20-services__calendar.js'),
      () => import('../../../app/web/js/app/21-views__detail.js'),
      () => import('../../../app/web/js/app/22-views__auth.js'),
      () => import('../../../app/web/js/app/23-render.js'),
      () => import('../../../app/web/js/app/24-services__legacy-import.js'),
      () => import('../../../app/web/js/app/25-actions.js'),
      () => import('../../../app/web/js/route.js'),
      () => import('../../../app/web/js/boot.js'),
    ];
    let dead = false;
    seq.reduce((p, load) => p.then(() => { if (!dead) return load(); }), Promise.resolve())
      .catch(e => console.warn('boot โหลดโมดูลไม่ครบ ใช้ตัวเดิมต่อไม่ได้', e));
    return () => { dead = true; };
  }, []);
  return null;
}

'use client';
/* S4 next-pages ไบต์ N1: บูตเครื่องยนต์ทั้งหมดตามลำดับเดิมของ index.html เป๊ะ
   (FullCalendar vendor → react runtime → today/calendar/nav → m/00..25 → route → boot/SW)
   ใช้ dynamic import เรียงลำดับใน useEffect เพราะ static import จะถูกรันตอน Next prerender ฝั่ง server (window ไม่มี)
   turbopack บันเดิลแต่ละไฟล์เป็น chunk — โมดูลคุยกันผ่าน window ภายในบันเดิล js/m/*.js จึงไม่ถูกเสิร์ฟแยกอีก */
import { useEffect } from 'react';

const FILES = [
  /* @vite-ignore */ '../../../app/web/vendor/fullcalendar.min.js',
];

export default function AppBoot() {
  useEffect(() => {
    /* ลำดับสำคัญ: react runtime ก่อน แล้วหน้า boot ต้น (index เดิมโหลดทันที) แล้วเครื่องยนต์ 00..25 แล้ว route แล้ว SW */
    const seq: Array<() => Promise<unknown>> = [
      () => import('../../../app/web/vendor/fullcalendar.min.js'),
      () => import('../../../app/web/js/react/runtime.js'),
      () => import('../../../app/web/js/react/today.js'),
      () => import('../../../app/web/js/react/calendar.js'),
      () => import('../../../app/web/js/react/nav.js'),
      () => import('../../../app/web/js/m/00-head.js'),
      () => import('../../../app/web/js/m/01-core__constants.js'),
      () => import('../../../app/web/js/m/02-core__dates.js'),
      () => import('../../../app/web/js/m/03-core__store.js'),
      () => import('../../../app/web/js/m/04-data__repo.js'),
      () => import('../../../app/web/js/m/05-data__auth.js'),
      () => import('../../../app/web/js/m/06-services__schedule.js'),
      () => import('../../../app/web/js/m/07-services__stats.js'),
      () => import('../../../app/web/js/m/08-core__undo.js'),
      () => import('../../../app/web/js/m/09-ui__layers.js'),
      () => import('../../../app/web/js/m/10-services__notify.js'),
      () => import('../../../app/web/js/m/11-ui__popover.js'),
      () => import('../../../app/web/js/m/12-ui__primitives.js'),
      () => import('../../../app/web/js/m/13-views.js'),
      () => import('../../../app/web/js/m/14-ui__form.js'),
      () => import('../../../app/web/js/m/15-core__timer.js'),
      () => import('../../../app/web/js/m/16-services__ai-quota.js'),
      () => import('../../../app/web/js/m/17-views__ai.js'),
      () => import('../../../app/web/js/m/18-services__ai-live.js'),
      () => import('../../../app/web/js/m/19-views__settings.js'),
      () => import('../../../app/web/js/m/20-services__calendar.js'),
      () => import('../../../app/web/js/m/21-views__detail.js'),
      () => import('../../../app/web/js/m/22-views__auth.js'),
      () => import('../../../app/web/js/m/23-render.js'),
      () => import('../../../app/web/js/m/24-services__legacy-import.js'),
      () => import('../../../app/web/js/m/25-actions.js'),
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

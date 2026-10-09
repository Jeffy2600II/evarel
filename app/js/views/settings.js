/* Path: app/js/views/settings.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { navigate } from '../router.js';
import { openSheet } from '../ui/sheet.js';

/* ---------- ตั้งค่า ---------- */
export function notifState() {
  if (!('Notification' in window)) return ['ไม่รองรับ', 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน ลองใช้ Chrome บน Android'];
  const p = Notification.permission;
  if (p === 'granted') return ['อนุญาตแล้ว', 'เครื่องนี้พร้อมรับการแจ้งเตือนแล้ว'];
  if (p === 'denied') return ['ถูกปิดไว้', 'ปิดอยู่ที่เบราว์เซอร์ ต้องไปเปิดเองที่ ตั้งค่าเว็บไซต์ → การแจ้งเตือน'];
  return ['ยังไม่ได้ขออนุญาต', 'กดปุ่มด้านล่างเพื่อให้เครื่องนี้รับการแจ้งเตือนได้'];
}
export function settingsBody() {
  const [state, note] = notifState();
  const total = ST.S.items.reduce((n, it) => n + (it.reminders || []).length, 0);
  return `<div class="ev-form">
    <section class="ev-card" data-tone="soft"><div class="ev-stat"><div><b>การแจ้งเตือนบนเครื่องนี้</b><p class="ev-sub">${note}</p></div><span class="ev-chip">${state}</span></div>
      ${'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied' ? '<button class="ev-btn-primary ev-btn-block ev-gap-top-sm" data-act="notify">อนุญาตการแจ้งเตือน</button>' : ''}</section>
    <section class="ev-card"><b>เวลาเตือนที่ตั้งไว้</b><p class="ev-sub">ตั้งไว้แล้ว ${total} รายการเตือน ตอนนี้แอปบันทึกเวลาไว้ให้เรียบร้อย แต่ <b>ยังไม่เด้งเตือนจริงบนมือถือ</b> เพราะยังไม่ได้เชื่อมระบบส่งการแจ้งเตือน จะใช้ได้เมื่อเชื่อมระบบเสร็จ</p></section>
    <section class="ev-card"><b>ข้อมูลของคุณ</b><p class="ev-sub">ตอนนี้ข้อมูลเก็บอยู่ในเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ ข้อมูลจะหาย สำรองเป็นไฟล์ไว้ได้ที่นี่</p>
      <div class="ev-row ev-gap-top-sm ev-backup-row"><button class="ev-btn-ghost" data-act="export">สำรองข้อมูล</button><button class="ev-btn-ghost" data-act="import">นำกลับมา</button></div>
      <input type="file" id="importFile" accept="application/json,.json" hidden></section></div>`;
}
export function openSettings() { navigate('settings'); return;

  const [state, note] = notifState();
  const total = ST.S.items.reduce((n, it) => n + (it.reminders || []).length, 0);
  openSheet('ตั้งค่า', `<div class="ev-form">
    <section class="ev-card" data-tone="soft"><div class="ev-stat"><div><b>การแจ้งเตือนบนเครื่องนี้</b><p class="ev-sub">${note}</p></div><span class="ev-chip">${state}</span></div>
      ${'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied' ? '<button class="ev-btn-primary ev-btn-block ev-gap-top-sm" data-act="notify">อนุญาตการแจ้งเตือน</button>' : ''}</section>
    <section class="ev-card"><b>เวลาเตือนที่ตั้งไว้</b><p class="ev-sub">ตั้งไว้แล้ว ${total} รายการเตือน ตอนนี้แอปบันทึกเวลาไว้ให้เรียบร้อย แต่ <b>ยังไม่เด้งเตือนจริงบนมือถือ</b> เพราะยังไม่ได้เชื่อมระบบส่งการแจ้งเตือน จะใช้ได้เมื่อเชื่อมระบบเสร็จ</p></section>
    <section class="ev-card"><b>ข้อมูลของคุณ</b><p class="ev-sub">ตอนนี้ข้อมูลเก็บอยู่ในเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ ข้อมูลจะหาย สำรองเป็นไฟล์ไว้ได้ที่นี่</p>
      <div class="ev-row ev-gap-top-sm ev-backup-row"><button class="ev-btn-ghost" data-act="export">สำรองข้อมูล</button><button class="ev-btn-ghost" data-act="import">นำกลับมา</button></div>
      <input type="file" id="importFile" accept="application/json,.json" hidden></section></div>`);
}

/* Path: app/js/core/timer.js | split mechanically from app.js (no logic edits) */
import { ST } from './state.js';
import { TIMER_KEY } from './constants.js';
import { pad } from './dates.js';
import { find } from './store.js';
import { target, val } from '../services/schedule.js';

/* ---------- Timer service: เก็บเป็น timestamp ทนต่อปิดแอป/รีเฟรช ---------- */
/* โครงสร้าง: { id, date, startedAt|null, acc } acc = มิลลิวินาทีที่สะสมไว้ก่อนหน้า (ตอนหยุดชั่วคราว) */
export const loadTimer = () => { try { return JSON.parse(localStorage.getItem(TIMER_KEY)) || null; } catch { return null; } };
export const saveTimer = () => { try { ST.TIMER ? localStorage.setItem(TIMER_KEY, JSON.stringify(ST.TIMER)) : localStorage.removeItem(TIMER_KEY); } catch (err) { console.warn('บันทึกตัวจับเวลาไม่สำเร็จ', err); } };
export const timerMs = () => (ST.TIMER ? ST.TIMER.acc + (ST.TIMER.startedAt ? Date.now() - ST.TIMER.startedAt : 0) : 0);
export const timerMin = ms => Math.floor(ms / 60000);
export const fmtClock = ms => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
export function ensureTick() {
  clearInterval(ST.TICK); ST.TICK = null;
  if (ST.TIMER && ST.TIMER.startedAt) ST.TICK = setInterval(() => {
    if (!ST.TIMER) return;
    document.querySelectorAll('[data-clock]').forEach(el => { if (el.dataset.clock == ST.TIMER.id) el.textContent = fmtClock(timerMs()); });
    const dial = document.getElementById('dial'), it = ST.TIMER && find(ST.TIMER.id);
    if (dial && it) dial.style.setProperty('--p', Math.min(100, (val(it, ST.TIMER.date) * 60000 + timerMs()) / (target(it) * 60000) * 100));
  }, 1000);
}

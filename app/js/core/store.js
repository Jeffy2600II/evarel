/* Path: app/js/core/store.js | split mechanically from app.js (no logic edits) */
import { ST } from './state.js';
import { STORE_KEY, cleanReminders } from './constants.js';
import { TODAY } from './dates.js';
import { SEED, mkBase } from './seed.js';
import { target } from '../services/schedule.js';

/* ---------- Data layer ---------- */
/* ทำความสะอาดข้อมูลที่โหลด: ทุกรายการต้องมี log/rem/repeat ของตัวเอง และค่าไม่สมเหตุสมผลต้องถูกบังคับ */
export function normalize(state) {
  const items = Array.isArray(state?.items) ? state.items : [];
  return { items: items.map(it => {
    const m = mkBase();
    const r = it.repeat || {};
    const { rem: _legacy, ...rest } = it;
    return { ...m, ...rest,
      log: { ...(it.log || {}) },
      skips: { ...(it.skips || {}) },
      reminders: cleanReminders(Array.isArray(it.reminders) ? it.reminders : (Array.isArray(it.rem) && it.time ? it.rem.map(m => ({ k: 'before', m })) : [])),
      repeat: { unit: r.unit || 'none', every: Math.max(1, +r.every || 1), days: Array.isArray(r.days) ? [...r.days] : [] },
      target: Math.max(1, +it.target || 1),
    };
  }) };
}
export function loadState() {
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? normalize(JSON.parse(raw)) : structuredClone(SEED); }
  catch (err) { console.warn('โหลดข้อมูลไม่สำเร็จ ใช้ข้อมูลตัวอย่าง', err); return structuredClone(SEED); }
}
export function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(ST.S)); } catch (err) { console.warn('บันทึกไม่สำเร็จ', err); } }
export const UI = { tab: 'today', date: TODAY, type: 'all', cday: Math.min(Math.max(new Date().getDay(), 1), 5), loading: true };
/* ---------- Actions ---------- */
export const find = id => ST.S.items.find(x => x.id == id);

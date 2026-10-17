import { TH_DAY, TH_MON, HAPTIC_MS } from './01-core__constants.js';
/* ===== MODULE: core/dates ===== */
export const pad=n=>String(n).padStart(2,'0');
export const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parse=s=>new Date(`${s}T00:00:00`);
export const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
export const TODAY=ymd(new Date());
export const fmtDate=ds=>{const d=parse(ds);return `${TH_DAY[d.getDay()]}ที่ ${d.getDate()} ${TH_MON[d.getMonth()]}`};
export const nowHM=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmtClock=ms=>{const s=Math.floor(ms/1000);return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`};
export const haptic=()=>{try{navigator.vibrate?.(HAPTIC_MS)}catch(e){console.warn('haptic',e)}};

/* moved by move_defs (evarel-ts-1f) */
export const dayLab=ds=>ds===TODAY?'วันนี้':ds===ymd(addDays(new Date(),-1))?'เมื่อวาน':ds===ymd(addDays(new Date(),1))?'พรุ่งนี้':fmtDate(ds);

Object.assign(window, { pad, ymd, parse, addDays, TODAY, fmtDate, nowHM, esc, fmtClock, haptic, dayLab });

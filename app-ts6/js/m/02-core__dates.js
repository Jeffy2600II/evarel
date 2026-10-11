/* ===== MODULE: core/dates ===== */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>new Date(`${s}T00:00:00`);
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const TODAY=ymd(new Date());
const fmtDate=ds=>{const d=parse(ds);return `${TH_DAY[d.getDay()]}ที่ ${d.getDate()} ${TH_MON[d.getMonth()]}`};
const nowHM=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtClock=ms=>{const s=Math.floor(ms/1000);return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`};
const haptic=()=>{try{navigator.vibrate?.(HAPTIC_MS)}catch(e){console.warn('haptic',e)}};


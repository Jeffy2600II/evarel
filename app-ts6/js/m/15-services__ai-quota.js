/* ===== MODULE: services/ai-quota (ชิปโควตา + ล็อกช่องพิมพ์ : evarel-quota-ui) =====
   - ล็อกฝั่งแอปเป็นแค่ UX: ด่านจริงคือ 429 ที่ Worker (ห้ามถอด) | อ่านไม่ได้ = fail-open (ไม่ล็อก ซ่อนชิป)
   - สถานะ: ok (เหลือมาก) | low (<=20%) | out (หมด) | null (ไม่ทราบ/โหมด Mock -> ไม่มีชิป) */

const QUOTA_LOW=0.2,QUOTA_POLL_MAX=600000;
/* ค่า "อ่านโควตาไม่ได้" ใช้ร่วมทุกจุด fail-open (ห้ามล็อกผู้ใช้เพราะเราอ่านพลาด) */
const QUOTA_UNKNOWN=Object.freeze({unknown:true,blocked:false});
let QUOTA=null,quotaTimer=0,quotaTick=0;
const quotaEnabled=()=>AI_LIVE();
function quotaState(q){if(!q||q.unknown||!q.calls||!q.tokens||!(q.calls.limit>0)||!(q.tokens.limit>0))return null;if(q.blocked||q.calls.remaining<=0||q.tokens.remaining<=0)return 'out';const r=Math.min(q.calls.remaining/q.calls.limit,q.tokens.remaining/q.tokens.limit);return r<=QUOTA_LOW?'low':'ok'}
/* ชิปพูดเป็น "ครั้ง" เสมอ (หน่วยที่ผู้ใช้เข้าใจ) ถ้า "โทเคน" ใกล้หมดก่อนจะเตือนตรงๆ ไม่ใช่โชว์เลขครั้งที่ดูเหมือนเหลือเยอะ */
function quotaShort(q){const st=quotaState(q);if(st==='out')return 'โควตาหมด';
 const cr=q.calls.remaining/q.calls.limit,tr=q.tokens.remaining/q.tokens.limit;
 if(tr<=QUOTA_LOW&&tr<cr)return 'ใกล้ถึงขีดจำกัดวันนี้';
 return `เหลือ ${q.calls.remaining} จาก ${q.calls.limit} ครั้ง`}
const resetMs=iso=>{const v=+new Date(iso);return Number.isFinite(v)?v:NaN};
function resetClock(iso){const d=new Date(iso);if(isNaN(d))return '';const b=new Date(+d+7*3600000);return `${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`}
function resetIn(iso){const ms=resetMs(iso)-Date.now();if(!(ms>0))return 'ในอีกสักครู่';const m=Math.ceil(ms/60000),h=Math.floor(m/60);return h>=1?`อีก ${h} ชม. ${m%60} นาที`:`อีก ${m} นาที`}
async function quotaFetch(){if(!quotaEnabled())return null;
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),6000);
 try{const t=await Repo.token(),r=await fetch(`${SUPA_API}/ai/quota`,{signal:ctl.signal,headers:{Authorization:'Bearer '+t}});
  if(!r.ok)return QUOTA_UNKNOWN;const j=await r.json();
  if(j&&j.unknown)return QUOTA_UNKNOWN;
  if(!j||typeof j!=='object'||!j.calls||!j.tokens||!(j.calls.limit>0)||!(j.tokens.limit>0))return QUOTA_UNKNOWN;
  return j}
 catch(e){return QUOTA_UNKNOWN}finally{clearTimeout(tm)}}
/* วาดชิป + สถานะช่องพิมพ์จาก QUOTA (จุดเดียวที่แตะ DOM ของโควตา) */
function quotaPaint(){const form=$('aiForm'),ta=$('aiText'),send=form?.querySelector('.ev-send'),chip=$('aiQuota');if(!form||!ta||!send)return;
 const st=quotaState(QUOTA),out=st==='out',wasLocked=form.dataset.locked==='true';
 if(chip){if(!st){chip.hidden=true;chip.textContent='';delete chip.dataset.state}
  else{chip.hidden=false;chip.dataset.state=st;chip.textContent=out?(resetClock(QUOTA.resetAt)?`โควตาหมด · รีเซ็ต ${resetClock(QUOTA.resetAt)} น.`:'โควตาหมด'):quotaShort(QUOTA)}}
 ta.disabled=out;send.disabled=out;form.dataset.locked=out?'true':'false';
 if(out){send.setAttribute('aria-disabled','true');ta.placeholder=resetClock(QUOTA.resetAt)?`โควตาหมด รีเซ็ต ${resetClock(QUOTA.resetAt)} น. (${resetIn(QUOTA.resetAt)})`:'โควตาหมดสำหรับวันนี้';ta.value=''}
 else{send.removeAttribute('aria-disabled');ta.placeholder=AI_PLACEHOLDER;if(wasLocked&&document.activeElement===document.body)ta.focus({preventScroll:true})}
 clearTimeout(quotaTimer);quotaTimer=0;
 if(out){const ms=resetMs(QUOTA.resetAt)-Date.now(),wait=Number.isFinite(ms)?Math.min(Math.max(ms+1500,3000),QUOTA_POLL_MAX):QUOTA_POLL_MAX;quotaTimer=setTimeout(quotaRefresh,wait)}}
async function quotaRefresh(){if(!$('aiForm'))return;const my=++quotaTick,q=await quotaFetch();if(my!==quotaTick||!$('aiForm'))return;
 /* ไม่ทราบ: คงค่าเดิมถ้าเคยล็อกอยู่และยังไม่ถึงเวลารีเซ็ต (กันปลดล็อกผิดเพราะเน็ตสะดุด) มิฉะนั้นปล่อย (fail-open) */
 if(q&&q.unknown&&QUOTA&&QUOTA.blocked&&+new Date(QUOTA.resetAt)>Date.now()){quotaPaint();return}
 QUOTA=q;quotaPaint()}
/* ใช้ค่าที่ /chat คืน (สำเร็จหรือ 429) อัปเดตชิปโดยไม่ยิงเพิ่ม */
function quotaFromChat(qc,hit429){if(!qc||!(qc.limit>0))return;quotaTick++;const tl=qc.tokens&&qc.tokens.limit>0?qc.tokens:{used:0,limit:(QUOTA&&QUOTA.tokens?.limit)||60000};
 const out=hit429||qc.used>=qc.limit||tl.used>=tl.limit;
 QUOTA={day:'',resetAt:qc.resetAt||QUOTA?.resetAt||new Date(Date.now()+3600000).toISOString(),blocked:out,...(out?{reason:qc.reason||(qc.used>=qc.limit?'calls':'tokens')}:{}),
  calls:{used:qc.used,limit:qc.limit,remaining:Math.max(0,qc.limit-qc.used)},tokens:{used:tl.used,limit:tl.limit,remaining:Math.max(0,tl.limit-tl.used)}};
 quotaPaint()}
function quotaSheet(){if(!QUOTA||QUOTA.unknown)return;const q=QUOTA,bar=(u,l,lb)=>`<div class="ev-qbar" role="progressbar" aria-label="${lb}" aria-valuemin="0" aria-valuemax="${l}" aria-valuenow="${Math.min(u,l||0)}"><i style="--p:${l>0?Math.min(1,u/l).toFixed(3):'0'}"></i></div>`;
 openSheet('โควตา AI วันนี้',`<div class="ev-qrow"><div class="ev-row"><b>จำนวนครั้ง</b><span class="ev-sub">${q.calls.used} / ${q.calls.limit}</span></div>${bar(q.calls.used,q.calls.limit,'จำนวนครั้งที่ใช้วันนี้')}</div>
 <div class="ev-qrow"><div class="ev-row"><b>ปริมาณการคิด</b><span class="ev-sub">${q.tokens.used.toLocaleString('en-US')} / ${q.tokens.limit.toLocaleString('en-US')}</span></div>${bar(q.tokens.used,q.tokens.limit,'ปริมาณการคิดที่ใช้วันนี้')}</div>
 <p class="ev-sub" style="margin-top:12px">${q.blocked?'ตอนนี้ใช้ครบแล้ว ':''}รีเซ็ตเวลา ${resetClock(q.resetAt)} น. (${resetIn(q.resetAt)})</p>`)}



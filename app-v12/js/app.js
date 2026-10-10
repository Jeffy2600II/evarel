
/* Path: design/master-demo-v3.html (ส่วน JS) | Purpose: ตรรกะ + UX ระดับแอป ในไฟล์เดียว
   Used by: agent ย้ายเข้า app/js/ — แต่ละหัวข้อ "MODULE:" = 1 ไฟล์ | Layer: core → services → ui(layers) → views → actions */

/* ===== MODULE: core/constants ===== */
const STORE_KEY='evarel-demo-v3',TIMER_KEY='evarel-timer-v3',THEME_KEY='evarel-theme-v3';
const DAY_MS=86400000,TOAST_MS=5000,SKELETON_MS=450,STREAK_LOOKBACK=365,STAT_DAYS=30,DRAG_CLOSE_PX=110,DRAG_CLOSE_V=.6,HAPTIC_MS=10,LONG_PRESS_MS=450,LAYER_ANIM_MS=420,MAX_REM=8;
const TYPES={habit:'กิจวัตร',task:'งาน',event:'กิจกรรม',class:'คาบเรียน'};
const TABS=[['today','วันนี้','home'],['all','รายการ','tasks'],['calendar','ปฏิทิน','cal'],['stats','สถิติ','chart']];
const WD=['อา','จ','อ','พ','พฤ','ศ','ส'],WEEK_OPTS=WD.map((l,i)=>[i,l]);
const TH_MON=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],TH_DAY=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสฯ','ศุกร์','เสาร์'];
const UNIT_TH={day:'วัน',week:'สัปดาห์',month:'เดือน'};
const REM_PRESETS=[0,10,30,60,1440],TRACK_OPTS=[['check','ติ๊ก'],['count','นับเป้า'],['timer','ระยะเวลา']];
const HHMM=/^([01]\d|2[0-3]):[0-5]\d$/;
const ICONS={home:'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',tasks:'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9',cal:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',chart:'M5 20V10M12 20V4M19 20v-7',spark:'M12 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',plus:'M12 5v14M5 12h14',x:'M6 6l12 12M18 6L6 18',check:'M6.5 12.5l3.5 3.5 7.5-8',play:'M7.5 5l10 7-10 7z',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',pause:'M8 5v14M16 5v14',stop:'M7 7h10v10H7z',more:'M12 5.5v.01M12 12v.01M12 18.5v.01',edit:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',copy:'M9 9h11v11H9zM5 15V5h10',trash:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',skip:'M5 5l10 7-10 7zM19 5v14',bell:'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4',back:'M14.5 5l-7 7 7 7',chev:'M9 6l6 6-6 6',pin:'M9 4h6l-1 5 3 4H7l3-4zM12 13v7',chat:'M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',list:'M4 7h16M4 12h16M4 17h10',send:'M4 12l16-8-6 16-3-7z',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2',inbox:'M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5'};

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

/* ===== MODULE: core/store ===== */
const mk=o=>({id:o.id,type:'habit',title:'',subject:'',start:TODAY,end:'',time:'',timeEnd:'',rem:[{k:'before',m:0}],track:'none',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},log:{},skip:{},...o});
const fill=(n,v)=>Object.fromEntries(Array.from({length:n},(_,i)=>[ymd(addDays(new Date(),-i-1)),v]));
const daily=()=>({unit:'day',every:1,days:[]}),weekly=d=>({unit:'week',every:1,days:d});
const cls=(id,d,t,te,title)=>mk({id,type:'class',title,time:t,timeEnd:te,repeat:weekly([d])});
const seed=()=>({items:[
 mk({id:1,title:'ดื่มน้ำ',track:'count',target:8,unitName:'แก้ว',repeat:daily(),log:fill(6,8),start:ymd(addDays(new Date(),-10))}),
 mk({id:2,title:'อ่านหนังสือ',time:'19:00',track:'timer',target:30,unitName:'นาที',repeat:daily(),log:fill(3,30),start:ymd(addDays(new Date(),-10))}),
 mk({id:3,title:'นอนก่อน 22:00',time:'22:00',track:'check',repeat:daily(),log:fill(4,1),start:ymd(addDays(new Date(),-10))}),
 mk({id:4,title:'วิ่ง',time:'17:00',track:'check',repeat:weekly([1,3,5]),start:ymd(addDays(new Date(),-10)),log:Object.fromEntries(Array.from({length:5},(_,i)=>[ymd(addDays(new Date(),-i*2-1)),1]))}),
 mk({id:5,type:'task',title:'การบ้านคณิตศาสตร์',subject:'คณิต',time:'16:00',track:'check'}),
 mk({id:6,type:'task',title:'ท่องคำศัพท์ Unit 4',subject:'อังกฤษ',time:'20:00',track:'check',start:ymd(addDays(new Date(),-1))}),
 mk({id:7,type:'task',title:'รายงานวิทยาศาสตร์',subject:'วิทย์',track:'check',start:ymd(addDays(new Date(),2))}),
 mk({id:8,type:'event',title:'ประชุมชมรม',time:'16:30',timeEnd:'17:30',repeat:weekly([4])}),
 cls(9,1,'08:30','09:20','คณิตศาสตร์'),cls(10,1,'09:20','10:10','ภาษาไทย'),cls(11,2,'08:30','09:20','อังกฤษ'),cls(12,3,'08:30','09:20','วิทยาศาสตร์'),cls(13,4,'09:20','10:10','ศิลปะ'),cls(14,5,'08:30','09:20','ชุมนุม')]});
/* ===== MODULE: data/repo — จุดต่อ backend: เปลี่ยน `Repo` ตัวเดียว (UI ไม่รู้ว่าข้อมูลมาจากไหน) =====
   สัญญา adapter: load():Promise<{items}> · apply({upserts:Item[],removes:id[]},fullState):Promise<void> (โยน error เมื่อบันทึกไม่สำเร็จ) */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const LocalAdapter={
 async load(){try{const r=localStorage.getItem(STORE_KEY),s=r?JSON.parse(r):seed();if(!Array.isArray(s.items))throw new Error('bad shape');return s}catch(err){console.warn('โหลดข้อมูลไม่สำเร็จ ใช้ข้อมูลตัวอย่าง',err);return seed()}},
 async apply(changes,full){localStorage.setItem(STORE_KEY,JSON.stringify(full))}};
const HttpAdapter=base=>{const call=(url,o)=>fetch(url,{credentials:'include',headers:{'Content-Type':'application/json'},...o}).then(r=>{if(!r.ok)throw new Error(`${o?.method||'GET'} ${url} ${r.status}`);return r});
 return {async load(){return {items:(await (await call(`${base}/items`)).json()).items}},
  async apply({upserts,removes}){await Promise.all([...upserts.map(it=>call(`${base}/items/${it.id}`,{method:'PUT',body:JSON.stringify(it)})),...removes.map(id=>call(`${base}/items/${id}`,{method:'DELETE'}))])}}};
let _repoImpl=LocalAdapter;const Repo={load:()=>_repoImpl.load(),apply:(c,f)=>_repoImpl.apply(c,f)};/* v12: window.EvarelRepo.use(adapter) สลับ adapter ได้ (ดู js/auth.js) */
window.EvarelRepo={use:a=>{_repoImpl=a},LocalAdapter,STORE_KEY};
function diffItems(prev,next){const m=new Map(prev.map(x=>[x.id,JSON.stringify(x)])),ids=new Set(next.map(x=>x.id));return {upserts:next.filter(x=>m.get(x.id)!==JSON.stringify(x)),removes:prev.filter(x=>!ids.has(x.id)).map(x=>x.id)}}
async function syncChanges(prev,next){const ch=diffItems(prev,next);if(!ch.upserts.length&&!ch.removes.length)return;await Repo.apply(ch,{items:next})}
const S={items:[]};
const UI={tab:'today',date:TODAY,type:'all',period:'week',cal:null,lastW:{},calView:'dayGridMonth',calSel:TODAY,calDate:null,weekOff:0,weekDir:0,fdate:TODAY,error:null,loading:true,animate:true,pop:null,lastP:0};
const find=id=>S.items.find(x=>x.id==id);

/* ===== MODULE: services/schedule ===== */
function occursOn(it,ds){const d0=parse(it.start),d=parse(ds),r=it.repeat;if(d<d0||(it.end&&d>parse(it.end)))return false;
 if(r.unit==='none')return ds===it.start;
 if(r.unit==='day')return Math.round((d-d0)/DAY_MS)%r.every===0;
 if(r.unit==='week')return r.days.includes(d.getDay())&&Math.floor(Math.round((d-addDays(d0,-d0.getDay()))/DAY_MS)/7)%r.every===0;
 return d.getDate()===d0.getDate()&&((d.getFullYear()-d0.getFullYear())*12+d.getMonth()-d0.getMonth())%r.every===0}
const val=(it,ds)=>it.log[ds]||0,target=it=>it.track==='count'||it.track==='timer'?it.target:1,tracked=it=>it.track!=='none';
const isDone=(it,ds)=>val(it,ds)>=target(it),skipped=(it,ds)=>!!it.skip[ds],isFuture=ds=>ds>TODAY;
const onDate=ds=>S.items.filter(it=>occursOn(it,ds)).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
const overdue=()=>S.items.filter(it=>it.type==='task'&&it.start<TODAY&&!isDone(it,it.start)).sort((a,b)=>a.start.localeCompare(b.start));
function streak(it){let n=0;for(let i=0;i<STREAK_LOOKBACK;i++){const ds=ymd(addDays(new Date(),-i));if(!occursOn(it,ds)||skipped(it,ds))continue;if(isDone(it,ds))n++;else if(i>0)break}return n}
function rate(it){let t=0,ok=0;for(let i=0;i<STAT_DAYS;i++){const ds=ymd(addDays(new Date(),-i));if(ds<it.start||!occursOn(it,ds)||skipped(it,ds))continue;t++;if(isDone(it,ds))ok++}return t?Math.round(100*ok/t):0}
const remText=r=>r.k==='at'?`เวลา ${r.t} น.`:r.m===0?'ตรงเวลา':r.m%1440===0?`ก่อน ${r.m/1440} วัน`:r.m%60===0?`ก่อน ${r.m/60} ชม.`:`ก่อน ${r.m} นาที`;
function repeatText(it){const r=it.repeat,tail=it.end?` · ถึง ${fmtDate(it.end)}`:'';if(r.unit==='none')return `ครั้งเดียว · ${fmtDate(it.start)}`;
 const one=r.every===1,u=UNIT_TH[r.unit];return (r.unit==='week'?(one?'ทุกสัปดาห์':`ทุก ${r.every} สัปดาห์`)+` · ${[...r.days].sort().map(d=>WD[d]).join(' ')}`:one?`ทุก${u}`:`ทุก ${r.every} ${u}`)+tail}
const timeText=it=>it.time?it.time+(it.timeEnd?`–${it.timeEnd}`:''):'';
function periodOf(it){if(!it.time)return 0;const h=+it.time.slice(0,2);return h<12?1:h<17?2:3}
const PERIODS=['ทั้งวัน','ช่วงเช้า','ช่วงบ่าย','ช่วงเย็น–ค่ำ'];

/* ===== MODULE: services/stats (นับจากรายการที่ "ตั้งไว้" จริง ไม่รวมวันที่ข้าม) ===== */
const habits=()=>S.items.filter(it=>it.type==='habit');
const typeIcon=it=>it.track==='timer'?'clock':it.track==='count'?'chart':({habit:'check',task:'tasks',event:'bell',class:'cal'})[it.type];
function periodStats(it,days){let t=0,ok=0;for(let i=0;i<days;i++){const ds=ymd(addDays(new Date(),-i));if(ds<it.start||!occursOn(it,ds)||skipped(it,ds))continue;t++;if(isDone(it,ds))ok++}return {t,ok}}
const ARC_C=2*Math.PI*42;
function chartData(){const hs=habits(),isM=UI.period==='month',n=isM?4:7,size=isM?7:1,out=[];
 for(let k=0;k<n;k++){let t=0,ok=0,start=null;for(let j=0;j<size;j++){const d=addDays(new Date(),-((n-1-k)*size+(size-1-j))),ds=ymd(d);if(j===0)start=d;
  hs.forEach(h=>{if(ds<h.start||!occursOn(h,ds)||skipped(h,ds))return;t++;if(isDone(h,ds))ok++})}
  out.push({t,ok,pct:t?Math.round(100*ok/t):0,label:isM?`${start.getDate()} ${TH_MON[start.getMonth()]}`:WD[start.getDay()],today:!isM&&k===n-1})}return out}
const totalDone=it=>Object.keys(it.log).filter(ds=>occursOn(it,ds)&&isDone(it,ds)).length;

/* ===== MODULE: core/undo + toast ===== */
const toastEl=document.getElementById('toast');let toastTimer=0;
function toast(msg,undo){clearTimeout(toastTimer);toastEl.style.setProperty('--toast-ms',TOAST_MS+'ms');
 toastEl.innerHTML=`<span>${esc(msg)}</span>${undo?'<button data-act="undo">ย้อนกลับ</button>':''}`;toastEl._undo=undo||null;
 toastEl.dataset.open='false';void toastEl.offsetWidth;toastEl.dataset.open='true';toastTimer=setTimeout(()=>{toastEl.dataset.open='false'},TOAST_MS)}
const clone=x=>JSON.parse(JSON.stringify(x));
function syncFail(err,restore){console.warn('sync failed',err);restore();render();toast('บันทึกไม่สำเร็จ จึงย้อนค่ากลับให้แล้ว')}
function commit(msg,fn,quiet){const prev=clone(S.items);fn();const next=clone(S.items);render();
 syncChanges(prev,next).catch(err=>syncFail(err,()=>{S.items=prev}));
 if(!quiet)toast(msg,()=>{S.items=clone(prev);render();syncChanges(next,prev).catch(err=>syncFail(err,()=>{S.items=next}))})}

/* ===== MODULE: ui/layers (sheet · page · lock · focus trap · history · drag) ===== */
const $=id=>document.getElementById(id),sheet=$('sheet'),scrim=$('scrim'),page=$('page'),dialog=$('dialog'),pop=$('pop');
let sheetMode='';const LAYERS=[],BEHIND=['app','nav','live'];let scrollY0=0;
function lock(on){const b=document.body;if(on&&b.dataset.lock!=='true'){scrollY0=scrollY;b.style.top=`-${scrollY0}px`;b.dataset.lock='true'}
 else if(!on&&b.dataset.lock==='true'){b.dataset.lock='false';b.style.top='';scrollTo(0,scrollY0)}
 BEHIND.forEach(id=>{const e=$(id);on?e.setAttribute('inert',''):e.removeAttribute('inert')})}
function pushLayer(layer){layer.opener=document.activeElement;LAYERS.push(layer);lock(true);
 try{history.pushState({ev:LAYERS.length},'');layer.pushed=true}catch(e){console.warn('history',e)}
 layer.el.hidden=false;void layer.el.offsetWidth;layer.el.dataset.open='true';if(layer.kind==='sheet'){scrim.dataset.open='true'}
 setTimeout(()=>(layer.el.querySelector('[autofocus],input,button:not(.ev-icon-btn)')||layer.el).focus?.({preventScroll:true}),60)}
function popLayer(){const l=LAYERS.pop();if(!l)return;l.el.dataset.open='false';l.el.style.transform='';l.el.dataset.drag='false';
 if(!LAYERS.some(x=>x.kind==='sheet'))scrim.dataset.open='false';
 setTimeout(()=>{if(l.el.dataset.open==='false')l.el.hidden=true},LAYER_ANIM_MS);if(!LAYERS.length)lock(false);
 l.onClose?.();l.opener?.focus?.({preventScroll:true})}
const CONFIRM={fn:null};
function sheetGuard(){if(sheetMode==='form'&&D.dirty){confirmDialog({title:'ทิ้งการเปลี่ยนแปลง?',msg:'สิ่งที่กรอกไว้จะหายไป',keep:'กลับไปแก้',ok:'ทิ้ง',fn:()=>{D.dirty=false;closeTop()}});return true}return false}
function closeTop(){const l=LAYERS[LAYERS.length-1];if(!l)return;if(l.guard?.())return;if(l.pushed){history.back()}else popLayer()}
addEventListener('popstate',()=>{const l=LAYERS[LAYERS.length-1];if(!l)return;if(l.guard?.()){try{history.pushState({ev:LAYERS.length},'')}catch(e){console.warn('history',e)}return}popLayer()});
scrim.addEventListener('click',closeTop);
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!pop.hidden)closePop();else closeTop()}
 if(e.key==='Tab'&&LAYERS.length){const el=LAYERS[LAYERS.length-1].el,f=[...el.querySelectorAll('button:not([disabled]),input,select,[tabindex="0"]')].filter(x=>x.offsetParent);
  if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
function setSheet(title,body,o={}){sheet.innerHTML=`<div class="ev-grab" data-drag></div><h2 data-drag>${o.back?`<button class="ev-icon-btn" data-flat data-act="dback" aria-label="ย้อนกลับ">${icon('back')}</button>`:''}<span id="sheetTitle" class="grow">${esc(title)}</span><button class="ev-icon-btn" data-flat data-act="close" aria-label="ปิด">${icon('x')}</button></h2><div class="ev-sheet-body" id="sheetBody">${body}</div>${o.foot?`<div class="ev-sheet-foot">${o.foot}</div>`:''}`}
function openSheet(title,body,o={}){setSheet(title,body,o);pushLayer({kind:'sheet',el:sheet,onClose:()=>{sheetMode='';o.onClose?.()},guard:sheetGuard})}
function openDialog(html){dialog.innerHTML=`<div class="ev-dialog-card">${html}</div>`;pushLayer({kind:'dialog',el:dialog})}
function confirmDialog(o){CONFIRM.fn=o.fn;openDialog(`<h3>${o.title}</h3><p class="ev-sub">${o.msg}</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="close">${o.keep||'ยกเลิก'}</button><button class="${o.tone==='primary'?'ev-btn-primary':'ev-btn-solid-danger'}" data-act="cf-ok">${o.ok}</button></div>`)}
dialog.addEventListener('click',e=>{if(e.target===dialog)closeTop()});
function openPage(html,onClose){page.innerHTML=html;pushLayer({kind:'page',el:page,onClose})}
/* ลากปิด sheet (pointer events + ความเร็ว) */
let drag=null;
sheet.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-drag]')||e.target.closest('button'))return;drag={y:e.clientY,t:performance.now(),dy:0};sheet.setPointerCapture(e.pointerId);sheet.dataset.drag='true'});
sheet.addEventListener('pointermove',e=>{if(!drag)return;drag.dy=Math.max(0,e.clientY-drag.y);sheet.style.transform=`translateY(${drag.dy}px)`;scrim.style.opacity=String(1-Math.min(1,drag.dy/sheet.offsetHeight))});
const endDrag=()=>{if(!drag)return;const v=drag.dy/(performance.now()-drag.t),far=drag.dy>DRAG_CLOSE_PX||v>DRAG_CLOSE_V;drag=null;sheet.dataset.drag='false';scrim.style.opacity='';if(far)closeTop();else sheet.style.transform=''};
sheet.addEventListener('pointerup',endDrag);sheet.addEventListener('pointercancel',endDrag);

/* ===== MODULE: ui/popover (dropdown) ===== */
let popBtn=null;
function closePop(){if(pop.hidden)return;pop.dataset.open='false';popBtn?.setAttribute?.('aria-expanded','false');popBtn=null;setTimeout(()=>{if(pop.dataset.open==='false')pop.hidden=true},170)}
function openPop(anchor,items,o={}){if(popBtn===anchor){closePop();return}closePop();popBtn=anchor;anchor.setAttribute?.('aria-expanded','true');
 pop.innerHTML=items.map(m=>m==='-'?'<hr>':`<button role="menuitem" data-act="${m.act}" data-id="${esc(m.id??'')}" ${m.tone?`data-tone="${m.tone}"`:''}>${icon(m.icon)}<span>${m.label}</span>${m.hint?`<small>${m.hint}</small>`:''}</button>`).join('');
 pop.hidden=false;const r=anchor.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight,vw=innerWidth,vh=innerHeight;
 let left=o.align==='right'?r.right-w:o.align==='center'?r.left+r.width/2-w/2:r.left;left=Math.max(8,Math.min(vw-w-8,left));
 const below=o.prefer!=='up'&&r.bottom+6+h<vh-8,top=below?r.bottom+6:Math.max(8,r.top-h-8);
 pop.style.left=left+'px';pop.style.top=top+'px';pop.style.transformOrigin=`${below?'top':'bottom'} ${o.align==='right'?'right':o.align==='center'?'center':'left'}`;void pop.offsetWidth;pop.dataset.open='true'}
document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!e.target.closest('#pop')&&!(popBtn&&popBtn.contains(e.target)))closePop()});
addEventListener('scroll',closePop,true);addEventListener('resize',closePop);

/* ===== MODULE: ui/primitives ===== */
const icon=n=>`<svg class="ev-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
const empty=(ic,t,h)=>`<div class="ev-empty"><div class="orb">${icon(ic)}</div><h3>${t}</h3><p>${h}</p></div>`;
const skeleton=()=>`<div class="ev-main" style="padding-top:var(--s4)"><div class="ev-skeleton"></div><div class="ev-skeleton"></div><div class="ev-skeleton"></div></div>`;
const header=(sub,title)=>`<header class="ev-header"><span class="ev-sub">${sub}</span><div class="ev-row" style="gap:10px"><button class="ev-ai-pill" data-act="ai" aria-label="ผู้ช่วย AI">${icon('chat')}ถาม AI</button><button class="ev-avatar" data-act="settings" aria-label="ตั้งค่า">J</button></div></header><h1 class="ev-title">${title}</h1>`;
const pills=(act,opts,cur)=>`<div class="ev-filters" role="group">${opts.map(([k,l])=>`<button aria-pressed="${cur===k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
function itemRow(it,ds,i,opts={}){const v=val(it,ds),tg=target(it),done=tracked(it)&&isDone(it,ds),multi=it.track==='count'||it.track==='timer',fut=isFuture(ds),sk=skipped(it,ds);
 const lead=it.track==='check'?`<button class="ev-check" role="checkbox" aria-checked="${done}" aria-label="ทำแล้ว: ${esc(it.title)}" data-act="check" data-id="${it.id}" data-date="${ds}" ${UI.pop==it.id&&done?'data-pop="true"':''} ${fut?'disabled':''}>${icon('check')}</button>`:`<span class="ev-badge">${icon(it.track==='timer'?'clock':it.track==='count'?'chart':it.type==='event'?'bell':'cal')}</span>`;
 const tail=it.track==='count'?`<div class="ev-step"><button data-act="dec" data-id="${it.id}" data-date="${ds}" aria-label="ลด" ${v<=0||fut?'disabled':''}>−</button><button data-act="inc" data-id="${it.id}" data-date="${ds}" aria-label="เพิ่ม" ${fut?'disabled':''}>+</button></div>`
  :it.track==='timer'?`<button class="ev-mini" data-tone="solid" data-act="timeropen" data-id="${it.id}" data-date="${ds}" aria-label="จับเวลา">${icon('play')}</button>`:'';
 const sub=[opts.late?`เลยกำหนด ${fmtDate(it.start)}`:'',timeText(it),multi?`${v}/${tg} ${esc(it.unitName)}`:esc(it.subject),sk?'ข้ามวันนี้':''].filter(Boolean).join(' · ');
 return `<li class="ev-list-item" style="--i:${i}" data-state="${done?'done':'todo'}" ${opts.next?'data-next="true"':''}>${lead}<div class="grow" role="button" tabindex="0" data-act="open" data-id="${it.id}" data-date="${ds}"><b>${esc(it.title)}</b><span class="ev-sub">${sub}</span>${multi?`<div class="ev-bar"><i data-full="${v>=tg}" data-k="b-${it.id}-${ds}" data-to="${Math.min(100,Math.round(v/tg*100))}"></i></div>`:''}</div>${tail}</li>`}

/* ===== MODULE: views ===== */
const VIEWS={
 today(){const ds=UI.date,list=onDate(ds),tr=list.filter(tracked),done=tr.filter(it=>isDone(it,ds)).length,p=tr.length?Math.round(100*done/tr.length):0,od=ds===TODAY?overdue():[];
  const start=addDays(new Date(),-new Date().getDay()+7*UI.weekOff),week=Array.from({length:7},(_,i)=>ymd(addDays(start,i)));
  const nextId=ds===TODAY?(list.find(it=>it.time&&it.time>=nowHM()&&!(tracked(it)&&isDone(it,ds))))?.id:null;const nextIt=list.find(it=>it.id===nextId);let idx=0;
  const groups=PERIODS.map((n,g)=>[n,list.filter(it=>periodOf(it)===g)]).filter(([,l])=>l.length);
  const hello=ds===TODAY?(()=>{const h=new Date().getHours();return h<12?'สวัสดีตอนเช้า':h<17?'สวัสดีตอนบ่าย':'สวัสดีตอนเย็น'})():fmtDate(ds);
  return `${header(fmtDate(ds),ds===TODAY?hello:'ย้อนดู/วางแผน')}
  <div class="ev-weekbar"><b>${TH_MONTH[parse(week[3]).getMonth()]} ${parse(week[3]).getFullYear()+543}</b><div class="ev-row" style="gap:4px">${UI.date!==TODAY||UI.weekOff?'<button class="ev-chip-btn" data-act="today">วันนี้</button>':''}<button class="ev-icon-btn" data-flat data-act="wk" data-id="-1" aria-label="สัปดาห์ก่อน">${icon('back')}</button><button class="ev-icon-btn ev-flip" data-flat data-act="wk" data-id="1" aria-label="สัปดาห์ถัดไป">${icon('back')}</button></div></div>
  <div class="ev-week" role="group" aria-label="เลือกวัน" data-dir="${UI.weekDir}">${week.map(d=>`<button aria-pressed="${UI.date===d}" data-today="${d===TODAY}" data-act="date" data-id="${d}">${WD[parse(d).getDay()]}<b>${parse(d).getDate()}</b></button>`).join('')}</div>
  <main class="ev-main" id="main"><section class="ev-card ev-sum" data-tone="ink"><div class="ev-sum-top"><div><div class="ev-sum-num"><span data-count="${done}">0</span><small>/${tr.length}</small></div><div class="ev-sum-lab">${tr.length?(done===tr.length?'ครบทุกอย่างแล้ว':'ทำแล้ววันนี้'):'วันนี้ไม่มีสิ่งต้องติ๊ก'}</div></div><div class="ev-sum-lab">${p}%</div></div><div class="ev-prog"><i data-k="p-today" data-to="${p}"></i></div>${nextIt?`<div class="ev-next"><span class="ev-chip">ถัดไป</span>${nextIt.time} · ${esc(nextIt.title)}</div>`:''}</section>
  ${od.length?`<section class="ev-card" data-tone="warn"><b>ค้างอยู่ ${od.length} งาน</b><ul>${od.map((it,i)=>itemRow(it,it.start,i,{late:true})).join('')}</ul></section>`:''}
  <section class="ev-card">${list.length?groups.map(([n,l])=>`<h3 class="ev-group">${n}</h3><ul>${l.map(it=>itemRow(it,ds,idx++,{next:it.id===nextId})).join('')}</ul>`).join(''):empty('inbox','วันนี้ยังว่างอยู่','กดปุ่ม + เพื่อเพิ่มสิ่งที่อยากทำ')}</section></main>`},
 all(){const types=UI.type==='all'?Object.keys(TYPES):[UI.type];
  const row=it=>`<li class="ev-list-item"><span class="ev-badge">${icon(typeIcon(it))}</span><div class="grow" role="button" tabindex="0" data-act="detail" data-id="${it.id}"><b>${esc(it.title)}</b><span class="ev-sub">${repeatText(it)}${it.time?` · ${timeText(it)}`:''}</span></div>${icon('chev')}</li>`;
  const sec=k=>{const g=S.items.filter(it=>it.type===k);return g.length?`<section class="ev-card"><div class="ev-sec-head"><h3 class="ev-group">${TYPES[k]}<span>${g.length}</span></h3><button class="ev-link-btn" data-act="add-type" data-id="${k}" aria-label="เพิ่ม${TYPES[k]}">${icon('plus')}</button></div><ul>${g.map(row).join('')}</ul></section>`:''};
  const body=types.map(sec).join('');
  return `${header(`${S.items.length} รายการที่ตั้งไว้`,'รายการ')}${pills('type',[['all','ทั้งหมด'],...Object.entries(TYPES)],UI.type)}<main class="ev-main">${body||`<section class="ev-card">${empty('inbox','ยังไม่มีรายการ','กดปุ่ม + เพื่อสร้างรายการแรก')}</section>`}</main>`},
 calendar(){const isM=UI.calView==='dayGridMonth';
  return `${header('ทุกอย่างในที่เดียว','ปฏิทิน')}<div class="ev-main" style="padding-bottom:12px"><div class="ev-cal-top"><div class="ev-row" style="gap:2px"><button class="ev-icon-btn" data-flat data-act="cal-nav" data-id="prev" aria-label="ก่อนหน้า">${icon('back')}</button><b id="calTitle" class="ev-cal-title">&nbsp;</b><button class="ev-icon-btn ev-flip" data-flat data-act="cal-nav" data-id="next" aria-label="ถัดไป">${icon('back')}</button></div><button class="ev-chip-btn" data-act="cal-nav" data-id="today">วันนี้</button></div>${seg('cal-view',[['dayGridMonth','เดือน'],['timeGridWeek','สัปดาห์']],UI.calView)}</div>
  <main class="ev-main"><section class="ev-card ev-fc-wrap"><div id="fcMain"></div></section><div id="agenda">${isM?agendaHTML(UI.calSel):''}</div></main>`},
 stats(){const hs=habits(),isM=UI.period==='month',days=isM?28:7;
  if(!hs.length)return `${header('ความต่อเนื่องของคุณ','สถิติ')}<main class="ev-main">${empty('chart','ยังไม่มีกิจวัตร','สร้างกิจวัตรเพื่อดูสถิติและ streak')}</main>`;
  const per=hs.map(h=>[h,periodStats(h,days)]),T=per.reduce((n,[,s])=>n+s.t,0),K=per.reduce((n,[,s])=>n+s.ok,0),rate=T?Math.round(100*K/T):0,best=Math.max(0,...hs.map(streak));
  const td=hs.filter(h=>occursOn(h,TODAY)&&!skipped(h,TODAY)),tdDone=td.filter(h=>isDone(h,TODAY)).length,cols=chartData();
  const lv=r=>r>=80?'hi':r>=50?'mid':'lo';
  const row=([h,s])=>{const r=s.t?Math.round(100*s.ok/s.t):0,st=streak(h);return `<li class="ev-list-item"><div class="grow" role="button" tabindex="0" data-act="detail" data-id="${h.id}"><b>${esc(h.title)}</b><span class="ev-sub">${s.t?`ทำ ${s.ok} จาก ${s.t} ครั้ง`:'ไม่มีกำหนดในช่วงนี้'}${st?` · ต่อเนื่อง ${st} วัน`:''}</span><div class="ev-bar"><i data-full="${r>=100}" data-k="sb-${h.id}-${UI.period}" data-to="${r}"></i></div></div><span class="ev-pct" data-lv="${s.t?lv(r):''}">${s.t?r+'%':'–'}</span>${icon('chev')}</li>`};
  return `${header('ความต่อเนื่องของคุณ','สถิติ')}<div class="ev-main" style="padding-bottom:12px">${seg('period',[['week','7 วันล่าสุด'],['month','4 สัปดาห์ล่าสุด']],UI.period)}</div>
  <main class="ev-main"><section class="ev-card ev-sum ev-sum-row" data-tone="ink"><div class="ev-ringbox"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ev-arc-bg" cx="50" cy="50" r="42"/><circle class="ev-arc" data-kind="arc" data-k="ring-${UI.period}" data-to="${rate}" cx="50" cy="50" r="42" stroke-dasharray="${ARC_C}" stroke-dashoffset="${ARC_C}"/></svg><div class="ev-ringnum"><span><span data-count="${rate}">0</span><small>%</small></span></div></div>
   <div><div style="font-size:18px;font-weight:600;line-height:1.35">ทำแล้ว ${K} จาก ${T} ครั้ง</div><div class="ev-sum-lab" style="margin-top:4px">ที่ตั้งไว้ใน${isM?' 4 สัปดาห์':' 7 วัน'}ที่ผ่านมา</div></div></section>
  <div class="ev-row2"><section class="ev-card"><div class="ev-sub">ต่อเนื่องสูงสุด</div><div class="ev-big"><span data-count="${best}">0</span><small> วัน</small></div></section><section class="ev-card"><div class="ev-sub">วันนี้ทำแล้ว</div><div class="ev-big"><span data-count="${tdDone}">0</span><small> / ${td.length}</small></div></section></div>
  <section class="ev-card"><h3 class="ev-group" style="padding-top:0">${isM?'รายสัปดาห์':'รายวัน'}</h3><p class="ev-sub">ความสูง = % ที่ทำสำเร็จ${isM?'ในสัปดาห์นั้น (เริ่มวันที่ใต้แท่ง)':'ในวันนั้น'}</p><div class="ev-chart">${cols.map((c,i)=>`<div class="ev-col" data-today="${c.today}" data-empty="${!c.t}"><span class="ev-col-v">${c.t?c.pct+'%':'–'}</span><div class="ev-col-track"><i data-kind="col" data-k="col-${UI.period}-${i}" data-to="${c.pct}"></i></div><span class="ev-col-l">${c.label}</span></div>`).join('')}</div></section>
  <section class="ev-card"><h3 class="ev-group" style="padding-top:0">รายกิจวัตร · แตะเพื่อดูปฏิทิน</h3><ul>${per.map(row).join('')}</ul></section></main>`}};

/* ===== MODULE: ui/form (เพิ่ม/แก้ไข) — ขั้นที่ 1 เลือกประเภท, ขั้นที่ 2 กรอกเฉพาะที่จำเป็น ตัวเลือกขั้นสูงพับเก็บ ===== */
let D={};
const TYPE_INFO={habit:['clock','ทำซ้ำเป็นประจำ เช่น ดื่มน้ำ อ่านหนังสือ'],task:['tasks','มีวันส่ง เช่น การบ้าน รายงาน'],event:['bell','นัดหมายที่มีเวลาเริ่มและจบ'],class:['cal','คาบเรียนประจำสัปดาห์']};
const startBase=()=>{const d=UI.tab==='calendar'?UI.calSel:UI.date;return d>=TODAY?d:TODAY};
const newDraft=t=>({id:null,step:'form',open:'',type:t,title:'',subject:'',start:startBase(),end:'',endMode:'never',time:'',timeEnd:'',unit:t==='habit'?'day':'none',every:1,days:[],track:'check',target:1,unitName:'',rem:[{k:'before',m:0}],err:''});
const draftFrom=it=>({id:it.id,step:'form',open:'',type:it.type,title:it.title,subject:it.subject,start:it.start,end:it.end,endMode:it.end?'date':'never',time:it.time,timeEnd:it.timeEnd,unit:it.repeat.unit,every:it.repeat.every,days:[...it.repeat.days],track:it.track==='none'?'check':it.track,target:it.target,unitName:it.unitName,rem:it.rem.map(r=>({...r})),err:''});
const seg=(act,o,cur)=>`<div class="ev-seg">${o.map(([k,l])=>`<button type="button" aria-pressed="${cur===k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
const chips=(act,o,arr)=>`<div class="ev-filters ev-wrap">${o.map(([k,l])=>`<button type="button" aria-pressed="${arr.includes(k)}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
const SR=(l,v,k)=>`<button type="button" class="ev-set-row" data-act="dopen" data-id="${k}" aria-expanded="${D.open===k}"><span>${l}</span><small>${v}${icon('chev')}</small></button>`;
const PN=(k,h)=>`<div class="ev-panel" data-key="${k}" data-open="${D.open===k}"><div><div class="ev-panel-in">${h}</div></div></div>`;
const IR=(l,h)=>`<div class="ev-set-row"><span>${l}</span>${h}</div>`;
const ri=(n,t)=>`<input class="ev-row-input" name="${n}" type="${t}" value="${esc(D[n]??'')}" aria-label="${n}">`;
const stepper=(l,act,v,u)=>`<div class="ev-stepper"><span>${l}</span><div class="ev-step"><button type="button" data-act="${act}" data-id="-1" aria-label="ลด" ${v<=1?'disabled':''}>−</button><b>${v}</b><button type="button" data-act="${act}" data-id="1" aria-label="เพิ่ม">+</button></div>${u}</div>`;
const everyTxt=()=>D.every>1?`ทุก ${D.every} `:'ทุก';
const repSum=()=>D.unit==='none'?'ไม่ซ้ำ':D.unit==='week'?`${everyTxt()}สัปดาห์${D.days.length?` · ${[...D.days].sort().map(d=>WD[d]).join(' ')}`:''}`:`${everyTxt()}${UNIT_TH[D.unit]}`;
const remSum=()=>D.rem.length?D.rem.slice(0,2).map(remText).join(', ')+(D.rem.length>2?` +${D.rem.length-2}`:''):'ไม่เตือน';
const rangeSum=()=>`${D.start===TODAY?'เริ่มวันนี้':`เริ่ม ${D.start}`} · ${D.endMode==='date'&&D.end?`ถึง ${D.end}`:'ไม่สิ้นสุด'}`;
const repPanel=()=>seg('dunit',[['none','ไม่ซ้ำ'],['day','วัน'],['week','สัปดาห์'],['month','เดือน']],D.unit)+(D.unit==='none'?'':stepper('ทุก ๆ','devery',D.every,`<span>${UNIT_TH[D.unit]}</span>`))+(D.unit==='week'?chips('dday',WEEK_OPTS,D.days):'');
const rangePanel=lab=>`<div class="ev-stepper"><span>${lab}</span>${ri('start','date')}</div><div class="ev-stepper"><span>มีวันสิ้นสุด</span><button type="button" class="ev-switch" role="switch" aria-checked="${D.endMode==='date'}" data-act="dend" aria-label="มีวันสิ้นสุด"></button></div>${D.endMode==='date'?`<div class="ev-stepper"><span>สิ้นสุดวันที่</span>${ri('end','date')}</div>`:''}`;
const remPanel=()=>{const at=D.rem.filter(r=>r.k==='at');return chips('drem',REM_PRESETS.map(m=>[m,remText({k:'before',m})]),D.rem.filter(r=>r.k==='before').map(r=>r.m))
 +(at.length?`<div class="ev-rem">${at.map(r=>`<span class="ev-rem-tag">${r.t} น.<button type="button" data-act="remdel" data-id="${r.t}" aria-label="ลบการเตือน ${r.t}">${icon('x')}</button></span>`).join('')}</div>`:'')
 +`<div class="ev-stepper"><span>เตือนตามเวลา</span><div class="ev-row" style="gap:8px"><input class="ev-row-input" type="time" id="remTime" aria-label="เวลาเตือน"><button type="button" class="ev-btn-ghost ev-btn-sm" data-act="remadd">เพิ่ม</button></div></div>`};
const SET=h=>`<div class="ev-set">${h}</div>`;
const remRow=()=>SR('เตือน',remSum(),'rem')+PN('rem',remPanel());
function formBody(){const T=D.type,multi=D.track!=='check',ph={habit:'เช่น ดื่มน้ำ',task:'เช่น การบ้านคณิต',event:'เช่น ประชุมชมรม',class:'ชื่อวิชา'}[T];
 let h=`<input class="ev-title-input" name="title" value="${esc(D.title)}" placeholder="${ph}" maxlength="80" aria-label="ชื่อ">${D.err?`<div class="ev-form-err" role="alert">${esc(D.err)}</div>`:''}`;
 if(T==='habit')h+=`<div class="ev-block"><span class="ev-cap">ติดตามผลแบบ</span>${seg('dtrack',TRACK_OPTS,D.track)}${multi?stepper('เป้าหมายต่อวัน','dtarget',D.target,`<input class="ev-unit" name="unitName" value="${esc(D.unitName)}" placeholder="${D.track==='timer'?'นาที':'หน่วย'}" maxlength="12" aria-label="หน่วย">`):''}</div>`
  +SET(IR('เวลา (ไม่บังคับ)',ri('time','time'))+SR('ทำซ้ำ',repSum(),'rep')+PN('rep',repPanel())+SR('ช่วงเวลา',rangeSum(),'range')+PN('range',rangePanel('เริ่มวันที่')))+SET(remRow());
 if(T==='task')h+=SET(IR('กำหนดส่ง',ri('start','date'))+IR('เวลา (ไม่บังคับ)',ri('time','time'))+IR('วิชา/หมวด',`<input class="ev-row-input" name="subject" value="${esc(D.subject)}" placeholder="ไม่บังคับ" maxlength="30" aria-label="วิชา">`))+SET(remRow());
 if(T==='event')h+=SET(IR('วันที่',ri('start','date'))+IR('เริ่ม',ri('time','time'))+IR('จบ',ri('timeEnd','time'))+SR('ทำซ้ำ',repSum(),'rep')+PN('rep',repPanel())+(D.unit!=='none'?SR('ช่วงเวลา',rangeSum(),'range')+PN('range',rangePanel('เริ่มวันที่')):''))+SET(remRow());
 if(T==='class')h+=`<div class="ev-block"><span class="ev-cap">วันที่เรียน</span>${chips('dday',WEEK_OPTS,D.days)}</div>`+SET(IR('เริ่ม',ri('time','time'))+IR('จบ',ri('timeEnd','time'))+SR('ภาคเรียน',rangeSum(),'range')+PN('range',rangePanel('เปิดเทอม')))+SET(remRow());
 return h}
const typeBody=()=>`<div class="ev-types">${Object.entries(TYPE_INFO).map(([k,[ic,d]])=>`<button class="ev-type" data-act="dtype" data-id="${k}"><span class="orb">${icon(ic)}</span><b>${TYPES[k]}</b><span class="d">${d}</span></button>`).join('')}</div>`;
function renderForm(){sheetMode='form';const y=$('sheetBody')?.scrollTop||0,isType=D.step==='type';
 const title=isType?'เพิ่มอะไรดี':`${D.id?'แก้ไข':'เพิ่ม'}${TYPES[D.type]}`,body=isType?typeBody():`<form class="ev-form" id="addForm" novalidate>${formBody()}</form>`;
 const o={back:!isType&&!D.id&&D.fromType,foot:isType?'':`<button class="ev-btn-primary ev-btn-block" type="submit" form="addForm">${D.id?'บันทึก':`เพิ่ม${TYPES[D.type]}`}</button>`};
 if(LAYERS.some(l=>l.el===sheet)){setSheet(title,body,o);$('sheetBody').scrollTop=y}else openSheet(title,body,o)}
const openForm=(type,it)=>{D=it?draftFrom(it):type?newDraft(type):{...newDraft('habit'),step:'type'};renderForm()};
function validate(){const T=D.type;if(!D.title.trim())return 'กรุณาใส่ชื่อรายการ';if(!D.start)return 'กรุณาเลือกวันที่';
 if(D.time&&D.timeEnd&&D.timeEnd<=D.time)return 'เวลาจบต้องหลังเวลาเริ่ม';if(D.endMode==='date'&&(!D.end||D.end<D.start))return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
 if(T==='class'&&!D.days.length)return 'เลือกวันที่เรียนอย่างน้อย 1 วัน';return ''}
function buildItem(){const T=D.type,old=D.id?find(D.id):null,week=T==='class'||D.unit==='week',days=week?(D.days.length?[...D.days]:[parse(D.start).getDay()]):[];
 const unit=T==='task'?'none':T==='class'?'week':D.unit,multi=T==='habit'&&D.track!=='check';
 return mk({id:D.id||Date.now(),type:T,title:D.title.trim(),subject:(D.subject||'').trim(),start:D.start,end:D.endMode==='date'&&unit!=='none'?D.end:'',time:D.time,timeEnd:T==='task'||T==='habit'?'':D.timeEnd,
  rem:D.rem.slice(0,MAX_REM).map(r=>({...r})),repeat:{unit,every:Math.max(1,Math.round(+D.every||1)),days},track:T==='habit'?D.track:T==='task'?'check':'none',target:multi?Math.max(1,Math.round(+D.target||1)):1,unitName:multi?(D.unitName||'').trim():'',log:old?old.log:{},skip:old?old.skip:{}})}

/* ===== MODULE: core/timer (ทนรีเฟรช: เก็บ timestamp) ===== */
let TM=(()=>{try{return JSON.parse(localStorage.getItem(TIMER_KEY))}catch(e){console.warn('timer load',e);return null}})();
const saveTM=()=>{try{TM?localStorage.setItem(TIMER_KEY,JSON.stringify(TM)):localStorage.removeItem(TIMER_KEY)}catch(e){console.warn('timer save',e)}};
const tmMs=()=>TM?TM.acc+(TM.startedAt?Date.now()-TM.startedAt:0):0;
let focusId=null;
function focusBody(it){const mine=TM&&TM.id==it.id,run=mine&&!!TM.startedAt,ms=mine?tmMs():0,goal=it.target*60000,base=val(it,mine?TM.date:UI.fdate)*60000,p=Math.min(100,(base+ms)/goal*100);
 const btn=(a,ic,l,big)=>`<div style="display:grid;gap:6px;justify-items:center"><button class="ev-round" ${big?'data-big="true"':''} data-act="${a}" data-id="${it.id}" aria-label="${l}">${icon(ic)}</button><span class="ev-sub">${l}</span></div>`;
 const acts=!mine?btn('tstart','play','เริ่ม',true):run?btn('tpause','pause','หยุดชั่วคราว',true)+btn('tfinish','stop','จบและบันทึก'):btn('tresume','play','ต่อ',true)+btn('tfinish','stop','จบและบันทึก');
 return `<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>จับเวลา</h2>${mine?`<button class="ev-btn-danger ev-btn-sm" data-act="tcancel">ยกเลิก</button>`:''}</div>
 <div class="ev-page-scroll" style="text-align:center"><div><h1 class="ev-title" style="padding:0">${esc(it.title)}</h1><p class="ev-sub">เป้าหมาย ${it.target} ${esc(it.unitName||'นาที')} · ${dayLab(UI.fdate)}ทำแล้ว ${val(it,UI.fdate)}</p></div>
 <div class="ev-dial" id="dial" data-run="${run}" style="--p:${p}"><div class="ev-dial-face"><div class="ev-digits" id="digits">${fmtClock(ms)}</div><span class="ev-sub">${!mine?'พร้อมเริ่ม':run?'กำลังจับเวลา':'หยุดชั่วคราว'}</span></div></div><div class="ev-focus-actions">${acts}</div>
 <p class="ev-sub">ปิดแอปแล้วเวลายังเดินต่อ เพราะเก็บเวลาเริ่มไว้ ไม่ได้นับวินาทีในหน้านี้</p></div>`}
function openFocus(id){const it=find(id);if(!it)return;if(TM&&TM.id!=id){toast('มีตัวจับเวลาอื่นทำงานอยู่ ต้องจบก่อน');return openFocus(TM.id)}
 if(focusId!==null){page.innerHTML=focusBody(it);return}focusId=id;openPage(focusBody(it),()=>{focusId=null;updateLive()})}
const refreshFocus=()=>{const it=find(focusId);if(it)page.innerHTML=focusBody(it)};
function updateLive(){const l=$('live'),it=TM&&find(TM.id);if(!it||focusId!==null){l.dataset.show='false';return}l.dataset.show='true';l.dataset.run=String(!!TM.startedAt);l.dataset.id=it.id;
 l.innerHTML=`<i></i><span>${TM.startedAt?'กำลังจับเวลา':'หยุดชั่วคราว'} · ${esc(it.title)}</span><b>${fmtClock(tmMs())}</b>`}
function tick(){if(!TM)return;const it=find(TM.id);if(!it){TM=null;saveTM();return updateLive()}
 const d=$('digits');if(d&&focusId!==null){d.textContent=fmtClock(tmMs());$('dial').style.setProperty('--p',Math.min(100,(val(it,TM.date)*60000+tmMs())/(it.target*60000)*100))}else updateLive()}
setInterval(tick,1000);
function tmFinish(){const it=find(TM.id),mins=Math.round(tmMs()/60000),date=TM.date;TM=null;saveTM();
 if(!it)return;if(mins<1){toast('สั้นกว่า 1 นาที จึงไม่บันทึก');refreshFocus();return}
 commit(`บันทึก ${mins} นาที: ${it.title}`,()=>{it.log[date]=val(it,date)+mins});refreshFocus()}

/* ===== MODULE: views/ai (จำลอง — ของจริงต้องเรียกผ่าน Server เท่านั้น) + ประวัติแชท ===== */
const CHATS_KEY='evarel-chats-v3',SUGG=['สรุปวันนี้ให้หน่อย','เพิ่มงาน การบ้านอังกฤษ พรุ่งนี้ 18:00','เพิ่มกิจวัตร ยืดเส้น 07:00'],AI_TITLE_MAX=28,AI_REPLY_MS=750;
let CH=(()=>{try{const j=JSON.parse(localStorage.getItem(CHATS_KEY));return j&&Array.isArray(j.list)?j:{list:[],cur:null}}catch(e){console.warn('chat load',e);return {list:[],cur:null}}})();
const saveCH=()=>{try{localStorage.setItem(CHATS_KEY,JSON.stringify(CH))}catch(e){console.warn('chat save',e)}};
const curChat=()=>CH.list.find(c=>c.id===CH.cur)||null;
function aiReply(t){const m=t.match(/เพิ่ม(งาน|กิจวัตร|กิจกรรม|นัด)\s*(.*)/);
 if(m){const rest=m[2];let date=TODAY;if(/มะรืน/.test(rest))date=ymd(addDays(new Date(),2));else if(/พรุ่งนี้/.test(rest))date=ymd(addDays(new Date(),1));
  const tm=rest.match(/(\d{1,2})[:.](\d{2})/),time=tm&&HHMM.test(`${pad(tm[1])}:${tm[2]}`)?`${pad(tm[1])}:${tm[2]}`:'';
  const title=rest.replace(/มะรืนนี้|มะรืน|พรุ่งนี้|(\d{1,2})[:.](\d{2})/g,'').trim()||'รายการใหม่',type=m[1]==='งาน'?'task':m[1]==='กิจวัตร'?'habit':'event';
  return {text:'เข้าใจแล้ว ตรวจรายละเอียดก่อนเพิ่มนะ',card:{status:'pending',p:{type,title,start:date,time,repeat:type==='habit'?daily():{unit:'none',every:1,days:[]},track:type==='habit'||type==='task'?'check':'none'}}}}
 const tr=onDate(TODAY).filter(tracked),done=tr.filter(it=>isDone(it,TODAY)).length,nx=onDate(TODAY).find(it=>it.time&&it.time>=nowHM()&&!(tracked(it)&&isDone(it,TODAY))),od=overdue().length;
 return {text:`วันนี้ทำแล้ว ${done} จาก ${tr.length} รายการ${od?`\nมีงานค้าง ${od} งาน ควรเคลียร์ก่อน`:''}${nx?`\nถัดไป: ${nx.title} (${nx.time})`:'\nไม่มีรายการเหลือตามเวลาแล้ว'}`}}
const cardHTML=(m,i)=>{if(!m.card)return '';const p=m.card.p,st=m.card.status;return `<div class="ev-card" data-tone="soft" style="max-width:88%;animation:rise .35s var(--ease)"><b>${esc(p.title)}</b><p class="ev-sub">${TYPES[p.type]} · ${fmtDate(p.start)}${p.time?` · ${p.time}`:''}</p>
 ${st==='pending'?`<div class="ev-row" style="margin-top:12px;gap:8px"><button class="ev-btn-primary ev-btn-sm" data-act="ai-ok" data-id="${i}">ยืนยัน</button><button class="ev-btn-ghost ev-btn-sm" data-act="ai-edit" data-id="${i}">แก้ก่อน</button><button class="ev-btn-ghost ev-btn-sm" data-act="ai-no" data-id="${i}">ยกเลิก</button></div>`:`<span class="ev-chip" style="display:inline-block;margin-top:8px">${st==='added'?'เพิ่มแล้ว':'ยกเลิกแล้ว'}</span>`}</div>`};
const AI_MARK='<svg class="ev-ai-mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="5" fill="currentColor" stroke="none"/></svg>';
function aiBodyHTML(){const c=curChat();if(!c||!c.msgs.length)return `<div class="ev-ai-hello">${AI_MARK}<h3>มีอะไรให้ช่วยวันนี้</h3><div class="ev-sugg">${SUGG.map(s=>`<button data-act="sugg" data-id="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
 return `<div class="ev-chat">${c.msgs.map((m,i)=>m.who==='u'?`<div class="ev-bubble-user">${esc(m.text)}</div>`:`<div class="ev-bubble-ai">${esc(m.text)}</div>${cardHTML(m,i)}`).join('')}</div>`}
function aiRefresh(smooth){const sc=$('aiScroll');if(!sc)return;$('aiBody').innerHTML=aiBodyHTML();$('aiTitle').textContent=curChat()?.title||'AI';sc.scrollTo({top:sc.scrollHeight,behavior:smooth?'smooth':'auto'})}
function aiRenderDrawer(q=''){const box=$('drawerList');if(!box)return;const k=q.trim().toLowerCase(),list=CH.list.filter(c=>!k||c.title.toLowerCase().includes(k)||c.msgs.some(m=>m.text.toLowerCase().includes(k))).sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||b.t-a.t);
 if(!list.length){box.innerHTML=`<div class="ev-empty"><p>${k?'ไม่พบแชทที่ค้นหา':'ยังไม่มีประวัติแชท'}</p></div>`;return}
 let last='',h='';for(const c of list){const g=c.pinned?'ปักหมุด':'ล่าสุด';if(g!==last){h+=`<div class="ev-drawer-grp">${g}</div>`;last=g}
  h+=`<div class="ev-chat-row" data-cur="${c.id===CH.cur}"><button data-act="ai-open" data-id="${c.id}">${icon(c.pinned?'pin':'chat')}<b>${esc(c.title||'แชทใหม่')}</b></button><button class="ev-icon-btn" data-flat data-act="ai-opts" data-id="${c.id}" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวเลือกแชท">${icon('more')}</button></div>`}
 box.innerHTML=h}
const chatItems=id=>{const c=CH.list.find(x=>x.id==id);return [{act:'ai-pin',id,icon:'pin',label:c?.pinned?'เลิกปักหมุด':'ปักหมุด'},{act:'ai-rename',id,icon:'edit',label:'เปลี่ยนชื่อ'},'-',{act:'ai-delask',id,icon:'trash',label:'ลบแชท',tone:'danger'}]};
const aiPlusItems=[{act:'ai-q',id:'สรุปวันนี้ให้หน่อย',icon:'chart',label:'สรุปวันนี้'},{act:'ai-q',id:'เพิ่มงาน ',icon:'tasks',label:'เพิ่มงาน'},{act:'ai-q',id:'เพิ่มกิจวัตร ',icon:'clock',label:'เพิ่มกิจวัตร'}];
const aiSync=()=>{aiRefresh();aiRenderDrawer($('dSearch')?.value||'')};
const drawerOpen=on=>{const d=$('drawer');if(!d)return;d.dataset.open=String(on);$('dScrim').dataset.open=String(on);if(on)aiRenderDrawer($('dSearch').value)};
const aiAutosize=()=>{const t=$('aiText');if(!t)return;t.style.height='auto';t.style.height=Math.min(120,t.scrollHeight)+'px';$('aiForm').querySelector('.ev-send').dataset.empty=String(!t.value.trim())};
function openAI(){openPage(`<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="ai-hist" aria-label="เมนูแชท">${icon('list')}</button><h2 id="aiTitle" class="grow" role="button" tabindex="0" data-act="ai-curopts" aria-haspopup="menu" aria-label="ตัวเลือกแชทนี้">AI</h2><button class="ev-icon-btn" data-flat data-act="ai-new" aria-label="แชทใหม่">${icon('edit')}</button><button class="ev-icon-btn" data-flat data-act="close" aria-label="ปิด">${icon('x')}</button></div>
 <div class="ev-page-scroll" id="aiScroll"><div id="aiBody"></div></div>
 <form class="ev-composer" id="aiForm"><textarea id="aiText" rows="1" placeholder="ถาม AI…" aria-label="ข้อความถึง AI"></textarea><div class="ev-composer-bar"><button type="button" class="ev-plus" data-act="ai-plus" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวช่วยพิมพ์">${icon('plus')}</button><button class="ev-send" data-empty="true" aria-label="ส่ง">${icon('send')}</button></div></form>
 <div class="ev-drawer-scrim" id="dScrim" data-open="false" data-act="ai-hist"></div>
 <aside class="ev-drawer" id="drawer" data-open="false" aria-label="ประวัติแชท"><div class="ev-drawer-head"><h2>Evarel AI</h2><label class="ev-search">${icon('search')}<input id="dSearch" type="search" placeholder="ค้นหาแชท" aria-label="ค้นหาแชท"></label></div><div class="ev-drawer-list" id="drawerList"></div><div class="ev-drawer-foot"><button class="ev-avatar" data-act="settings" aria-label="ตั้งค่า">J</button><button class="ev-btn-ink" data-act="ai-new">${icon('plus')}แชทใหม่</button></div></aside>`);aiRefresh()}
function aiSend(text){text=text.trim();if(!text)return;let c=curChat();
 if(!c){c={id:Date.now(),title:text.slice(0,AI_TITLE_MAX),t:Date.now(),msgs:[]};CH.list.unshift(c);CH.cur=c.id}
 c.msgs.push({who:'u',text});c.t=Date.now();saveCH();aiRefresh(true);
 $('aiBody').firstElementChild?.insertAdjacentHTML('beforeend','<div class="ev-bubble-ai ev-typing" id="typing"><i></i><i></i><i></i></div>');$('aiScroll').scrollTo({top:$('aiScroll').scrollHeight,behavior:'smooth'});
 setTimeout(()=>{const r=aiReply(text);c.msgs.push({who:'a',...r});c.t=Date.now();saveCH();if(CH.cur===c.id)aiRefresh(true)},AI_REPLY_MS)}

/* ===== MODULE: views/settings ===== */
function notifInfo(){if(!('Notification' in window))return ['ไม่รองรับ','เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน'];const p=Notification.permission;return p==='granted'?['อนุญาตแล้ว','เครื่องนี้พร้อมรับการแจ้งเตือน']:p==='denied'?['ถูกปิดไว้','ต้องเปิดที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์']:['ยังไม่ได้ขอ','กดปุ่มเพื่อให้เครื่องนี้รับการแจ้งเตือนได้']}
const themeNow=()=>document.documentElement.dataset.theme||'auto';
function settingsHTML(){const [st,note]=notifInfo(),total=S.items.reduce((n,it)=>n+it.rem.length,0);
 return `<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>ตั้งค่า</h2></div><div class="ev-page-scroll">
 <section class="ev-card"><b>ธีม</b><div style="margin-top:12px">${seg('theme',[['auto','ตามเครื่อง'],['light','สว่าง'],['dark','มืด']],themeNow())}</div></section>
 <section class="ev-card"><div class="ev-stat"><div><b>การแจ้งเตือน</b><p class="ev-sub">${note}</p></div><span class="ev-chip">${st}</span></div>${'Notification' in window&&Notification.permission==='default'?'<button class="ev-btn-primary ev-btn-block" style="margin-top:12px" data-act="notify">อนุญาตการแจ้งเตือน</button>':''}
  <p class="ev-sub" style="margin-top:12px">ตั้งเวลาเตือนไว้ ${total} รายการ เตือนเฉพาะเวลาที่คุณตั้งเท่านั้น เดโมบันทึกค่าไว้แต่ <b>ยังไม่เด้งจริง</b> ต้องเชื่อมระบบ Push จากฝั่ง Server</p></section>
 <section class="ev-card"><b>ข้อมูลของคุณ</b><p class="ev-sub">ข้อมูลเก็บในเครื่องนี้เท่านั้น ล้างข้อมูลเบราว์เซอร์แล้วจะหาย</p><div class="ev-form" style="margin-top:12px"><button class="ev-btn-ghost ev-btn-block" data-act="export">ดาวน์โหลดไฟล์สำรอง</button><button class="ev-btn-ghost ev-btn-block" data-act="import">นำเข้าจากไฟล์</button><button class="ev-btn-danger ev-btn-block" data-act="reset-ask">รีเซ็ตข้อมูลทั้งหมด</button></div><input type="file" id="importFile" accept="application/json,.json" hidden></section></div>`}
function exportData(){const url=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`evarel-backup-${TODAY}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('สร้างไฟล์สำรองแล้ว')}
function importData(file){const fr=new FileReader();fr.onerror=()=>toast('อ่านไฟล์ไม่สำเร็จ');fr.onload=()=>{try{const j=JSON.parse(fr.result);if(!Array.isArray(j.items))throw new Error('no items');
 const items=j.items.filter(x=>x&&TYPES[x.type]&&typeof x.title==='string'&&x.id!=null).map(x=>mk({...x,repeat:{unit:'none',every:1,days:[],...x.repeat},log:{...x.log},skip:{...x.skip},rem:Array.isArray(x.rem)?x.rem:[]}));
 if(!items.length)throw new Error('empty');confirmDialog({title:'แทนที่ข้อมูลปัจจุบัน?',msg:`ไฟล์นี้มี ${items.length} รายการ ข้อมูลที่มีอยู่จะถูกแทนที่`,ok:'แทนที่',fn:()=>commit(`นำเข้า ${items.length} รายการแล้ว`,()=>{S.items=items})})}catch(err){console.warn('import',err);toast('ไฟล์ไม่ถูกต้อง นำเข้าไม่ได้')}};fr.readAsText(file)}
function applyTheme(t){t==='auto'?document.documentElement.removeAttribute('data-theme'):document.documentElement.dataset.theme=t;try{localStorage.setItem(THEME_KEY,t)}catch(e){console.warn('theme',e)}}
try{const t=localStorage.getItem(THEME_KEY);if(t&&t!=='auto')applyTheme(t)}catch(e){console.warn('theme load',e)}

/* ===== MODULE: services/calendar (FullCalendar · จุดต่อ backend: ฟังก์ชัน events ด้านล่างเปลี่ยนเป็น fetch ตามช่วงวันได้) ===== */
const FCS={main:null,habit:null};
function destroyCal(k){try{FCS[k]?.destroy()}catch(err){console.warn('calendar destroy',err)}FCS[k]=null}
const addMin=(t,m)=>{const [h,mi]=t.split(':').map(Number),x=Math.min(h*60+mi+m,1439);return `${pad(Math.floor(x/60))}:${pad(x%60)}`};
function occurrenceEvents(start,end){const out=[];
 for(let d=new Date(start);d<end;d=addDays(d,1)){const ds=ymd(d);
  S.items.forEach(it=>{if(!scheduled(it,ds)||skipped(it,ds)||(it.type==='habit'&&!it.time))return;const done=tracked(it)&&isDone(it,ds),ev={id:`${it.id}_${ds}`,title:it.title,classNames:[`ev-fc-${it.type}`,...(done?['is-done']:[])],extendedProps:{itemId:it.id}};
   if(it.time){ev.start=`${ds}T${it.time}:00`;ev.end=`${ds}T${it.timeEnd||addMin(it.time,it.type==='habit'?30:60)}:00`}else{ev.start=ds;ev.allDay=true}out.push(ev)})}
 return out}
const dotsFor=ds=>{const ts=[...new Set(S.items.filter(it=>scheduled(it,ds)&&!skipped(it,ds)).map(it=>it.type))].slice(0,4);return ts.map(t=>`<i data-t="${t}"></i>`).join('')};
function mountCal(key,el,opts){destroyCal(key);if(typeof FullCalendar==='undefined'){el.innerHTML=`<div class="ev-error">${empty('cal','โหลดปฏิทินไม่สำเร็จ','ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')}<button class="ev-btn-ghost" data-act="retry">ลองใหม่</button></div>`;return null}
 const cal=new FullCalendar.Calendar(el,{headerToolbar:false,height:'auto',firstDay:0,fixedWeekCount:false,showNonCurrentDates:false,allDayText:'ทั้งวัน',nowIndicator:true,slotMinTime:'06:00:00',slotMaxTime:'22:00:00',slotDuration:'01:00:00',slotLabelFormat:{hour:'2-digit',minute:'2-digit',hour12:false},eventTimeFormat:{hour:'2-digit',minute:'2-digit',hour12:false},scrollTime:'07:00:00',expandRows:true,dayMaxEvents:false,
  dayHeaderContent:a=>a.view.type==='dayGridMonth'?WD[a.date.getDay()]:{html:`<div class="ev-fc-wk"><span>${WD[a.date.getDay()]}</span><b>${a.date.getDate()}</b></div>`},...opts});
 cal.render();FCS[key]=cal;return cal}
function mountMain(){const el=$('fcMain');if(!el)return;
 mountCal('main',el,{initialView:UI.calView,initialDate:UI.calDate||new Date(),events:(info,ok)=>ok(occurrenceEvents(info.start,info.end)),
  dayCellContent:a=>({html:`<span class="ev-dnum">${a.date.getDate()}</span><span class="ev-fcdots">${dotsFor(ymd(a.date))}</span>`}),
  dayCellClassNames:a=>{const ds=ymd(a.date);return [ds===TODAY&&'is-today',ds===UI.calSel&&'is-sel'].filter(Boolean)},
  dateClick:i=>{if(UI.calView==='dayGridMonth')selectDay(i.dateStr)},eventClick:i=>openDetail(i.event.extendedProps.itemId),
  datesSet:a=>{UI.calDate=a.view.currentStart;const s=a.view.currentStart,e=addDays(a.view.currentEnd,-1),t=$('calTitle');
   if(t)t.textContent=UI.calView==='dayGridMonth'?`${TH_MONTH[s.getMonth()]} ${s.getFullYear()+543}`:`${s.getDate()} ${TH_MON[s.getMonth()]} – ${e.getDate()} ${TH_MON[e.getMonth()]} ${e.getFullYear()+543}`}})}
function selectDay(ds){UI.calSel=ds;const el=$('fcMain');el?.querySelectorAll('.fc-daygrid-day.is-sel').forEach(x=>x.classList.remove('is-sel'));el?.querySelector(`.fc-daygrid-day[data-date="${ds}"]`)?.classList.add('is-sel');const box=$('agenda');if(box)box.innerHTML=agendaHTML(ds)}
function agendaHTML(ds){const list=onDate(ds);return `<section class="ev-card"><div class="ev-sec-head"><h3 class="ev-group">${dayLab(ds)}<span>${fmtDate(ds)}</span></h3></div>${list.length?`<ul>${list.map((it,i)=>itemRow(it,ds,i)).join('')}</ul>`:empty('inbox','ไม่มีรายการในวันนี้','กดปุ่ม + เพื่อเพิ่มรายการ')}</section>`}
function mountHabit(){const it=find(DETAIL),el=$('fcHabit');if(!el||!it||it.type!=='habit')return;
 mountCal('habit',el,{initialView:'dayGridMonth',initialDate:new Date(UI.cal.y,UI.cal.m,1),
  dayCellContent:a=>({html:`<span class="ev-dnum">${a.date.getDate()}</span>`}),dayCellClassNames:a=>['ev-fcday',`st-${dayState(it,ymd(a.date))}`],dateClick:i=>calDayTap(i.dateStr,i.dayEl)})}
function calDayTap(ds,el){if(LP.fired){LP.fired=false;return}const it=find(DETAIL);if(!it||!scheduled(it,ds)||ds>TODAY)return;
 if(it.track==='check'&&!skipped(it,ds)){const done=isDone(it,ds);commit(`${fmtDate(ds)}: ${done?'ยังไม่ทำ':'ทำแล้ว'}`,()=>{it.log[ds]=done?0:1});haptic()}else openPop(el,dayMenu(it,ds),{align:'center'})}

/* ===== MODULE: views/detail (ปฏิทินรายเดือน + แก้สถานะย้อนหลัง · เพิ่มประเภทใหม่ = เพิ่มใน DETAIL_BY_TYPE) ===== */
let DETAIL=null;const HIST_STEP_TIMER=5;
const TH_MONTH=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const dayLab=ds=>ds===TODAY?'วันนี้':ds===ymd(addDays(new Date(),-1))?'เมื่อวาน':ds===ymd(addDays(new Date(),1))?'พรุ่งนี้':fmtDate(ds);
const scheduled=(it,ds)=>ds>=it.start&&occursOn(it,ds);
function dayState(it,ds){if(!scheduled(it,ds))return 'off';if(skipped(it,ds))return 'skip';if(isDone(it,ds))return 'done';if(val(it,ds)>0)return 'part';if(ds>TODAY)return 'future';return ds===TODAY?'today':'miss'}
function detailHabit(it){const {y,m}=UI.cal,pad0=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),now=new Date(),isNow=y===now.getFullYear()&&m===now.getMonth();
 let t=0,ok=0;
 for(let d=1;d<=dim;d++){const ds=ymd(new Date(y,m,d)),st=dayState(it,ds);if(ds<=TODAY&&scheduled(it,ds)&&!skipped(it,ds)){t++;if(isDone(it,ds))ok++}}
 return `<section class="ev-card"><div class="ev-stats3"><div><b>${streak(it)}</b><span>วันต่อเนื่อง</span></div><div><b>${totalDone(it)}</b><span>ทำแล้วทั้งหมด (ครั้ง)</span></div><div><b>${t?Math.round(100*ok/t):0}%</b><span>เดือนนี้ (${ok}/${t})</span></div></div></section>
 <section class="ev-card"><div class="ev-cal-head"><button class="ev-icon-btn" data-flat data-act="cal-prev" aria-label="เดือนก่อน">${icon('back')}</button><b>${TH_MONTH[m]} ${y+543}</b><button class="ev-icon-btn ev-flip" data-flat data-act="cal-next" aria-label="เดือนถัดไป" ${isNow?'disabled':''}>${icon('back')}</button></div><div id="fcHabit"></div>
  <div class="ev-legend"><span><i data-state="done"></i>ทำแล้ว</span><span><i data-state="part"></i>ทำบางส่วน</span><span><i></i>ยังไม่ทำ</span><span><i data-state="off"></i>ไม่มีกำหนด</span></div><p class="ev-sub" style="margin-top:12px">${it.track==='check'?'แตะวันที่เพื่อติ๊ก/เลิกติ๊ก':'แตะวันที่เพื่อปรับจำนวน'} · กดค้างเพื่อตัวเลือกอื่น (ข้ามวัน)</p></section>`}
function detailTask(it){const done=isDone(it,it.start),late=!done&&it.start<TODAY;
 return `<section class="ev-card"><span class="ev-cap">สถานะ</span><div style="margin:10px 0 14px">${seg('h-task',[['0','ยังไม่เสร็จ'],['1','เสร็จแล้ว']],done?'1':'0')}</div>
  <div class="ev-list-item"><span class="ev-badge">${icon('cal')}</span><div class="grow"><b>กำหนดส่ง ${fmtDate(it.start)}</b><span class="ev-sub">${it.time||'ไม่ระบุเวลา'}${it.subject?` · ${esc(it.subject)}`:''}</span></div>${late?'<span class="ev-chip" data-state="late">เลยกำหนด</span>':done?'<span class="ev-chip" data-state="done">เสร็จแล้ว</span>':''}</div></section>`}
function detailSchedule(it){const next=[];for(let i=0;i<90&&next.length<5;i++){const ds=ymd(addDays(new Date(),i));if(occursOn(it,ds))next.push(ds)}
 return `<section class="ev-card"><h3 class="ev-group" style="padding-top:0">ครั้งถัดไป</h3>${next.length?`<ul>${next.map(ds=>`<li class="ev-list-item"><span class="ev-badge">${icon('cal')}</span><div class="grow"><b>${dayLab(ds)}</b><span class="ev-sub">${fmtDate(ds)}${it.time?` · ${timeText(it)}`:''}</span></div></li>`).join('')}</ul>`:empty('cal','ไม่มีครั้งถัดไป','รายการนี้สิ้นสุดแล้ว')}</section>`}
const DETAIL_BY_TYPE={habit:detailHabit,task:detailTask,event:detailSchedule,class:detailSchedule};
const metaCard=it=>`<section class="ev-card"><h3 class="ev-group" style="padding-top:0">การตั้งค่า</h3><div class="ev-meta"><span class="ev-chip">${TYPES[it.type]}</span><span class="ev-chip">${repeatText(it)}</span>${it.time?`<span class="ev-chip">${timeText(it)}</span>`:''}${it.rem.map(r=>`<span class="ev-chip">เตือน ${remText(r)}</span>`).join('')}</div><button class="ev-btn-ghost ev-btn-block" style="margin-top:14px" data-act="m-edit" data-id="${it.id}">แก้ไขการตั้งค่า</button></section>`;
const detailHTML=it=>`<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>${esc(it.title)}</h2><button class="ev-icon-btn" data-flat data-act="d-more" data-id="${it.id}" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวเลือก">${icon('more')}</button></div><div class="ev-page-scroll">${DETAIL_BY_TYPE[it.type](it)}${metaCard(it)}</div>`;
function openDetail(id){const it=find(id);if(!it)return;const n=new Date();UI.cal={y:n.getFullYear(),m:n.getMonth()};
 DETAIL=id;openPage(detailHTML(it),()=>{DETAIL=null;destroyCal('habit')});mountHabit()}
function refreshDetail(){if(DETAIL==null)return;const it=find(DETAIL);if(!it){DETAIL=null;if(LAYERS.some(l=>l.el===page))closeTop();return}
 const y=page.querySelector('.ev-page-scroll')?.scrollTop||0;page.innerHTML=detailHTML(it);const sc=page.querySelector('.ev-page-scroll');if(sc)sc.scrollTop=y;mountHabit()}
let DV=null;
function dayMenu(it,ds){const sk=skipped(it,ds),v=val(it,ds),tg=target(it),multi=it.track!=='check',done=isDone(it,ds),out=[];
 if(sk)return [{act:'dm-skip',id:`0|${ds}`,icon:'x',label:'เลิกข้าม'}];
 if(multi)out.push({act:'dm-set',id:`${tg}|${ds}`,icon:'check',label:`ทำครบเป้า (${tg} ${esc(it.unitName)})`,hint:done?'ปัจจุบัน':''},{act:'dm-num',id:ds,icon:'edit',label:'ปรับจำนวน…',hint:`${v}/${tg}`},{act:'dm-set',id:`0|${ds}`,icon:'x',label:'ล้างเป็น 0'});
 else out.push({act:'dm-set',id:`1|${ds}`,icon:'check',label:'ทำแล้ว',hint:done?'ปัจจุบัน':''},{act:'dm-set',id:`0|${ds}`,icon:'x',label:'ยังไม่ทำ',hint:done?'':'ปัจจุบัน'});
 if(!done)out.push('-',{act:'dm-skip',id:`1|${ds}`,icon:'skip',label:'ข้ามวันนี้ (ไม่นับเป็นพลาด)'});return out}
const dvStep=it=>it.track==='timer'?HIST_STEP_TIMER:1;
const dvHTML=it=>`<h3>${esc(it.title)}</h3><p class="ev-sub">${fmtDate(DV.ds)}</p><div class="ev-stepper" style="margin:14px 0 4px;justify-content:center;gap:22px"><div class="ev-step"><button data-act="dv-add" data-id="${-dvStep(it)}" aria-label="ลด">−</button></div><b id="dvNum" style="font-size:34px;min-width:64px">${DV.v}</b><div class="ev-step"><button data-act="dv-add" data-id="${dvStep(it)}" aria-label="เพิ่ม">+</button></div></div><p class="ev-sub" style="text-align:center">${esc(it.unitName)} · เป้า ${it.target}</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="close">ยกเลิก</button><button class="ev-btn-primary" data-act="dv-save">บันทึก</button></div>`;
const hApply=(fn)=>{const it=find(DETAIL);if(it)commit('',()=>fn(it),true);return NR};
const calMove=n=>{const c=UI.cal,d=new Date(c.y,c.m+n,1);UI.cal={y:d.getFullYear(),m:d.getMonth()};refreshDetail();return NR};

/* ===== MODULE: actions ===== */
const NR='nr',date=el=>el?.dataset.date||UI.date;
const bump=(id,n,d=UI.date)=>{const it=find(id);if(!it)return;const v=Math.max(0,val(it,d)+n);commit('',()=>{it.log[d]=v},true);haptic();return NR};
const aiMsg=id=>curChat()?.msgs[+id];
const closeAnyDrawer=()=>{const d=$('drawer');if(d&&d.dataset.open==='true'&&LAYERS[LAYERS.length-1]?.el===page){drawerOpen(false);return true}return false};
function itemMenu(it,ds){const id=it.id,can=tracked(it)&&occursOn(it,ds)&&!isFuture(ds),k=`${id}|${ds}`,out=[{act:'detail',id,icon:'chart',label:'ดูรายละเอียดและประวัติ'},{act:'m-edit',id,icon:'edit',label:'แก้ไข'},{act:'m-dup',id,icon:'copy',label:'ทำสำเนา'}];
 if(it.track==='timer')out.push({act:'timeropen',id,icon:'clock',label:'เปิดหน้าจับเวลา'});
 if(can&&val(it,ds)>0)out.push({act:'m-reset',id:k,icon:'x',label:`ล้างบันทึก (${dayLab(ds)})`});
 if(can&&it.type==='habit'&&!isDone(it,ds)&&!skipped(it,ds))out.push({act:'m-skip',id:k,icon:'skip',label:`ข้าม (${dayLab(ds)})`});
 if(can&&skipped(it,ds))out.push({act:'m-unskip',id:k,icon:'x',label:'ยกเลิกการข้าม'});
 out.push('-',{act:'m-delask',id,icon:'trash',label:'ลบ',tone:'danger'});return out}
function promptRename(id){const c=CH.list.find(x=>x.id==id);if(!c)return;openDialog(`<h3>เปลี่ยนชื่อแชท</h3><form id="renameForm" data-id="${id}" class="ev-form" novalidate><input class="ev-input" name="rname" value="${esc(c.title)}" maxlength="40" placeholder="ชื่อแชท" aria-label="ชื่อแชท" autofocus><div class="ev-dlg-actions" style="margin-top:0"><button type="button" class="ev-btn-ghost" data-act="close">ยกเลิก</button><button type="submit" class="ev-btn-primary">บันทึก</button></div></form>`);setTimeout(()=>dialog.querySelector('[name=rname]')?.select(),90)}
const ACTIONS={
 check:(id,el)=>{const it=find(id),d=date(el);if(!it||isFuture(d))return;UI.pop=isDone(it,d)?null:it.id;commit('',()=>{it.log[d]=isDone(it,d)?0:target(it)},true);haptic();UI.pop=null;return NR},
 inc:(id,el)=>bump(id,1,date(el)),dec:(id,el)=>bump(id,-1,date(el)),
 date:id=>{UI.date=id},type:id=>{UI.type=id},cday:id=>{UI.cday=+id},
 add:()=>{haptic();openForm(null);return NR},
 dtype:id=>{D={...newDraft(id),title:D.title,fromType:true};renderForm();setTimeout(()=>sheet.querySelector('.ev-title-input')?.focus({preventScroll:true}),80);return NR},
 dback:()=>{D.step='type';renderForm();return NR},
 open:(id,el)=>{const it=find(id),ds=date(el);if(it){UI.fdate=ds;openPop(el,itemMenu(it,ds),{align:'left'})}return NR},
 'm-edit':id=>{openForm(null,find(id));return NR},
 'm-dup':id=>{const it=find(id);it&&commit('',()=>S.items.push({...structuredClone(it),id:Date.now(),title:`${it.title} (สำเนา)`,log:{},skip:{}}),true);return NR},
 'm-reset':id=>{const [i,ds]=id.split('|'),it=find(i);if(it)commit('ล้างบันทึกแล้ว',()=>{it.log[ds]=0});return NR},
 'm-skip':id=>{const [i,ds]=id.split('|'),it=find(i);if(it)commit(`ข้ามแล้ว: ${it.title}`,()=>{it.skip[ds]=true});return NR},
 'm-unskip':id=>{const [i,ds]=id.split('|'),it=find(i);if(it)commit('ยกเลิกการข้ามแล้ว',()=>{delete it.skip[ds]});return NR},
 'm-delask':id=>{const it=find(id);if(it)confirmDialog({title:`ลบ “${esc(it.title)}” ?`,msg:'ประวัติและสถิติของรายการนี้จะหายไป',ok:'ลบ',fn:()=>commit(`ลบแล้ว: ${it.title}`,()=>{S.items=S.items.filter(x=>x.id!=id)})});return NR},
 timeropen:(id,el)=>{UI.fdate=el?.dataset.date||UI.fdate;openFocus(id);return NR},
 detail:id=>{openDetail(id);return NR},
 'd-more':(id,el)=>{openPop(el,[{act:'m-edit',id,icon:'edit',label:'แก้ไข'},{act:'m-dup',id,icon:'copy',label:'ทำสำเนา'},'-',{act:'m-delask',id,icon:'trash',label:'ลบ',tone:'danger'}],{align:'right'});return NR},
 'dm-set':id=>{const [v,ds]=id.split('|'),it=find(DETAIL);if(it)commit(`${fmtDate(ds)} · ${it.title}`,()=>{it.log[ds]=+v});return NR},
 'dm-skip':id=>{const [v,ds]=id.split('|'),it=find(DETAIL);if(it)commit(v==='1'?`ข้าม ${fmtDate(ds)}`:'เลิกข้ามแล้ว',()=>{if(v==='1')it.skip[ds]=true;else delete it.skip[ds]});return NR},
 'dm-num':id=>{const it=find(DETAIL);if(it){DV={id:it.id,ds:id,v:val(it,id)};openDialog(dvHTML(it))}return NR},
 'dv-add':id=>{const it=find(DV.id);DV.v=Math.max(0,DV.v+ +id);$('dvNum').textContent=DV.v;return NR},
 'dv-save':()=>{const d=DV;closeTop();setTimeout(()=>{const it=find(d.id);if(it)commit(`บันทึกแล้ว: ${it.title}`,()=>{it.log[d.ds]=d.v})},200);return NR},
 'add-type':id=>{haptic();openForm(id);return NR},
 'h-task':id=>hApply(it=>{it.log[it.start]=id==='1'?1:0}),
 'cal-prev':()=>calMove(-1),'cal-next':()=>calMove(1),
 period:id=>{UI.period=id},
 'cal-view':id=>{UI.calView=id;UI.calDate=parse(UI.calSel);return},
 'cal-nav':id=>{FCS.main?.[id]?.();return NR},
 wk:id=>{UI.weekOff+=+id;UI.weekDir=+id},today:()=>{UI.date=TODAY;UI.weekOff=0},
 retry:()=>{boot();return NR},
 close:()=>{if(!closeAnyDrawer())closeTop();return NR},undo:()=>{toastEl._undo?.();toastEl._undo=null;toastEl.dataset.open='false';return NR},
 'cf-ok':()=>{const f=CONFIRM.fn;closeTop();setTimeout(()=>f?.(),200);return NR},
 ai:()=>{openAI();return NR},settings:()=>{if(LAYERS.some(l=>l.el===page))page.innerHTML=settingsHTML();else openPage(settingsHTML());return NR},
 sugg:id=>{aiSend(id);return NR},
 'ai-hist':()=>{drawerOpen($('drawer').dataset.open!=='true');return NR},
 'ai-new':()=>{CH.cur=null;saveCH();aiRefresh();drawerOpen(false);$('aiText')?.focus();return NR},
 'ai-open':id=>{CH.cur=+id;saveCH();aiRefresh();drawerOpen(false);return NR},
 'ai-opts':(id,el)=>{openPop(el,chatItems(id),{align:'right'});return NR},
 'ai-curopts':(id,el)=>{if(curChat())openPop(el,chatItems(CH.cur),{align:'left'});return NR},
 'ai-pin':id=>{const c=CH.list.find(x=>x.id==id);if(c){c.pinned=!c.pinned;saveCH();aiSync()}return NR},
 'ai-rename':id=>{promptRename(id);return NR},
 'ai-delask':id=>{const c=CH.list.find(x=>x.id==id);if(c)confirmDialog({title:'ลบแชทนี้?',msg:`“${esc(c.title||'แชทใหม่')}” จะถูกลบออกจากประวัติ`,ok:'ลบ',fn:()=>{const snap=JSON.stringify(CH);CH.list=CH.list.filter(x=>x.id!=id);if(CH.cur==id)CH.cur=null;saveCH();aiSync();toast('ลบแชทแล้ว',()=>{CH=JSON.parse(snap);saveCH();aiSync()})}});return NR},
 'ai-plus':(id,el)=>{openPop(el,aiPlusItems,{prefer:'up',align:'left'});return NR},
 'ai-q':id=>{if(id.startsWith('สรุป')){aiSend(id)}else{const t=$('aiText');t.value=id;aiAutosize();t.focus()}return NR},
 'ai-ok':id=>{const m=aiMsg(id);if(!m?.card)return NR;const p=m.card.p;commit('',()=>S.items.push(mk({...p,id:Date.now()})),true);m.card.status='added';saveCH();aiRefresh();return NR},
 'ai-no':id=>{const m=aiMsg(id);if(m?.card){m.card.status='cancelled';saveCH();aiRefresh()}return NR},
 'ai-edit':id=>{const p=aiMsg(id)?.card?.p;if(!p)return NR;openForm(p.type);Object.assign(D,{title:p.title,start:p.start,time:p.time});renderForm();return NR},
 tstart:id=>{const it=find(id);if(!it||isFuture(UI.fdate)){toast('ยังไม่ถึงวัน จึงจับเวลาไม่ได้');return NR}TM={id:it.id,date:UI.fdate,startedAt:Date.now(),acc:0};saveTM();refreshFocus();haptic();return NR},
 tpause:()=>{TM.acc=tmMs();TM.startedAt=null;saveTM();refreshFocus();return NR},tresume:()=>{TM.startedAt=Date.now();saveTM();refreshFocus();return NR},
 tfinish:()=>{tmFinish();return NR},
 tcancel:()=>{const drop=()=>{TM=null;saveTM();refreshFocus()};if(tmMs()<60000)drop();else confirmDialog({title:'ทิ้งเวลาที่จับไว้?',msg:`เวลา ${fmtClock(tmMs())} จะไม่ถูกบันทึก`,keep:'จับเวลาต่อ',ok:'ทิ้งเวลา',fn:drop});return NR},
 theme:id=>{applyTheme(id);page.innerHTML=settingsHTML();return NR},
 notify:()=>{Notification.requestPermission().then(()=>{page.innerHTML=settingsHTML()});return NR},
 export:()=>{exportData();return NR},import:()=>{$('importFile').click();return NR},
 'reset-ask':()=>{confirmDialog({title:'รีเซ็ตข้อมูลทั้งหมด?',msg:'ข้อมูลทั้งหมดจะถูกแทนที่ด้วยข้อมูลตัวอย่าง',ok:'รีเซ็ต',fn:()=>commit('รีเซ็ตเป็นข้อมูลตัวอย่างแล้ว',()=>{Object.assign(S,seed())})});return NR},
 dopen:id=>{D.open=D.open===id?'':id;sheet.querySelectorAll('.ev-panel').forEach(p=>{p.dataset.open=String(p.dataset.key===D.open)});sheet.querySelectorAll('[data-act="dopen"]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.id===D.open)));
  setTimeout(()=>sheet.querySelector('.ev-panel[data-open="true"]')?.scrollIntoView({block:'nearest',behavior:'smooth'}),320);return NR},
 dunit:id=>{D.unit=id;if(id==='week'&&!D.days.length)D.days=[parse(D.start).getDay()];renderForm();return NR},
 devery:id=>{D.every=Math.max(1,(+D.every||1)+(+id));renderForm();return NR},
 dend:()=>{D.endMode=D.endMode==='date'?'never':'date';renderForm();return NR},
 dtrack:id=>{D.track=id;D.target=id==='timer'?30:id==='count'?8:1;D.unitName=id==='timer'?'นาที':id==='count'?'แก้ว':'';renderForm();return NR},
 dtarget:id=>{D.target=Math.max(1,(+D.target||1)+(+id)*(D.track==='timer'?5:1));renderForm();return NR},
 dday:id=>{const n=+id,i=D.days.indexOf(n);i<0?D.days.push(n):D.days.splice(i,1);renderForm();return NR},
 drem:id=>{const m=+id,i=D.rem.findIndex(r=>r.k==='before'&&r.m===m);i<0?D.rem.length<MAX_REM&&D.rem.push({k:'before',m}):D.rem.splice(i,1);renderForm();return NR},
 remadd:()=>{const v=$('remTime').value;if(!HHMM.test(v)||D.rem.some(r=>r.k==='at'&&r.t===v)||D.rem.length>=MAX_REM)return NR;D.rem.push({k:'at',t:v});renderForm();return NR},
 remdel:id=>{D.rem=D.rem.filter(r=>!(r.k==='at'&&r.t===id));renderForm();return NR},
 live:()=>{TM&&openFocus(TM.id);return NR}};
['dunit','devery','dend','dtrack','dtarget','dday','drem','remadd','remdel'].forEach(k=>{const f=ACTIONS[k];ACTIONS[k]=(...a)=>{D.dirty=true;return f(...a)}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const inPop=!!el.closest('#pop');if(inPop)closePop();const r=ACTIONS[el.dataset.act]?.(el.dataset.id,el);if(r!==NR)render()});
$('live').addEventListener('click',()=>ACTIONS.live());
document.addEventListener('input',e=>{if(e.target.id==='dSearch'){aiRenderDrawer(e.target.value);return}if(e.target.id==='aiText'){aiAutosize();return}
 if(e.target.closest('#addForm')&&e.target.name&&e.target.name in D){D[e.target.name]=e.target.value;D.dirty=true}});
document.addEventListener('keydown',e=>{if(e.target.id==='aiText'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('aiForm').requestSubmit?.()}
 const r=e.target.closest?.('[role="button"][data-act]');if(r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();r.click()}});
document.addEventListener('submit',e=>{e.preventDefault();
 if(e.target.id==='aiForm'){const i=$('aiText'),v=i.value;i.value='';aiAutosize();aiSend(v);return}
 if(e.target.id==='renameForm'){const f=e.target,c=CH.list.find(x=>x.id==f.dataset.id),v=(f.querySelector('[name=rname]')?.value||'').trim();if(!v){if(!f.querySelector('.ev-form-err'))f.insertAdjacentHTML('afterbegin','<div class="ev-form-err" role="alert">ชื่อแชทต้องไม่ว่าง</div>');return}if(c){c.title=v;saveCH();aiSync()}closeTop();return}
 if(e.target.id!=='addForm')return;D.err=validate();if(D.err){renderForm();return}
 const it=buildItem(),isEdit=!!D.id;D.dirty=false;closeTop();setTimeout(()=>commit('',()=>{isEdit?S.items.splice(S.items.findIndex(x=>x.id===it.id),1,it):S.items.push(it)},true),200)});
document.addEventListener('change',e=>{if(e.target.id==='importFile'&&e.target.files[0]){importData(e.target.files[0]);e.target.value=''}});
$('nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b||b.dataset.tab===UI.tab)return;UI.tab=b.dataset.tab;UI.animate=true;haptic();render();scrollTo(0,0)});

const LP={t:null,fired:false};
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.ev-fcday');if(!b||b.disabled)return;LP.fired=false;clearTimeout(LP.t);
 LP.t=setTimeout(()=>{LP.fired=true;haptic();const it=find(DETAIL),ds=b.dataset.date;if(it&&scheduled(it,ds)&&ds<=TODAY)openPop(b,dayMenu(it,ds),{align:'center'})},LONG_PRESS_MS)});
['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>clearTimeout(LP.t)));
document.addEventListener('pointerout',e=>{const d=e.target.closest?.('.ev-fcday');if(d&&!d.contains(e.relatedTarget))clearTimeout(LP.t)});
document.addEventListener('contextmenu',e=>{if(e.target.closest?.('.ev-fcday'))e.preventDefault()});

let swipeX=null;
document.addEventListener('touchstart',e=>{swipeX=e.target.closest('.ev-week')?e.touches[0].clientX:null},{passive:true});
document.addEventListener('touchend',e=>{if(swipeX==null)return;const dx=e.changedTouches[0].clientX-swipeX;swipeX=null;if(Math.abs(dx)>50){UI.weekOff+=dx<0?1:-1;UI.weekDir=dx<0?1:-1;render()}},{passive:true});
const errorView=()=>`<div class="ev-error">${empty('x','โหลดข้อมูลไม่สำเร็จ','ตรวจสอบการเชื่อมต่อแล้วลองใหม่')}<button class="ev-btn-primary" data-act="retry">ลองใหม่</button></div>`;

/* ===== MODULE: render ===== */
function countUp(el){const to=+el.dataset.count,t0=performance.now(),dur=700;const f=t=>{const k=Math.min(1,(t-t0)/dur);el.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function setBar(el,v){const k=el.dataset.kind;if(k==='arc')el.style.strokeDashoffset=ARC_C*(1-v/100);else if(k==='col')el.style.transform=`scaleY(${v/100})`;else if(el.closest('.ev-prog'))el.style.setProperty('--w',v);else el.style.width=v+'%'}
function growBars(root,anim){root.querySelectorAll('[data-to]').forEach(el=>{const to=Math.max(0,Math.min(100,+el.dataset.to||0)),k=el.dataset.k||'';setBar(el,anim?0:(UI.lastW[k]??0));UI.lastW[k]=to;requestAnimationFrame(()=>requestAnimationFrame(()=>setBar(el,to)))})}
function render(){const root=$('app'),anim=UI.animate&&!UI.loading;root.innerHTML=UI.loading?skeleton():UI.error?errorView():VIEWS[UI.tab]();
 root.classList.toggle('ev-enter',anim);[...root.children].forEach((c,i)=>c.style.setProperty('--i',i));
 root.querySelectorAll('[data-count]').forEach(el=>anim?countUp(el):(el.textContent=el.dataset.count));
 growBars(root,anim);UI.weekDir=0;if(UI.tab==='calendar'&&!UI.loading&&!UI.error)mountMain();else destroyCal('main');
 UI.animate=false;
 const tabs=TABS.map(([id,l,ic])=>`<li><button data-tab="${id}" ${UI.tab===id?'aria-current="page"':''}><span class="pill">${icon(ic)}</span>${l}</button></li>`);
 tabs.splice(2,0,`<li><button class="add" data-act="add" aria-label="เพิ่มรายการ">${icon('plus')}</button></li>`);
 $('nav').innerHTML=tabs.join('');updateLive();refreshDetail()}
async function boot(){UI.loading=true;UI.error=null;render();
 try{if(window.EvarelGate)await window.EvarelGate();const [s]=await Promise.all([Repo.load(),wait(SKELETON_MS)]);S.items=s.items}catch(err){console.warn('load failed',err);UI.error=err}
 UI.loading=false;UI.animate=true;render()}
boot();

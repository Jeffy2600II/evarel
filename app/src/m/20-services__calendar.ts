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
 cal.render();FCS[key]=cal;
 /* S4: หน้า detail เปิดด้วย transition scale(.98) FullCalendar วัดกว้างตอน mount ได้ค่า scaled แล้วไม่ยอมวัดใหม่
    เรียก updateSize หลัง transition จบให้วัดที่ความกว้างจริง ใช้กับทุก calendar ไม่เปลี่ยนพฤติกรรมเดิม */
 setTimeout(()=>{if(FCS[key]===cal){try{cal.updateSize()}catch(e){}}},450);
 return cal}
function mountMain(){const el=$('fcMain');if(!el)return;
 mountCal('main',el,{initialView:UI.calView,initialDate:UI.calDate||new Date(),events:(info,ok)=>ok(occurrenceEvents(info.start,info.end)),
  dayCellContent:a=>({html:`<span class="ev-dnum">${a.date.getDate()}</span><span class="ev-fcdots">${dotsFor(ymd(a.date))}</span>`}),
  dayCellClassNames:a=>{const ds=ymd(a.date);return [ds===TODAY&&'is-today',ds===UI.calSel&&'is-sel'].filter(Boolean)},
  dateClick:i=>{if(UI.calView==='dayGridMonth')selectDay(i.dateStr)},eventClick:i=>openDetail(i.event.extendedProps.itemId),
  datesSet:a=>{UI.calDate=a.view.currentStart;const s=a.view.currentStart,e=addDays(a.view.currentEnd,-1),t=$('calTitle');
   if(t)t.textContent=UI.calView==='dayGridMonth'?`${TH_MONTH[s.getMonth()]} ${s.getFullYear()+543}`:`${s.getDate()} ${TH_MON[s.getMonth()]} – ${e.getDate()} ${TH_MON[e.getMonth()]} ${e.getFullYear()+543}`}})}
function selectDay(ds){UI.calSel=ds;const el=$('fcMain');el?.querySelectorAll('.fc-daygrid-day.is-sel').forEach(x=>x.classList.remove('is-sel'));el?.querySelector(`.fc-daygrid-day[data-date="${ds}"]`)?.classList.add('is-sel');const box=$('agenda');if(box)box.innerHTML=agendaHTML(ds)}

function mountHabit(){const it=find(ST.DETAIL),el=$('fcHabit');if(!el||!it||it.type!=='habit')return;
 mountCal('habit',el,{initialView:'dayGridMonth',initialDate:new Date(UI.cal.y,UI.cal.m,1),
  dayCellContent:a=>({html:`<span class="ev-dnum">${a.date.getDate()}</span>`}),dayCellClassNames:a=>['ev-fcday',`st-${dayState(it,ymd(a.date))}`],dateClick:i=>calDayTap(i.dateStr,i.dayEl)})}
function calDayTap(ds,el){if(LP.fired){LP.fired=false;return}const it=find(ST.DETAIL);if(!it||!scheduled(it,ds)||ds>TODAY)return;
 if(it.track==='check'&&!skipped(it,ds)){const done=isDone(it,ds);commit(`${fmtDate(ds)}: ${done?'ยังไม่ทำ':'ทำแล้ว'}`,()=>{it.log[ds]=done?0:1});haptic()}else openPop(el,dayMenu(it,ds),{align:'center'})}

/* moved by move_defs (evarel-ts-1f) */
function detailHabit(it){const {y,m}=UI.cal,pad0=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),now=new Date(),isNow=y===now.getFullYear()&&m===now.getMonth();
 let t=0,ok=0;
 for(let d=1;d<=dim;d++){const ds=ymd(new Date(y,m,d)),st=dayState(it,ds);if(ds<=TODAY&&scheduled(it,ds)&&!skipped(it,ds)){t++;if(isDone(it,ds))ok++}}
 /* S4: ยุบวรรค/จัด style ให้ตรงผลลัพธ์ DOM ของ React (react/detail.jsx) ทุกไบต์ */
 return `<section class="ev-card"><div class="ev-stats3"><div><b>${streak(it)}</b><span>วันต่อเนื่อง</span></div><div><b>${totalDone(it)}</b><span>ทำแล้วทั้งหมด (ครั้ง)</span></div><div><b>${t?Math.round(100*ok/t):0}%</b><span>เดือนนี้ (${ok}/${t})</span></div></div></section><section class="ev-card"><div class="ev-cal-head"><button class="ev-icon-btn" data-flat data-act="cal-prev" aria-label="เดือนก่อน">${icon('back')}</button><b>${TH_MONTH[m]} ${y+543}</b><button class="ev-icon-btn ev-flip" data-flat data-act="cal-next" aria-label="เดือนถัดไป" ${isNow?'disabled':''}>${icon('back')}</button></div><div id="fcHabit"></div><div class="ev-legend"><span><i data-state="done"></i>ทำแล้ว</span><span><i data-state="part"></i>ทำบางส่วน</span><span><i></i>ยังไม่ทำ</span><span><i data-state="off"></i>ไม่มีกำหนด</span></div><p class="ev-sub" style="margin-top: 12px;">${it.track==='check'?'แตะวันที่เพื่อติ๊ก/เลิกติ๊ก':'แตะวันที่เพื่อปรับจำนวน'} · กดค้างเพื่อตัวเลือกอื่น (ข้ามวัน)</p></section>`}
function detailTask(it){const done=isDone(it,it.start),late=!done&&it.start<TODAY;
 return `<section class="ev-card"><span class="ev-cap">สถานะ</span><div style="margin: 10px 0px 14px;">${seg('h-task',[['0','ยังไม่เสร็จ'],['1','เสร็จแล้ว']],done?'1':'0')}</div><div class="ev-list-item"><span class="ev-badge">${icon('cal')}</span><div class="grow"><b>กำหนดส่ง ${fmtDate(it.start)}</b><span class="ev-sub">${it.time||'ไม่ระบุเวลา'}${it.subject?` · ${esc(it.subject)}`:''}</span></div>${late?'<span class="ev-chip" data-state="late">เลยกำหนด</span>':done?'<span class="ev-chip" data-state="done">เสร็จแล้ว</span>':''}</div></section>`}
function detailSchedule(it){const next=[];for(let i=0;i<90&&next.length<5;i++){const ds=ymd(addDays(new Date(),i));if(occursOn(it,ds))next.push(ds)}
 return `<section class="ev-card"><h3 class="ev-group" style="padding-top: 0px;">ครั้งถัดไป</h3>${next.length?`<ul>${next.map(ds=>`<li class="ev-list-item"><span class="ev-badge">${icon('cal')}</span><div class="grow"><b>${dayLab(ds)}</b><span class="ev-sub">${fmtDate(ds)}${it.time?` · ${timeText(it)}`:''}</span></div></li>`).join('')}</ul>`:empty('cal','ไม่มีครั้งถัดไป','รายการนี้สิ้นสุดแล้ว')}</section>`}
const DETAIL_BY_TYPE={habit:detailHabit,task:detailTask,event:detailSchedule,class:detailSchedule};
const metaCard=it=>`<section class="ev-card"><h3 class="ev-group" style="padding-top: 0px;">การตั้งค่า</h3><div class="ev-meta"><span class="ev-chip">${TYPES[it.type]}</span><span class="ev-chip">${repeatText(it)}</span>${it.time?`<span class="ev-chip">${timeText(it)}</span>`:''}${it.rem.map(r=>`<span class="ev-chip">เตือน ${remText(r)}</span>`).join('')}</div><button class="ev-btn-ghost ev-btn-block" data-act="m-edit" data-id="${it.id}" style="margin-top: 14px;">แก้ไขการตั้งค่า</button></section>`;
const detailHTML=it=>`<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>${esc(it.title)}</h2><button class="ev-icon-btn" data-flat data-act="d-more" data-id="${it.id}" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวเลือก">${icon('more')}</button></div><div class="ev-page-scroll">${DETAIL_BY_TYPE[it.type](it)}${metaCard(it)}</div>`;
function openDetail(id){const it=find(id);if(!it)return;const n=new Date();UI.cal={y:n.getFullYear(),m:n.getMonth()};
 ST.DETAIL=id;const MT=(window as any).EvarelMount;
 /* S4: หน้ารายละเอียดเป็น React จริงเมื่อพร้อม (FullCalendar ของ habit mount ใน effect ของ component) ไม่พร้อมใช้ string เดิม */
 if(MT?.ready('detail')){page.innerHTML='';MT.mountAt(page,'detail',{id:it.id});
  pushLayer({kind:'page',el:page,onClose:()=>{ST.DETAIL=null;MT.unmountOne('detail');destroyCal('habit')}});
  mountHabit(); /* mount ใน turn เดียวกับการเปิดหน้าเหมือน classic: effect ของ React ยิงกลาง transition (scale .98) ทำให้ FullCalendar วัดกว้างเพี้ยน */ return}
 openPage(detailHTML(it),()=>{ST.DETAIL=null;destroyCal('habit')});mountHabit()}

Object.assign(window, { FCS, destroyCal, addMin, occurrenceEvents, dotsFor, mountCal, mountMain, selectDay, mountHabit, calDayTap, detailHabit, detailTask, detailSchedule, DETAIL_BY_TYPE, metaCard, detailHTML, openDetail });

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
function mountHabit(){const it=find(ST.DETAIL),el=$('fcHabit');if(!el||!it||it.type!=='habit')return;
 mountCal('habit',el,{initialView:'dayGridMonth',initialDate:new Date(UI.cal.y,UI.cal.m,1),
  dayCellContent:a=>({html:`<span class="ev-dnum">${a.date.getDate()}</span>`}),dayCellClassNames:a=>['ev-fcday',`st-${dayState(it,ymd(a.date))}`],dateClick:i=>calDayTap(i.dateStr,i.dayEl)})}
function calDayTap(ds,el){if(LP.fired){LP.fired=false;return}const it=find(ST.DETAIL);if(!it||!scheduled(it,ds)||ds>TODAY)return;
 if(it.track==='check'&&!skipped(it,ds)){const done=isDone(it,ds);commit(`${fmtDate(ds)}: ${done?'ยังไม่ทำ':'ทำแล้ว'}`,()=>{it.log[ds]=done?0:1});haptic()}else openPop(el,dayMenu(it,ds),{align:'center'})}


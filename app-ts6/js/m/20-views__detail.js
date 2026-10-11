/* ===== MODULE: views/detail (ปฏิทินรายเดือน + แก้สถานะย้อนหลัง · เพิ่มประเภทใหม่ = เพิ่มใน DETAIL_BY_TYPE) ===== */
const HIST_STEP_TIMER=5;

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
 ST.DETAIL=id;openPage(detailHTML(it),()=>{ST.DETAIL=null;destroyCal('habit')});mountHabit()}
function refreshDetail(){if(ST.DETAIL==null)return;const it=find(ST.DETAIL);if(!it){ST.DETAIL=null;if(LAYERS.some(l=>l.el===page))closeTop();return}
 const y=page.querySelector('.ev-page-scroll')?.scrollTop||0;page.innerHTML=detailHTML(it);const sc=page.querySelector('.ev-page-scroll');if(sc)sc.scrollTop=y;mountHabit()}

function dayMenu(it,ds){const sk=skipped(it,ds),v=val(it,ds),tg=target(it),multi=it.track!=='check',done=isDone(it,ds),out=[];
 if(sk)return [{act:'dm-skip',id:`0|${ds}`,icon:'x',label:'เลิกข้าม'}];
 if(multi)out.push({act:'dm-set',id:`${tg}|${ds}`,icon:'check',label:`ทำครบเป้า (${tg} ${esc(it.unitName)})`,hint:done?'ปัจจุบัน':''},{act:'dm-num',id:ds,icon:'edit',label:'ปรับจำนวน…',hint:`${v}/${tg}`},{act:'dm-set',id:`0|${ds}`,icon:'x',label:'ล้างเป็น 0'});
 else out.push({act:'dm-set',id:`1|${ds}`,icon:'check',label:'ทำแล้ว',hint:done?'ปัจจุบัน':''},{act:'dm-set',id:`0|${ds}`,icon:'x',label:'ยังไม่ทำ',hint:done?'':'ปัจจุบัน'});
 if(!done)out.push('-',{act:'dm-skip',id:`1|${ds}`,icon:'skip',label:'ข้ามวันนี้ (ไม่นับเป็นพลาด)'});return out}
const dvStep=it=>it.track==='timer'?HIST_STEP_TIMER:1;
const dvHTML=it=>`<h3>${esc(it.title)}</h3><p class="ev-sub">${fmtDate(ST.DV.ds)}</p><div class="ev-stepper" style="margin:14px 0 4px;justify-content:center;gap:22px"><div class="ev-step"><button data-act="dv-add" data-id="${-dvStep(it)}" aria-label="ลด">−</button></div><b id="dvNum" style="font-size:34px;min-width:64px">${ST.DV.v}</b><div class="ev-step"><button data-act="dv-add" data-id="${dvStep(it)}" aria-label="เพิ่ม">+</button></div></div><p class="ev-sub" style="text-align:center">${esc(it.unitName)} · เป้า ${it.target}</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="close">ยกเลิก</button><button class="ev-btn-primary" data-act="dv-save">บันทึก</button></div>`;
const hApply=(fn)=>{const it=find(ST.DETAIL);if(it)commit('',()=>fn(it),true);return NR};
const calMove=n=>{const c=UI.cal,d=new Date(c.y,c.m+n,1);UI.cal={y:d.getFullYear(),m:d.getMonth()};refreshDetail();return NR};


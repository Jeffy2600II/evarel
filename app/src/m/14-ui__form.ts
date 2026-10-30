import { chips, stepper } from './core/uihtml.js';
/* ===== MODULE: ui/form (เพิ่ม/แก้ไข) — ขั้นที่ 1 เลือกประเภท, ขั้นที่ 2 กรอกเฉพาะที่จำเป็น ตัวเลือกขั้นสูงพับเก็บ ===== */

const TYPE_INFO={habit:['clock','ทำซ้ำเป็นประจำ เช่น ดื่มน้ำ อ่านหนังสือ'],task:['tasks','มีวันส่ง เช่น การบ้าน รายงาน'],event:['bell','นัดหมายที่มีเวลาเริ่มและจบ'],class:['cal','คาบเรียนประจำสัปดาห์']};
const startBase=()=>{const d=UI.tab==='calendar'?UI.calSel:UI.date;return d>=TODAY?d:TODAY};
const newDraft=t=>({id:null,step:'form',open:'',type:t,title:'',subject:'',start:startBase(),end:'',endMode:'never',time:'',timeEnd:'',unit:t==='habit'?'day':'none',every:1,days:[],track:'check',target:1,unitName:'',rem:[{k:'before',m:0}],err:''});
const draftFrom=it=>({id:it.id,step:'form',open:'',type:it.type,title:it.title,subject:it.subject,start:it.start,end:it.end,endMode:it.end?'date':'never',time:it.time,timeEnd:it.timeEnd,unit:it.repeat.unit,every:it.repeat.every,days:[...it.repeat.days],track:it.track==='none'?'check':it.track,target:it.target,unitName:it.unitName,rem:it.rem.map(r=>({...r})),err:''});

const SR=(l,v,k)=>`<button type="button" class="ev-set-row" data-act="dopen" data-id="${k}" aria-expanded="${ST.D.open===k}"><span>${l}</span><small>${v}${icon('chev')}</small></button>`;
const PN=(k,h)=>`<div class="ev-panel" data-key="${k}" data-open="${ST.D.open===k}"><div><div class="ev-panel-in">${h}</div></div></div>`;
const IR=(l,h)=>`<div class="ev-set-row"><span>${l}</span>${h}</div>`;
const ri=(n,t)=>`<input class="ev-row-input" aria-label="${n}" type="${t}" value="${esc(ST.D[n]??'')}" name="${n}">`;
/* TR (เดโม v20/v24): แถวเวลาแบบ tbox — ตั้งแล้วโชว์ HH:MM น. + ปุ่มล้าง ✕, ยังไม่ตั้งโชว์ ＋ เพิ่มเวลา + คำใบ้ ลำดับ attribute ตรง React DOM */
const TR=(l,n)=>{const v=ST.D[n]||'';return `<div class="ev-set-row"><span>${l}</span><span class="ev-tbox-w"><label class="ev-tbox" data-empty="${!v}"><span class="ev-tbox-t">${v?v+' น.':'＋ เพิ่มเวลา'}</span><input aria-label="${l}" type="time" value="${esc(v)}" name="${n}"></label>${v?`<button type="button" class="ev-tx" data-tclear="${n}" aria-label="ล้าง${l}">✕</button>`:'<small class="ev-tbox-h">ยังไม่ได้ตั้ง</small>'}</span></div>`}; /* S4: ลำดับ attribute ตรง React DOM (type,value,name ท้าย) */
const everyTxt=()=>ST.D.every>1?`ทุก ${ST.D.every} `:'ทุก';
const repSum=()=>ST.D.unit==='none'?'ไม่ซ้ำ':ST.D.unit==='week'?`${everyTxt()}สัปดาห์${ST.D.days.length?` · ${[...ST.D.days].sort().map(d=>WD[d]).join(' ')}`:''}`:`${everyTxt()}${UNIT_TH[ST.D.unit]}`;
const remSum=()=>ST.D.rem.length?ST.D.rem.slice(0,2).map(remText).join(', ')+(ST.D.rem.length>2?` +${ST.D.rem.length-2}`:''):'ปิดแจ้งเตือน';
const rangeSum=()=>`${ST.D.start===TODAY?'เริ่มวันนี้':`เริ่ม ${ST.D.start}`} · ${ST.D.endMode==='date'&&ST.D.end?`ถึง ${ST.D.end}`:'ไม่สิ้นสุด'}`;
const repPanel=()=>seg('dunit',[['none','ไม่ซ้ำ'],['day','วัน'],['week','สัปดาห์'],['month','เดือน']],ST.D.unit)+(ST.D.unit==='none'?'':stepper('ทุก ๆ','devery',ST.D.every,`<span>${UNIT_TH[ST.D.unit]}</span>`))+(ST.D.unit==='week'?chips('dday',WEEK_OPTS,ST.D.days):'');
const rangePanel=lab=>`<div class="ev-stepper"><span>${lab}</span>${ri('start','date')}</div><div class="ev-stepper"><span>มีวันสิ้นสุด</span><button type="button" class="ev-switch" role="switch" aria-checked="${ST.D.endMode==='date'}" data-act="dend" aria-label="มีวันสิ้นสุด"></button></div>${ST.D.endMode==='date'?`<div class="ev-stepper"><span>สิ้นสุดวันที่</span>${ri('end','date')}</div>`:''}`;
/* ตามเดโม v24 จริง: ไม่มีสวิตช์ตรงเวลา ใช้ชิป m=0 รวมในพรีเซ็ตเดียวกัน + empty-note + tbox | REM_PRESETS จาก services/notify */
const remPanel=()=>{const at=ST.D.rem.filter(r=>r.k==='at');return chips('drem',REM_PRESETS.map(m=>[m,remText({k:'before',m})]),ST.D.rem.filter(r=>r.k==='before').map(r=>r.m))
+(at.length?`<div class="ev-rem">${at.map(r=>`<span class="ev-rem-tag">${r.t} น.<button type="button" data-act="remdel" data-id="${r.t}" aria-label="ลบการเตือน ${r.t}">${icon('x')}</button></span>`).join('')}</div>`:'<div class="ev-empty-note">ยังไม่มีการเตือนตามเวลา เลือกเวลาด้านล่างแล้วกดเพิ่ม</div>')
+`<div class="ev-stepper"><span>เตือนตามเวลา</span><div class="ev-row" style="gap: 8px;"><label class="ev-tbox" data-empty="true"><span class="ev-tbox-t">＋ เลือกเวลา</span><input id="remTime" aria-label="เวลาเตือน" type="time"></label><button type="button" class="ev-btn-ghost ev-btn-sm" data-act="remadd">เพิ่ม</button></div></div>`};
const SET=h=>`<div class="ev-set">${h}</div>`;
/* notifyIssue + ปุ่มปิดแจ้งเตือน ตามเดโม v24: เตือนเมื่อตั้งแจ้งก่อนถึงเวลาแต่ไม่มีเวลาทำรายการ */
const notifyIssue=()=>ST.D.rem.some(r=>r.k==='before'&&r.m>=0)&&!ST.D.time?'ต้องใส่เวลา จึงจะแจ้งเตือนได้ ถ้าไม่ต้องการแจ้งเตือน ให้ปิดแจ้งเตือน':'';
const remRow=()=>SR('เตือน',remSum(),'rem')+PN('rem',remPanel())+(notifyIssue()?`<div class="ev-field-err" data-tone="hint" style="padding: 6px 14px 12px;">${icon('alert')}<span>${notifyIssue()}</span><button type="button" data-act="rem-off">ปิดแจ้งเตือน</button></div>`:'');
function formBody(){const T=ST.D.type,multi=ST.D.track!=='check',ph={habit:'เช่น ดื่มน้ำ',task:'เช่น การบ้านคณิต',event:'เช่น ประชุมชมรม',class:'ชื่อวิชา'}[T];
 let h=`<input class="ev-title-input" placeholder="${ph}" maxlength="80" aria-label="ชื่อ" value="${esc(ST.D.title)}" name="title">${ST.D.err?`<div class="ev-form-err" role="alert">${esc(ST.D.err)}</div>`:''}`;
 if(T==='habit')h+=`<div class="ev-block"><span class="ev-cap">ติดตามผลแบบ</span>${seg('dtrack',TRACK_OPTS,ST.D.track)}${multi?stepper('เป้าหมายต่อวัน','dtarget',ST.D.target,`<input class="ev-unit" placeholder="${ST.D.track==='timer'?'นาที':'หน่วย'}" maxlength="12" aria-label="หน่วย" value="${esc(ST.D.unitName)}" name="unitName">`):''}</div>`
  +SET(TR('เวลา (ไม่บังคับ)','time')+SR('ทำซ้ำ',repSum(),'rep')+PN('rep',repPanel())+SR('ช่วงเวลา',rangeSum(),'range')+PN('range',rangePanel('เริ่มวันที่')))+SET(remRow());
 if(T==='task')h+=SET(IR('กำหนดส่ง',ri('start','date'))+TR('เวลา (ไม่บังคับ)','time')+IR('วิชา/หมวด',`<input class="ev-row-input" placeholder="ไม่บังคับ" maxlength="30" aria-label="วิชา" value="${esc(ST.D.subject)}" name="subject">`))+SET(remRow());
 if(T==='event')h+=SET(IR('วันที่',ri('start','date'))+TR('เริ่ม','time')+TR('จบ','timeEnd')+SR('ทำซ้ำ',repSum(),'rep')+PN('rep',repPanel())+(ST.D.unit!=='none'?SR('ช่วงเวลา',rangeSum(),'range')+PN('range',rangePanel('เริ่มวันที่')):''))+SET(remRow());
 if(T==='class')h+=`<div class="ev-block"><span class="ev-cap">วันที่เรียน</span>${chips('dday',WEEK_OPTS,ST.D.days)}</div>`+SET(TR('เริ่ม','time')+TR('จบ','timeEnd')+SR('ภาคเรียน',rangeSum(),'range')+PN('range',rangePanel('เปิดเทอม')))+SET(remRow());
 return h}
const typeBody=()=>`<div class="ev-types">${Object.entries(TYPE_INFO).map(([k,[ic,d]])=>`<button class="ev-type" data-act="dtype" data-id="${k}"><span class="orb">${icon(ic)}</span><b>${TYPES[k]}</b><span class="d">${d}</span></button>`).join('')}</div>`;
/* ===== v19 ตามเดโม: bottom sheet ปรับความสูงนุ่ม + เนื้อหาเข้าเป็นจังหวะ (CSS ของ data-resize/data-stage อยู่ใน design.css แล้ว) =====
   sheetResize: วัดความสูงก่อน/หลังสลับเนื้อหาแล้ว transition .34s — ต่างน้อยกว่า 3px ไม่เล่น | sheetStage: เปลี่ยนขั้นฟอร์ม = เนื้อหาใหม่เข้าเป็นจังหวะ 900ms */
let sheetStageT:any=0,sheetResizeT:any=0,renderFormKey='';
function sheetStage(){clearTimeout(sheetStageT);sheet.dataset.stage='1';sheetStageT=setTimeout(()=>{delete sheet.dataset.stage},900)}
function sheetResize(run){const el=sheet;
 if(el.hidden||el.dataset.open!=='true'||el.dataset.drag==='true'||document.documentElement.dataset.perf==='lite'){run();return}
 const h0=el.offsetHeight;clearTimeout(sheetResizeT);el.style.height='';delete el.dataset.resize;run();const h1=el.offsetHeight;if(Math.abs(h1-h0)<3)return;
 el.style.height=h0+'px';void el.offsetHeight;el.dataset.resize='1';void el.offsetHeight;el.style.height=h1+'px';
 sheetResizeT=setTimeout(()=>{el.style.height='';delete el.dataset.resize},380)}
function renderForm(){ST.sheetMode='form';const y=$('sheetBody')?.scrollTop||0,isType=ST.D.step==='type';
 const title=isType?'เพิ่มอะไรดี':`${ST.D.id?'แก้ไข':'เพิ่ม'}${TYPES[ST.D.type]}`,body=isType?typeBody():`<form class="ev-form" id="addForm" novalidate>${formBody()}</form>`;
 const o={back:!isType&&!ST.D.id&&ST.D.fromType,foot:isType?'':`<button class="ev-btn-primary ev-btn-block" type="submit" form="addForm">${ST.D.id?'บันทึก':`เพิ่ม${TYPES[ST.D.type]}`}</button>`};
 /* S4: เนื้อฟอร์มเป็น React จริงเมื่อพร้อม (page เขียนทับ html ใน setSheet) ไม่พร้อมใช้ string เดิม */
 const MT=(window as any).EvarelMount;
 if(MT?.ready('sheet')&&MT.ready(isType?'typeBody':'formBody')){o.page=isType?'typeBody':'formBody'}
 const key=ST.D.step+':'+ST.D.type;
 if(LAYERS.some(l=>l.el===sheet)){const stage=key!==renderFormKey;sheetResize(()=>{if(stage)sheetStage();setSheet(title,body,o);const b=$('sheetBody');if(b)b.scrollTop=y})}
 else openSheet(title,body,o);
 renderFormKey=key}
const openForm=(type,it)=>{ST.D=it?draftFrom(it):type?newDraft(type):{...newDraft('habit'),step:'type'};renderForm()};
function validate(){const T=ST.D.type;if(!ST.D.title.trim())return 'กรุณาใส่ชื่อรายการ';if(!ST.D.start)return 'กรุณาเลือกวันที่';
 if(ST.D.time&&ST.D.timeEnd&&ST.D.timeEnd<=ST.D.time)return 'เวลาจบต้องหลังเวลาเริ่ม';if(ST.D.endMode==='date'&&(!ST.D.end||ST.D.end<ST.D.start))return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
 {const ne=checkNotify(ST.D.rem,ST.D.time);if(ne)return ne}
 if(T==='class'&&!ST.D.days.length)return 'เลือกวันที่เรียนอย่างน้อย 1 วัน';return ''}
function buildItem(){const T=ST.D.type,old=ST.D.id?find(ST.D.id):null,week=T==='class'||ST.D.unit==='week',days=week?(ST.D.days.length?[...ST.D.days]:[parse(ST.D.start).getDay()]):[];
 const unit=T==='task'?'none':T==='class'?'week':ST.D.unit,multi=T==='habit'&&ST.D.track!=='check';
 return mk({id:ST.D.id||Date.now(),type:T,title:ST.D.title.trim(),subject:(ST.D.subject||'').trim(),start:ST.D.start,end:ST.D.endMode==='date'&&unit!=='none'?ST.D.end:'',time:ST.D.time,timeEnd:T==='task'||T==='habit'?'':ST.D.timeEnd,
  rem:ST.D.rem.slice(0,MAX_REM).map(r=>({...r})),repeat:{unit,every:Math.max(1,Math.round(+ST.D.every||1)),days},track:T==='habit'?ST.D.track:T==='task'?'check':'none',target:multi?Math.max(1,Math.round(+ST.D.target||1)):1,unitName:multi?(ST.D.unitName||'').trim():'',log:old?old.log:{},skip:old?old.skip:{}})}


Object.assign(window, { TYPE_INFO, startBase, newDraft, draftFrom, chips, SR, PN, IR, ri, stepper, everyTxt, repSum, remSum, rangeSum, repPanel, rangePanel, remPanel, SET, notifyIssue, remRow, formBody, typeBody, sheetStage, sheetResize, renderForm, openForm, validate, buildItem });

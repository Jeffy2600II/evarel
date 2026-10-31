/* ===== MODULE: actions ===== */
const date=el=>el?.dataset.date||UI.date;
const bump=(id,n,d=UI.date)=>{const it=find(id);if(!it)return;const v=Math.max(0,val(it,d)+n);commit('',()=>{it.log[d]=v},true);haptic();return NR};
const aiMsg=id=>curChat()?.msgs[+id];
const closeAnyDrawer=()=>{const d=$('drawer');if(d&&d.dataset.open==='true'&&LAYERS[LAYERS.length-1]?.el===pageOf('ai')){drawerOpen(false);return true}return false};
function itemMenu(it,ds){const id=it.id,can=tracked(it)&&occursOn(it,ds)&&!isFuture(ds),k=`${id}|${ds}`;
/** @type {any[]} */
const out=[{act:'detail',id,icon:'chart',label:'ดูรายละเอียดและประวัติ'},{act:'m-edit',id,icon:'edit',label:'แก้ไข'},{act:'m-dup',id,icon:'copy',label:'ทำสำเนา'}];
 if(it.track==='timer')out.push({act:'timeropen',id,icon:'clock',label:'เปิดหน้าจับเวลา'});
 if(can&&val(it,ds)>0)out.push({act:'m-reset',id:k,icon:'x',label:`ล้างบันทึก (${dayLab(ds)})`});
 if(can&&it.type==='habit'&&!isDone(it,ds)&&!skipped(it,ds))out.push({act:'m-skip',id:k,icon:'skip',label:`ข้าม (${dayLab(ds)})`});
 if(can&&skipped(it,ds))out.push({act:'m-unskip',id:k,icon:'x',label:'ยกเลิกการข้าม'});
 out.push('-',{act:'m-delask',id,icon:'trash',label:'ลบ',tone:'danger'});return out}
function promptRename(id){const c=ST.CH.list.find(x=>x.id==id);if(!c)return;openDialog(`<h3>เปลี่ยนชื่อแชท</h3><form id="renameForm" data-id="${id}" class="ev-form" novalidate><input class="ev-input" name="rname" value="${esc(c.title)}" maxlength="40" placeholder="ชื่อแชท" aria-label="ชื่อแชท" autofocus><div class="ev-dlg-actions" style="margin-top:0"><button type="button" class="ev-btn-ghost" data-act="close">ยกเลิก</button><button type="submit" class="ev-btn-primary">บันทึก</button></div></form>`);setTimeout(()=>dialog.querySelector('[name=rname]')?.select(),90)}
const ACTIONS={
 check:(id,el)=>{const it=find(id),d=date(el);if(!it||isFuture(d))return;UI.pop=isDone(it,d)?null:it.id;commit('',()=>{it.log[d]=isDone(it,d)?0:target(it)},true);haptic();UI.pop=null;return NR},
 inc:(id,el)=>bump(id,1,date(el)),dec:(id,el)=>bump(id,-1,date(el)),
 date:id=>{UI.date=id},type:id=>{UI.type=id},cday:id=>{UI.cday=+id},
 add:()=>{haptic();openForm(null);return NR},
 dtype:id=>{ST.D={...newDraft(id),title:ST.D.title,fromType:true};renderForm();return NR},
 dback:()=>{ST.D.step='type';renderForm();return NR},
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
 'dm-set':id=>{const [v,ds]=id.split('|'),it=find(ST.DETAIL);if(it)commit(`${fmtDate(ds)} · ${it.title}`,()=>{it.log[ds]=+v});return NR},
 'dm-skip':id=>{const [v,ds]=id.split('|'),it=find(ST.DETAIL);if(it)commit(v==='1'?`ข้าม ${fmtDate(ds)}`:'เลิกข้ามแล้ว',()=>{if(v==='1')it.skip[ds]=true;else delete it.skip[ds]});return NR},
 'dm-num':id=>{const it=find(ST.DETAIL);if(it){ST.DV={id:it.id,ds:id,v:val(it,id)};openDialog(dvHTML(it))}return NR},
 'dv-add':id=>{const it=find(ST.DV.id);ST.DV.v=Math.max(0,ST.DV.v+ +id);$('dvNum').textContent=ST.DV.v;return NR},
 'dv-save':()=>{const d=ST.DV;closeTop();setTimeout(()=>{const it=find(d.id);if(it)commit(`บันทึกแล้ว: ${it.title}`,()=>{it.log[d.ds]=d.v})},200);return NR},
 'add-type':id=>{haptic();openForm(id);return NR},
 'h-task':id=>hApply(it=>{it.log[it.start]=id==='1'?1:0}),
 'cal-prev':()=>calMove(-1),'cal-next':()=>calMove(1),
 period:id=>{UI.period=id},
 'cal-view':id=>{UI.calView=id;UI.calDate=parse(UI.calSel);return},
 'cal-nav':id=>{FCS.main?.[id]?.();return NR},
 wk:id=>{UI.weekOff+=+id;UI.weekDir=+id},today:()=>{UI.date=TODAY;UI.weekOff=0},
 retry:()=>{boot();return NR},
 'au-go':id=>{stopCool();UI.auth.screen=id;renderAuthRoot();return NR},
 'au-google':(id,el)=>{authGoogle(el.closest('button'));return NR},
 'au-eye':(id,el)=>{const i=$(id),show=i.type==='password';i.type=show?'text':'password';el.innerHTML=icon(show?'eyeoff':'eye');el.setAttribute('aria-pressed',String(show));el.setAttribute('aria-label',show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน');return NR},
 'au-fixmail':(id)=>{const i=document.querySelector('.ev-authform [name="email"]');if(i)i.value=id;const b=$('e-email');if(b){b.hidden=true;b.innerHTML=''}return NR},
 'au-terms':id=>{openDialog(`<h3>${id==='terms'?'ข้อกำหนดการใช้งาน':'นโยบายความเป็นส่วนตัว'}</h3><p class="ev-sub">เอกสารฉบับเต็มกำลังจัดทำและจะเผยแพร่ก่อนเปิดให้ผู้อื่นใช้งาน</p><div class="ev-dlg-actions" style="grid-template-columns:1fr"><button class="ev-btn-primary" data-act="close">เข้าใจแล้ว</button></div>`);return NR},
 'au-resend':()=>{resendReset();return NR},
 'au-signout-ask':()=>{confirmDialog({title:'ออกจากระบบ?',msg:'ข้อมูลของคุณยังอยู่ และเข้าสู่ระบบกลับมาได้เสมอ',keep:'อยู่ต่อ',ok:'ออกจากระบบ',tone:'primary',fn:()=>doSignOut(false)});return NR},
 'au-delete-ask':()=>{confirmDialog({title:'ลบบัญชีถาวร?',msg:'บัญชีและข้อมูลทั้งหมดของคุณจะถูกลบ และกู้คืนไม่ได้',ok:'ลบบัญชี',fn:()=>doSignOut(true)});return NR},
 close:()=>{if(!closeAnyDrawer())closeTop();return NR},undo:()=>{toastEl._undo?.();toastEl._undo=null;toastEl.dataset.open='false';return NR},
 'cf-ok':()=>{const f=CONFIRM.fn;closeTop();setTimeout(()=>f?.(),200);return NR},  'imp-add':()=>{closeTop();setTimeout(()=>runImport('add'),200);return NR},'imp-skip':()=>{closeTop();setTimeout(()=>runImport('skip'),200);return NR},
 ai:()=>{openAI();return NR},settings:()=>{settingsOpen();return NR},
 sugg:id=>{fillComposer(SUGG[+id]??id);return NR},
 'ai-hist':()=>{drawerOpen($('drawer').dataset.open!=='true');return NR},
 'ai-new':()=>{ST.CH.cur=null;saveCH();aiRefresh();drawerOpen(false);$('aiText')?.focus();return NR},
 'ai-open':id=>{ST.CH.cur=+id;saveCH();aiRefresh();drawerOpen(false);return NR},
 'ai-opts':(id,el)=>{openPop(el,chatItems(id),{align:'right'});return NR},
 'ai-quota':()=>{quotaSheet();return NR},
 'ai-curopts':(id,el)=>{if(curChat())openPop(el,chatItems(ST.CH.cur),{align:'left'});return NR},
 'ai-pin':id=>{const c=ST.CH.list.find(x=>x.id==id);if(c){c.pinned=!c.pinned;saveCH();aiSync()}return NR},
 'ai-rename':id=>{promptRename(id);return NR},
 'ai-delask':id=>{const c=ST.CH.list.find(x=>x.id==id);if(c)confirmDialog({title:'ลบแชทนี้?',msg:`“${esc(c.title||'แชทใหม่')}” จะถูกลบออกจากประวัติ`,ok:'ลบ',fn:()=>{const snap=JSON.stringify(ST.CH);ST.CH.list=ST.CH.list.filter(x=>x.id!=id);if(ST.CH.cur==id)ST.CH.cur=null;saveCH();aiSync();toast('ลบแชทแล้ว',()=>{ST.CH=JSON.parse(snap);saveCH();aiSync()})}});return NR},
 'ai-plus':(id,el)=>{openPop(el,aiPlusItems,{prefer:'up',align:'left'});return NR},
 'ai-more':(id,el)=>{openPop(el,moreItems(),{align:'right'});return NR},
 'ai-search':()=>{const w=$('dSearchWrap');if(!w)return NR;w.hidden=!w.hidden;if(w.hidden){$('dSearch').value='';aiRenderDrawer('')}else $('dSearch').focus();return NR},
 'ai-copy':id=>{const m=aiMsg(id);if(!m)return NR;const done=()=>toast('คัดลอกแล้ว');(navigator.clipboard?.writeText(m.text)||Promise.reject(new Error('no clipboard'))).then(done,err=>{console.warn('copy',err);toast('คัดลอกไม่สำเร็จ')});return NR},
 'ai-vote':id=>{const [i,v]=String(id).split(':'),m=aiMsg(i);if(!m)return NR;m.vote=m.vote===v?null:v;saveCH();aiRefresh();haptic();return NR},
 'ai-usage':()=>{ST.sheetMode='usage';openSheet('การใช้งาน AI','<div id="usageSheet">'+usageCardHTML()+'</div><p class="ev-sub" style="margin-top:12px">ขีดจำกัดต่อวันช่วยให้บริการเสถียรสำหรับทุกคน</p>');growBars($('sheet'));usageRefresh();return NR},
 'usage-refresh':()=>{ST.QUOTA=null;usagePaint();usageRefresh();return NR},
 'ai-retry':()=>{const t=ST.AI.draft;ST.AI.notice=null;ST.AI.draft='';aiRefresh();if(t)aiSend(t);return NR},
 'ai-retry-global':()=>{ST.AI.notice=null;aiRefresh();quotaPaint();return NR},
 'rem-off':()=>{ST.D.rem=[];renderForm();return NR},
 'ai-q':id=>{fillComposer(id);return NR},
 'ai-ok':id=>{const m=aiMsg(id);if(!m?.card)return NR;const p=m.card.p;commit('',()=>S.items.push(mk({...p,id:Date.now()})),true);m.card.status='added';saveCH();aiRefresh();return NR},
 'ai-cok':id=>{const [i,k]=String(id).split(':').map(Number),c=aiMsg(i)?.cards?.[k];if(!c||c.status!=='pending')return NR;
  if(isMemTool(c.tool)){c.status='saving';aiRefresh();memCall(c).then(ok=>{c.status=ok?'added':'failed';if(!ok)toast('บันทึกความจำไม่สำเร็จ ลองใหม่ภายหลังนะ');saveCH();aiRefresh()});return NR}
  let ok=false;commit(c.tool==='item_delete'?'ลบแล้ว':'',()=>{ok=applyProposal(c)},c.tool!=='item_delete');
  c.status=ok?'added':'failed';if(!ok)toast('ไม่พบรายการนี้แล้ว');saveCH();aiRefresh();return NR},
 'ai-cno':id=>{const [i,k]=String(id).split(':').map(Number),c=aiMsg(i)?.cards?.[k];if(c&&c.status==='pending'){c.status='cancelled';saveCH();aiRefresh()}return NR},
 'ai-no':id=>{const m=aiMsg(id);if(m?.card){m.card.status='cancelled';saveCH();aiRefresh()}return NR},
 'ai-edit':id=>{const p=aiMsg(id)?.card?.p;if(!p)return NR;openForm(p.type);Object.assign(ST.D,{title:p.title,start:p.start,time:p.time});renderForm();return NR},
 tstart:id=>{const it=find(id);if(!it||isFuture(UI.fdate)){toast('ยังไม่ถึงวัน จึงจับเวลาไม่ได้');return NR}ST.TM={id:it.id,date:UI.fdate,startedAt:Date.now(),acc:0};saveTM();refreshFocus();haptic();return NR},
 tpause:()=>{ST.TM.acc=tmMs();ST.TM.startedAt=null;saveTM();refreshFocus();return NR},tresume:()=>{ST.TM.startedAt=Date.now();saveTM();refreshFocus();return NR},
 tfinish:()=>{tmFinish();return NR},
 tcancel:()=>{const drop=()=>{ST.TM=null;saveTM();refreshFocus()};if(tmMs()<60000)drop();else confirmDialog({title:'ทิ้งเวลาที่จับไว้?',msg:`เวลา ${fmtClock(tmMs())} จะไม่ถูกบันทึก`,keep:'จับเวลาต่อ',ok:'ทิ้งเวลา',fn:drop});return NR},
 theme:id=>{applyTheme(id);settingsRepaint();return NR},
 perf:id=>{try{localStorage.setItem(PERF_PREF_KEY,id);if(id==='auto')localStorage.removeItem(PERF_AUTO_KEY)}catch(e){console.warn('perf',e)}perfApply();settingsRepaint();return NR},
 notify:()=>{pushSubscribe(true).then(r=>{settingsRepaint();toast(r.ok?'เครื่องนี้พร้อมรับการแจ้งเตือนแล้ว':pushWhyText(r.why))});return NR},
 dopen:id=>{ST.D.open=ST.D.open===id?'':id;sheet.querySelectorAll('.ev-panel').forEach(p=>{p.dataset.open=String(p.dataset.key===ST.D.open)});sheet.querySelectorAll('[data-act="dopen"]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.id===ST.D.open)));
  setTimeout(()=>sheet.querySelector('.ev-panel[data-open="true"]')?.scrollIntoView({block:'nearest',behavior:'smooth'}),320);return NR},
 dunit:id=>{ST.D.unit=id;if(id==='week'&&!ST.D.days.length)ST.D.days=[parse(ST.D.start).getDay()];renderForm();return NR},
 devery:id=>{ST.D.every=Math.max(1,(+ST.D.every||1)+(+id));renderForm();return NR},
 dend:()=>{ST.D.endMode=ST.D.endMode==='date'?'never':'date';renderForm();return NR},
 dtrack:id=>{ST.D.track=id;ST.D.target=id==='timer'?30:id==='count'?8:1;ST.D.unitName=id==='timer'?'นาที':id==='count'?'แก้ว':'';renderForm();return NR},
 dtarget:id=>{ST.D.target=Math.max(1,(+ST.D.target||1)+(+id)*(ST.D.track==='timer'?5:1));renderForm();return NR},
 dday:id=>{const n=+id,i=ST.D.days.indexOf(n);i<0?ST.D.days.push(n):ST.D.days.splice(i,1);renderForm();return NR},
 drem:id=>{const m=+id,i=ST.D.rem.findIndex(r=>r.k==='before'&&r.m===m);i<0?ST.D.rem.length<MAX_REM&&ST.D.rem.push({k:'before',m}):ST.D.rem.splice(i,1);renderForm();return NR},
 remadd:()=>{const v=$('remTime').value;if(!HHMM.test(v)||ST.D.rem.some(r=>r.k==='at'&&r.t===v)||ST.D.rem.length>=MAX_REM)return NR;ST.D.rem.push({k:'at',t:v});renderForm();return NR},
 remdel:id=>{ST.D.rem=ST.D.rem.filter(r=>!(r.k==='at'&&r.t===id));renderForm();return NR},
 live:()=>{ST.TM&&openFocus(ST.TM.id);return NR}};
['dunit','devery','dend','dtrack','dtarget','dday','drem','remadd','remdel'].forEach(k=>{const f=ACTIONS[k];ACTIONS[k]=(...a)=>{ST.D.dirty=true;return f(...a)}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const inPop=!!el.closest('#pop');if(inPop)closePop();const r=ACTIONS[el.dataset.act]?.(el.dataset.id,el);if(r!==NR)ST._render()});
$('live').addEventListener('click',()=>ACTIONS.live());
document.addEventListener('input',e=>{if(e.target.id==='dSearch'){aiRenderDrawer(e.target.value);return}if(e.target.id==='aiText'){aiAutosize();return}if(e.target.id==='remTime'){const l=e.target.closest('.ev-tbox');if(l){l.dataset.empty=String(!e.target.value);l.firstElementChild.textContent=e.target.value?e.target.value+' น.':'＋ เลือกเวลา'}return}
 if(e.target.closest('#addForm')&&e.target.name&&e.target.name in ST.D){ST.D[e.target.name]=e.target.value;ST.D.dirty=true}});
/* เดโม v20/v24: ปุ่มล้างเวลา (tclear) และ เลือกเวลาใน tbox แล้ว render ใหม่ให้สถานะถูก */
document.addEventListener('click',e=>{const b=e.target.closest('[data-tclear]');if(!b||!ST.D)return;e.stopPropagation();ST.D[b.dataset.tclear]='';ST.D.dirty=true;renderForm()},true);
document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('.ev-tbox')&&ST.D){const t=e.target;if(t.id==='remTime'){/* เดโม morphdom คง node เดิวมีค่าไว้ ฝั่ง React remount จึงต้องคืนค่าหลังเรนเดอร์ */const v=t.value;renderForm();const n=$('remTime');if(n)n.value=v;return}renderForm()}});
document.addEventListener('keydown',e=>{if(e.target.id==='aiText'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('aiForm').requestSubmit?.()}
 const r=e.target.closest?.('[role="button"][data-act]');if(r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();r.click()}});
document.addEventListener('submit',e=>{e.preventDefault();
 if(e.target.classList.contains('ev-authform')){authSubmit(e.target.dataset.kind,e.target);return}
 if(e.target.id==='aiForm'){const i=$('aiText'),v=i.value;i.value='';aiAutosize();aiSend(v);return}
 if(e.target.id==='renameForm'){const f=e.target,c=ST.CH.list.find(x=>x.id==f.dataset.id),v=(f.querySelector('[name=rname]')?.value||'').trim();if(!v){if(!f.querySelector('.ev-form-err'))f.insertAdjacentHTML('afterbegin','<div class="ev-form-err" role="alert">ชื่อแชทต้องไม่ว่าง</div>');return}if(c){c.title=v;saveCH();aiSync()}closeTop();return}
 if(e.target.id!=='addForm')return;ST.D.err=validate();if(ST.D.err){renderForm();return}
 const it=buildItem(),isEdit=!!ST.D.id;ST.D.dirty=false;closeTop();setTimeout(()=>commit('',()=>{isEdit?S.items.splice(S.items.findIndex(x=>x.id===it.id),1,it):S.items.push(it)},true),200)});
$('nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b||b.dataset.tab===UI.tab)return;UI.tab=b.dataset.tab;UI.animate=true;haptic();ST._render();scrollTo(0,0)});


document.addEventListener('pointerdown',e=>{const b=e.target.closest('.ev-fcday');if(!b||b.disabled)return;LP.fired=false;clearTimeout(LP.t);
 LP.t=setTimeout(()=>{LP.fired=true;haptic();const it=find(ST.DETAIL),ds=b.dataset.date;if(it&&scheduled(it,ds)&&ds<=TODAY)openPop(b,dayMenu(it,ds),{align:'center'})},LONG_PRESS_MS)});
['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>clearTimeout(LP.t)));
document.addEventListener('pointerout',e=>{const d=e.target.closest?.('.ev-fcday');if(d&&!d.contains(e.relatedTarget))clearTimeout(LP.t)});
document.addEventListener('contextmenu',e=>{if(e.target.closest?.('.ev-fcday'))e.preventDefault()});

/* moved by move_defs (evarel-ts-1f) */
const moreItems=()=>{const ci=curChat()?chatItems(ST.CH.cur):null;
 return ci?[...ci.slice(0,2),{act:'ai-usage',id:'',icon:'chart',label:'ขีดจำกัดการใช้งาน'},'-',ci[3]]:[{act:'ai-usage',id:'',icon:'chart',label:'ขีดจำกัดการใช้งาน'}]};
function aiSend(text){text=text.trim();if(!text||ST.AI.busy)return;
 if(ST.QUOTA&&ST.QUOTA.blocked&&AI_LIVE()&&+new Date(ST.QUOTA.resetAt)>Date.now()){ST.AI.notice={kind:'limit',reason:ST.QUOTA.reason==='tokens'?'user':(ST.QUOTA.reason||'user'),...(ST.QUOTA.resetAt?{resetAt:ST.QUOTA.resetAt}:{})};aiRefresh();quotaPaint();return}
 let c=curChat();if(!c){c={id:Date.now(),title:text.slice(0,AI_TITLE_MAX),t:Date.now(),msgs:[]};ST.CH.list.unshift(c);ST.CH.cur=c.id}
 c.msgs.push({who:'u',text});c.t=Date.now();ST.AI.busy=true;ST.AI.typing=true;ST.AI.notice=null;ST.AI.draft='';saveCH();aiRefresh(true);
 const paint=()=>{try{aiRefresh(true);aiRenderDrawer($('dSearch')?.value||'')}catch(err){console.warn('ai paint',err)}};
 if(AI_LIVE()){aiAsk(text,c.msgs.filter(m=>m.text).map(m=>({who:m.who,text:m.text})).slice(-8)).then(r=>{
   if(r&&r.notice){c.msgs.pop();saveCH();ST.AI.draft=text;ST.AI.notice=r.notice;if(r.notice.kind==='limit'&&r.notice.reason!=='global')usageRefresh();ST.AI.busy=false;ST.AI.typing=false;paint();quotaPaint();return}
   c.msgs.push({who:'a',text:r.text,...(r.cards.length?{cards:r.cards}:{})});c.t=Date.now();saveCH();ST.AI.busy=false;ST.AI.typing=false;if(ST.CH.cur===c.id)paint();quotaPaint();
 }).catch(err=>{c.msgs.pop();saveCH();ST.AI.draft=text;ST.AI.notice={kind:'error'};ST.AI.busy=false;ST.AI.typing=false;paint()});return}
 setTimeout(()=>{const r=aiReply(text);c.msgs.push({who:'a',...r});c.t=Date.now();saveCH();ST.AI.busy=false;ST.AI.typing=false;if(ST.CH.cur===c.id)paint()},AI_REPLY_MS)}
Object.assign(window, { date, bump, aiMsg, closeAnyDrawer, itemMenu, promptRename, ACTIONS, aiSend });

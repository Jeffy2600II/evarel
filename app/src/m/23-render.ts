/* ===== MODULE: render ===== */
function countUp(el){const to=+el.dataset.count,t0=performance.now(),dur=700;const f=t=>{const k=Math.min(1,(t-t0)/dur);el.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function setBar(el,v){const k=el.dataset.kind;if(k==='arc')el.style.strokeDashoffset=ARC_C*(1-v/100);else if(k==='col')el.style.transform=`scaleY(${v/100})`;else if(el.closest('.ev-prog'))el.style.setProperty('--w',v);else el.style.width=v+'%'}
function growBars(root,anim){root.querySelectorAll('[data-to]').forEach(el=>{const to=Math.max(0,Math.min(100,+el.dataset.to||0)),k=el.dataset.k||'';setBar(el,anim?0:(UI.lastW[k]??0));UI.lastW[k]=to;requestAnimationFrame(()=>requestAnimationFrame(()=>setBar(el,to)))})}
let settleT:any=0,renderBusy=false; /* ธงช่วง render() กัน observer จับ node ที่ render เขียนทั้งก้อน (เทียบ innerHTML ของเดโม ไม่ใส่ ev-in) */
function render(){renderBusy=true;const H=document.documentElement;try{if(UI.animate){H.removeAttribute('data-settled');clearTimeout(settleT);settleT=0}document.body.dataset.auth=UI.auth.status==='in'?'in':'out';if(UI.auth.status!=='in'){(window as any).EvarelMount?.unmountApp();(window as any).EvarelMount?.unmountOne?.('sheet');$('app').innerHTML='';$('sheet')&&($('sheet').innerHTML='');renderAuthRoot();return}$('auth').hidden=true;$('auth').dataset.screen='';(window as any).EvarelMount?.unmountOne('auth');
 const root=$('app'),anim=UI.animate&&!UI.loading;(window as any).EvarelMount?.unmountApp(); /* ปลด React root เดิมก่อนเขียนทับ — เฉพาะของที่อยู่ใน #app/#nav ไม่แตะชั้นลอยที่เปิดค้าง */
 root.innerHTML=UI.loading?skeleton():UI.error?errorView():VIEWS[UI.tab]();
 const rm=(window as any).EvarelMount?.commit(root)||false; /* mount จริงต้องเสร็จก่อน countUp/growBars */
 root.classList.toggle('ev-enter',anim);[...root.children].forEach((c,i)=>c.style.setProperty('--i',i));
 root.querySelectorAll('[data-count]').forEach(el=>anim?countUp(el):(el.textContent=el.dataset.count));
 growBars(root,anim);UI.weekDir=0;if(!rm){if(UI.tab==='calendar'&&!UI.loading&&!UI.error)mountMain();else destroyCal('main')} /* rm=true: React effect จัดการ FullCalendar เอง */
 UI.animate=false;
 const tabs=TABS.map(([id,l,ic])=>`<li><button data-tab="${id}" ${UI.tab===id?'aria-current="page"':''}><span class="pill">${icon(ic)}</span>${l}</button></li>`);
 tabs.splice(2,0,`<li><button class="add" data-act="add" aria-label="เพิ่มรายการ">${icon('plus')}</button></li>`);
 const MT=(window as any).EvarelMount;
 /* S4: nav เป็น React จริงเมื่อพร้อม (mountAt ลง #nav ตรงๆ) ไม่พร้อมใช้ string เดิม */
 if(MT?.ready('nav')){MT.unmountOne('nav');$('nav').innerHTML='';MT.mountAt($('nav'),'nav',{tab:UI.tab})}
 else $('nav').innerHTML=tabs.join('');
 updateLive();refreshDetail();
 /* แจ้ง store กลางที่ React subscribe ได้ (s4f-store-react): งานสุดท้ายของรอบ ห่อ try เพื่อให้ผู้ฟังพังแล้วไม่ล้ม render | ไม่มีผู้ฟัง/ไม่มี store = ไม่ทำอะไร */
 if(!H.dataset.settled&&!settleT)settleT=setTimeout(()=>{H.dataset.settled='1';settleT=0},1300); /* v24: เล่นอนิเมชั่นเข้าครั้งเดียว — 1.3 วิหลัง render ปิดอนิเมชั่นเข้าทั้งแอป */
 try{(window as any).EvarelStore?.notify()}catch(e){console.warn('store notify',e)}}catch(err){console.warn('render',err)}finally{renderBusy=false}}
/* v22/v23: อนิเมชั่นเข้าเล่นครั้งเดียว — เล่นจบแล้วถอดคลาส/แอตทริบิวต์ กันเล่นซ้ำตอนองค์ประกอบถูกแสดงใหม่ */
document.addEventListener('animationend',e=>{const b=e.target as HTMLElement;if(b.matches&&b.matches('.ev-check[data-pop]')){b.removeAttribute('data-pop');if(UI.pop!=null)UI.pop=null}},true);
let enterT:any=0;document.addEventListener('animationend',()=>{clearTimeout(enterT);enterT=setTimeout(()=>{$('app')?.classList.remove('ev-enter');document.querySelectorAll<HTMLElement>('.ev-page[data-enter]').forEach(p=>p.removeAttribute('data-enter'))},300)},true);
/* ===== v22/v23 ตามเดโม (ui/patch ของเดโมต่อ onNodeAdded ของ morphdom): เฉพาะ node ที่เพิ่มเข้ามาใหม่เท่านั้นที่เล่น rise (.ev-in) ครั้งเดียว =====
   เดโมได้ node ใหม่จาก morphdom ตอน patch — แอปได้ node ใหม่จาก React (reconcile คงของเดิมไว้) และ innerHTML จึงใช้ MutationObserver แทน:
   - ตัดตามเดโม: svg/ตัวเล็ก (small,span,i,b,label,input)/ปุ่ม/ชิป/ev-sub/แถบท้าย sheet ไม่เล่น · ของที่ฝังใน .ev-in อยู่แล้วไม่ซ้ำ · แถวตั้งค่า/แถบท้าย/แถบนำทางไม่เล่น
   - ชั้นที่เดโมไม่ patch (dialog/pop/auth/toast เป็น innerHTML ตรง) ไม่ใส่ ev-in เหมือนกัน
   - เนื้อหา #sheet ใส่เฉพาะตอน "อัปเดตขณะเปิดแล้ว" (data-open=true) — ครั้งแรกที่เปิดคือ innerHTML ตามเดโม ไม่เล่น
   - ระหว่าง render() หลัก (สลับหน้า/อัปเดตในหน้า) #app ถูกเขียนใหม่ทั้งก้อนเหมือน innerHTML ของเดโม ไม่ใส่ ev-in (ของใหม่จริงใน React เพิ่มทีหลังจะยังถูกจับ)
   - ตอน UI.loading (skeleton) ไม่ใส่ เพื่อให้ skeleton นิ่งเหมือนเดโม
   การเล่นจริงเมื่อไหร่/ที่ไหน กำหนดโดย CSS ของเดโมที่อยู่ใน design.css อยู่แล้ว (.ev-in ทั่วไป · .ev-sheet .ev-in ตามจังหวะ sheetIn · html[data-settled] ปิดใน #app/.ev-page) */
const EV_IN_SELF='svg,svg *,small,span,i,b,label,input,button,.ev-chip,.ev-sub,.ev-sheet-foot';
new MutationObserver(rs=>{if(renderBusy||(window as any).UI?.loading)return;
 for(const r of rs){if(r.type!=='childList')continue;
  for(const n of r.addedNodes){const el=n as any;if(!el||el.nodeType!==1||el.dataset&&el.dataset.evInSeen)continue;
   try{
    /* ตามจังหวะ morphdom ของเดโม: ก่อน diff ใส่ node ใหม่ เดโม sync attribute ของ node เดิม (คลาส ev-in ที่ใส่ระหว่างทางถูกเช็ดออก) — เช็ด ev-in ของ parent ตรงนี้ให้เหมือนกัน */
    const par=el.parentElement;
    if(par&&par.classList.contains('ev-in')){par.classList.remove('ev-in');try{delete par.dataset.evInSeen}catch(e2){}}
    if(par&&par.closest('.ev-in'))continue; /* บรรพบนที่ยังเป็น .ev-in (เช่นข้ามหนึ่งชั้น) — ลูกไม่ซ้ำอนิเมชั่น ตามเดโม */
    /* ชั้นลอยที่เดโมใช้ patch เฉพาะ “ตอนเปิดค้าง” — เนื้อหาแรกตอนเปิดคือ innerHTML ของเดโม ไม่ใส่ ev-in: ดู data-open ณ ตอนเพิ่ม */
    const inSheet=!!el.closest('#sheet');
    if(inSheet&&$('sheet')?.dataset.open!=='true')continue;
    const inPage=!!el.closest('#page');
    if(inPage&&$('page')?.dataset.open!=='true')continue;
    if(!inSheet&&!inPage&&el.closest('#dialog,#pop,#auth,#toast,#app,#nav'))continue;
    if(el.matches(EV_IN_SELF)||el.closest('button,.ev-set-row,#nav,nav,.ev-sheet-foot'))continue;
    el.dataset.evInSeen='1';el.classList.add('ev-in');
    el.addEventListener('animationend',()=>{el.classList.remove('ev-in');try{delete el.dataset.evInSeen}catch(e2){}},{once:true});
    setTimeout(()=>{el.classList.remove('ev-in');try{delete el.dataset.evInSeen}catch(e2){}},1200); /* อนิเมชั่นถูกปิด (settled/lite) ไม่มี animationend — เคลียร์เอง */
   }catch(e){console.warn('ev-in',e)}}}}).observe(document.body,{childList:true,subtree:true});
/* ย้ายข้อมูลเดิมครั้งเดียว (v11/v12 เก็บที่คีย์ไม่มี :userId) -> คีย์ของผู้ใช้ที่ล็อกอิน | คัดลอกเท่านั้น ไม่ลบต้นฉบับ (เป็นสำรอง)
   ทำเมื่อ: ผู้ใช้ยังไม่มีข้อมูลของตัวเอง และมีข้อมูลเดิมที่อ่านได้ ; ทำครั้งเดียวต่อเครื่อง (ธง evarel-legacy-claimed) */
function claimLegacyData(){try{if(!ST.USER||localStorage.getItem('evarel-legacy-claimed'))return;
 const own=localStorage.getItem(uk(STORE_KEY)),old=localStorage.getItem(STORE_KEY);
 if(!own&&old){const j=JSON.parse(old);if(j&&Array.isArray(j.items)&&j.items.length){localStorage.setItem(uk(STORE_KEY),old);
  [[TIMER_KEY],[CHATS_KEY]].forEach(([k])=>{const v=localStorage.getItem(k);if(v&&!localStorage.getItem(uk(k)))localStorage.setItem(uk(k),v)});
  localStorage.setItem('evarel-legacy-claimed',ST.USER.id)}}}catch(err){console.warn('claim legacy',err)}}
ST._render=render;

Object.assign(window, { countUp, setBar, growBars, render, claimLegacyData });

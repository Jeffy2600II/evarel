/* ===== MODULE: ui/layers (sheet · page · lock · focus trap · history · drag) ===== */
const $=id=>document.getElementById(id),sheet=$('sheet'),scrim=$('scrim'),page=$('page'),dialog=$('dialog'),pop=$('pop');
const LAYERS=[],BEHIND=['app','nav','live'];let scrollY0=0;
function lock(on){const b=document.body;if(on&&b.dataset.lock!=='true'){scrollY0=scrollY;b.style.top=`-${scrollY0}px`;b.dataset.lock='true'}
 else if(!on&&b.dataset.lock==='true'){b.dataset.lock='false';b.style.top='';scrollTo(0,scrollY0)}
 BEHIND.forEach(id=>{const e=$(id);on?e.setAttribute('inert',''):e.removeAttribute('inert')})}
const refreshInert=()=>LAYERS.forEach((l,i)=>l.el.toggleAttribute('inert',i<LAYERS.length-1));
function pushLayer(layer){layer.opener=document.activeElement;LAYERS.push(layer);refreshInert();lock(true);
 try{history.pushState({ev:LAYERS.length},'');layer.pushed=true}catch(e){console.warn('history',e)}
 layer.el.hidden=false;void layer.el.offsetWidth;layer.el.dataset.open='true';perfProbe();if(layer.kind==='sheet'){scrim.dataset.open='true'}
 /* v18/v24 ตามเดโม: หลังเปิดชั้น 60ms ย้ายโฟกัสเข้าชั้นนั้น — sheet โฟกัสตัวมันเอง (tabIndex=-1 + กลบ outline) เพื่อไม่เปิดคีย์บอร์ดเอง (เดโมทำแบบนี้)
    ชั้นอื่นโฟกัสองค์ประกอบแรกที่ใช้งานได้ ([autofocus],input,button:not(.ev-icon-btn)) ไม่มีก็โฟกัสตัวชั้น เพื่อให้คีย์บอร์ด/มือถือเข้าถึงได้เหมือนเดโม */
 setTimeout(()=>{let t;if(layer.kind==='sheet'){layer.el.tabIndex=-1;layer.el.style.outline='0';t=layer.el}else t=layer.el.querySelector('[autofocus],input,button:not(.ev-icon-btn)')||layer.el;t?.focus?.({preventScroll:true})},60)}
function popLayer(){const l=LAYERS.pop();if(!l)return;l.el.dataset.open='false';l.el.style.transform='';l.el.dataset.drag='false';
 if(!LAYERS.some(x=>x.kind==='sheet')){scrim.dataset.open='false';scrim.style.opacity='';scrim.style.transition=''}refreshInert();
 setTimeout(()=>{if(l.el.dataset.open==='false'){l.el.hidden=true;delete l.el.dataset.exit}if(l.remove)l.el.remove()},LAYER_ANIM_MS);if(!LAYERS.length)lock(false);
 l.onClose?.();l.opener?.focus?.({preventScroll:true})}
const CONFIRM={fn:null};
function sheetGuard(){if(ST.sheetMode==='form'&&ST.D.dirty){confirmDialog({title:'ทิ้งการเปลี่ยนแปลง?',msg:'สิ่งที่กรอกไว้จะหายไป',keep:'กลับไปแก้',ok:'ทิ้ง',fn:()=>{ST.D.dirty=false;closeTop()}});return true}return false}
function closeTop(){const l=LAYERS[LAYERS.length-1];if(!l)return false;if(l.guard?.())return false;if(l.pushed){history.back()}else popLayer();return true}
addEventListener('popstate',()=>{const l=LAYERS[LAYERS.length-1];if(!l)return;if(l.guard?.()){try{history.pushState({ev:LAYERS.length},'')}catch(e){console.warn('history',e)}return}popLayer()});
scrim.addEventListener('click',closeTop);
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!pop.hidden)closePop();else closeTop()}
 if(e.key==='Tab'&&LAYERS.length){const el=LAYERS[LAYERS.length-1].el,f=[...el.querySelectorAll('button:not([disabled]),input,select,[tabindex="0"]')].filter(x=>x.offsetParent);
  if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
function setSheet(title,body,o={}){const MT=(window as any).EvarelMount;
 /* S4: โครง sheet เป็น React จริงเมื่อพร้อม; caller ส่ง o.page = เนื้อเป็น React จริง (ฟอร์ม 14) ไม่ส่ง = html เดิม
    v24 ตามจังหวะ ui/patch ของเดโม: ถ้า root ของ sheet ยังอยู่ ให้ rerender ทับตำแหน่งเดิมแทน unmount+mount ใหม่
    — React reconcile คง node เดิมไว้ ของที่ไม่เปลี่ยนไม่ขยับ เฉพาะของใหม่เท่านั้นที่เพิ่มเข้ามา (เทียบ patch ของเดโม)
    ทำให้อนิเมชั่นเข้า .ev-in ของเนื้อใหม่ + sheetResize เล่นตรงจังหวะเดียวกับเดโม */
 const props={title,back:!!o.back,foot:o.foot||'',html:body,page:(o as any).page||'',props:(o as any).props||{}};
 if(MT?.ready('sheet')&&MT.els?.sheet===sheet&&MT.roots?.sheet&&MT.rerender('sheet',props))return;
 if(MT?.ready('sheet')){MT.unmountOne('sheet');sheet.innerHTML='';MT.mountAt(sheet,'sheet',props);return}
 sheet.innerHTML=`<div class="ev-grab" data-drag></div><h2 data-drag>${o.back?`<button class="ev-icon-btn" data-flat data-act="dback" aria-label="ย้อนกลับ">${icon('back')}</button>`:''}<span id="sheetTitle" class="grow">${esc(title)}</span><button class="ev-icon-btn" data-flat data-act="close" aria-label="ปิด">${icon('x')}</button></h2><div class="ev-sheet-body" id="sheetBody">${body}</div>${o.foot?`<div class="ev-sheet-foot">${o.foot}</div>`:''}`}
function openSheet(title,body,o={}){setSheet(title,body,o);pushLayer({kind:'sheet',el:sheet,onClose:()=>{ST.sheetMode='';o.onClose?.()},guard:sheetGuard})}
function openDialog(html){const MT=(window as any).EvarelMount;
 /* S4: การ์ด dialog เป็น React จริงเมื่อพร้อม เนื้อ html ยัง raw จาก caller */
 if(MT?.ready('dialogCard')){MT.unmountOne('dialogCard');dialog.innerHTML='';MT.mountAt(dialog,'dialogCard',{html})}
 else dialog.innerHTML=`<div class="ev-dialog-card">${html}</div>`;
 pushLayer({kind:'dialog',el:dialog})}
function confirmDialog(o){CONFIRM.fn=o.fn;const MT=(window as any).EvarelMount;
 /* S4: confirm เป็น React จริงเต็มรูปเมื่อพร้อม (title/msg ผ่าน children แทน esc) */
 if(MT?.ready('confirmCard')){MT.unmountOne('dialogCard');dialog.innerHTML='';MT.mountAt(dialog,'confirmCard',{title:o.title,msg:o.msg,keep:o.keep||'ยกเลิก',ok:o.ok,tone:o.tone});pushLayer({kind:'dialog',el:dialog});return}
 openDialog(`<h3>${o.title}</h3><p class="ev-sub">${o.msg}</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="close">${o.keep||'ยกเลิก'}</button><button class="${o.tone==='primary'?'ev-btn-primary':'ev-btn-solid-danger'}" data-act="cf-ok">${o.ok}</button></div>`)}
dialog.addEventListener('click',e=>{if(e.target===dialog)closeTop()});
const EDGE_BACK_PX=24;
const pageOf=(name:any)=>LAYERS.find(l=>l.name===name)?.el,hasPage=(name:any)=>LAYERS.some(l=>l.name===name);
/* หน้าเต็มจอเป็นสแต็กตามเดโม: สร้าง section.ev-page ใหม่ต่อการเปิด เปิดซ้อนกันได้ไม่จำกัด กลับ/ปัดขอบทีละชั้น หน้าข้างล่างยังอยู่ครบ */
function openPage(html,onClose,name=''){
 const el=document.createElement('section');el.className='ev-page';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.dataset.page=name||'';el.innerHTML=html;el.style.zIndex=String(22+LAYERS.length);document.body.appendChild(el);
 if(name!=='ai')attachGesture(el,{axis:'x',dir:1,size:()=>el.offsetWidth,
  canStart:p=>p.x<=EDGE_BACK_PX&&LAYERS[LAYERS.length-1]?.el===el,
  onStart:()=>{el.dataset.drag='true'},onMove:()=>{},
  spring:(c:boolean,d:number)=>({prop:(x:number)=>`translate3d(${x}px,0,0)`,target:c?el.offsetWidth:0,k:c?260:420,c:c?34:38,maxMs:c?320:520}),
  onEnd:(c:boolean)=>{el.dataset.drag='false';if(c)el.dataset.exit='x';el.style.removeProperty('--gx');el.style.removeProperty('--gp');if(!(c&&closeTop())){delete el.dataset.exit}}});
 el.dataset.enter='true';setTimeout(()=>{delete el.dataset.enter},800);perfProbe();
 pushLayer({kind:'page',name,el,remove:true,onClose:()=>{onClose?.()}});return el}
/* ===== ui/perf (v24): ปรับอนิเมชั่นตามกำลังเครื่อง =====
   auto: เดาจาก CPU/RAM/โหมดประหยัดข้อมูล แล้ววัดเฟรมจริงตอนเปิดหน้าแรก ๆ ถ้าเฉลี่ยต่ำกว่า ~40fps จะสลับเป็น lite และจำไว้
   ผู้ใช้เลือกเองได้ในตั้งค่า (auto · full · lite) */
const PERF_PREF_KEY='evarel-perf-pref',PERF_AUTO_KEY='evarel-perf-auto',PERF_SLOW_MS=24,PERF_PROBE_MS=700;
const perfPref=()=>{try{return localStorage.getItem(PERF_PREF_KEY)||'auto'}catch(e){return 'auto'}};
function perfDetect(){try{const a=localStorage.getItem(PERF_AUTO_KEY);if(a)return a}catch(e){console.warn('perf',e)}
 const c=navigator.hardwareConcurrency||8,m=(navigator as any).deviceMemory||8;return (c<=4||m<=3||(navigator as any).connection?.saveData)?'lite':'full'}
function perfApply(){const p=perfPref();document.documentElement.dataset.perf=p==='auto'?perfDetect():p}
perfApply();
let perfProbing=false;
function perfProbe(){if(perfProbing||perfPref()!=='auto'||document.documentElement.dataset.perf==='lite')return;perfProbing=true;const d:number[]=[];let last=0,t0=0;
 const tick=(t:number)=>{if(last)d.push(t-last);last=t;if(!t0)t0=t;if(t-t0<PERF_PROBE_MS){requestAnimationFrame(tick);return}
  perfProbing=false;if(d.length<10)return;d.sort((a,b)=>a-b);if(d[d.length>>1]>PERF_SLOW_MS){try{localStorage.setItem(PERF_AUTO_KEY,'lite')}catch(e){console.warn('perf',e)}perfApply()}};
 requestAnimationFrame(tick)}
/* ===== ui/native (v24): ยกช่องพิมพ์พ้นคีย์บอร์ดผ่าน --kb + สีแถบสถานะตามธีม ===== */
const kbSync=()=>{const v=window.visualViewport;if(!v)return;document.documentElement.style.setProperty('--kb',Math.max(0,Math.round(innerHeight-v.height-v.offsetTop))+'px')};
window.visualViewport?.addEventListener('resize',kbSync);window.visualViewport?.addEventListener('scroll',kbSync);
/* โฟกัสช่องพิมพ์แล้วคีย์บอร์ดค่อยเปิด: ยิง kbSync ซ้ำสั้นๆ ให้ dock ตามทัน (กรณีเติมข้อความจากชิป/โฟกัสโดยโปรแกรม) */
document.addEventListener('focusin',e=>{const n:any=e.target;if(n&&(n.tagName==='TEXTAREA'||n.tagName==='INPUT'))[60,180,360].forEach(ms=>setTimeout(kbSync,ms))});
function syncThemeColor(){const m=document.querySelector('meta[name="theme-color"]') as HTMLMetaElement|null;if(m)m.content=getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim()||'#F7F7F9'}
window.matchMedia?.('(prefers-color-scheme:dark)').addEventListener?.('change',syncThemeColor);
/* ===== เอนจินติดตามนิ้ว (ระดับมืออาชีพ: แนวเดียวกับ native / Vaul / Framer Motion) =====
   1) Pointer Events ชุดเดียว + setPointerCapture (นิ้ว/เมาส์/ปากกา) · touch-action ประกาศแกนที่ยอมให้เบราว์เซอร์จัดการ เบราว์เซอร์ตัดสินแกนเองที่ compositor ไม่ต้องรอ JS
   2) ไม่เขียน style ทีละพิกเซล: เก็บตำแหน่งในตัวแปร แล้วเขียน "ครั้งเดียวต่อเฟรม" ด้วย rAF เป็น CSS variable (--gx พิกเซล, --gp 0-1) บน element เดียว
      transform/opacity ทั้งหมดคำนวณใน CSS จากตัวแปรนั้น (translate3d + calc) = compositor-only ไม่ trigger layout
   3) getCoalescedEvents(): ใช้ทุกจุดย่อยของเฟรมคำนวณความเร็ว (แม่นกว่า ตำแหน่งยังใช้จุดล่าสุด)
   4) ความเร็ว = ถดถอยเชิงเส้นของจุดในหน้าต่าง 100ms (ทน noise กว่าใช้สองจุดปลาย)
   5) ปล่อยนิ้ว = Web Animations API บน compositor thread เริ่ม "จากตำแหน่งปัจจุบัน + ความเร็วนิ้ว" ด้วยสปริงหน่วงจริง (คำนวณ keyframes ล่วงหน้า) ไม่กิน main thread
      แตะซ้ำระหว่างแอนิเมชันได้ (interruptible): อ่านตำแหน่ง ณ ตอนนั้น ยกเลิกแอนิเมชัน แล้วลากต่อทันที
   6) rubber-band เมื่อลากสวนทิศ/เกินขอบ · will-change เฉพาะตอนลาก
   cfg: {axis, dir, size(), mover?, scroll, handle, canStart(p,t), mouseAny, onStart(), onMove(delta,ratio), onEnd(commit,delta,velocity)}
        settle?: {from:(d)=>keyframe, to:(commit)=>keyframe} ถ้าให้มา engine เล่นสปริงให้เอง (ไม่ต้องพึ่ง CSS transition) */

const G={SLOP:4,FLING:.55,RATIO:.35,STALE_MS:80,VWIN:100};
function gScrolledAway(target:any,root:any,axis:string,dir:number){for(let n=target;n&&n!==root&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);
 if(axis==='y'&&/(auto|scroll)/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight+1&&(dir>0?n.scrollTop>0:n.scrollTop+n.clientHeight<n.scrollHeight-1))return true;
 if(axis==='x'&&/(auto|scroll)/.test(cs.overflowX)&&n.scrollWidth>n.clientWidth+1&&(dir>0?n.scrollLeft>0:n.scrollLeft+n.clientWidth<n.scrollWidth-1))return true}return false}
/* สปริงหน่วงจริง (critically/under-damped) -> keyframes ของ WAAPI: x(t) จาก x0 ความเร็ว v0 ไป 0 (ปลายทางคือ 0 หลังเลื่อนระบบพิกัด) */
function springFrames(x0:number,v0:number,k=420,c=38,m=1,N=28,maxMs=520){const out:number[]=[];const wn=Math.sqrt(k/m),z=c/(2*Math.sqrt(k*m));let dur=maxMs;
 for(let i=0;i<=N;i++){const t=(i/N)*(dur/1000);let x:number;
  if(z<1){const wd=wn*Math.sqrt(1-z*z);x=Math.exp(-z*wn*t)*(x0*Math.cos(wd*t)+((v0+z*wn*x0)/wd)*Math.sin(wd*t))}
  else x=Math.exp(-wn*t)*(x0+(v0+wn*x0)*t);out.push(x)}
 return {frames:out,dur}}
function attachGesture(el:any,cfg:any){
 const st:any={id:-1,track:false,on:false,a0:0,c0:0,o:0,delta:0,blocked:false,pts:[] as number[][],raf:0,pend:-1,anim:null as any};
 const mv=()=>cfg.mover||el;
 const ax=(p:any)=>cfg.axis==='x'?p.x:p.y,cx=(p:any)=>cfg.axis==='x'?p.y:p.x,size=()=>Math.max(1,cfg.size());
 const SLOP=cfg.slop??G.SLOP;
 /* เขียนครั้งเดียวต่อเฟรม: ตัวแปร CSS บน mover (CSS คำนวณ transform/opacity เอง) แล้วเรียก onMove เพื่อ side effect ที่ CSS ทำไม่ได้ */
 const paint=()=>{st.raf=0;if(!st.on||st.pend<0)return;const d=st.pend;st.pend=-1;const m=mv();m.style.setProperty('--gx',d+'px');m.style.setProperty('--gp',String(Math.min(1,d/size())));cfg.onMove(d,Math.min(1,d/size()))};
 const flush=()=>{if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}if(st.pend>=0&&st.on){const d=st.pend;st.pend=-1;const m=mv();m.style.setProperty('--gx',d+'px');m.style.setProperty('--gp',String(Math.min(1,d/size())));cfg.onMove(d,Math.min(1,d/size()))}};
 const rubber=(d:number)=>d;           /* ทิศที่ยอมให้เลื่อนมีเพดานตามขนาด · สวนทิศ = ต้านแบบยาง */
 const vel=()=>{const h=st.pts;if(h.length<2)return 0;const n=h.length,t0=h[0][0];let sx=0,sy=0,sxx=0,sxy=0;for(const [t,a] of h){const x=t-t0;sx+=x;sy+=a;sxx+=x*x;sxy+=x*a}const den=n*sxx-sx*sx;return den?((n*sxy-sx*sy)/den)*cfg.dir:0};
 const begin=(p:any,target:any,id:number)=>{if(cfg.canStart&&!cfg.canStart(p,target))return;const inHandle=!!(cfg.handle&&target?.closest?.(cfg.handle));
  /* แตะซ้ำระหว่างแอนิเมชันปล่อยนิ้ว = จับตำแหน่งปัจจุบันแล้วลากต่อทันที */
  if(st.anim){try{const m=mv();const cs=getComputedStyle(m);const tr=cs.transform;st.anim.cancel();st.anim=null;if(tr&&tr!=='none'){const mat=new DOMMatrixReadOnly(tr);m.style.setProperty('--gx',(cfg.axis==='x'?mat.m41*cfg.dir:mat.m42*cfg.dir)+'px')}}catch{st.anim=null}}
  Object.assign(st,{id,track:true,on:false,a0:ax(p),c0:cx(p),o:0,delta:0,pts:[[performance.now(),ax(p)]],pend:-1,blocked:!inHandle&&!!cfg.scroll&&gScrolledAway(target,el,cfg.axis,cfg.dir)})};
 const move=(p:any,coal?:any[])=>{if(!st.track)return false;const a=ax(p),raw=a-st.a0,d0=raw*cfg.dir,c=Math.abs(cx(p)-st.c0);
  if(!st.on){if(Math.abs(raw)<SLOP&&c<SLOP)return false;if(d0>0&&Math.abs(raw)>=c&&!st.blocked){st.on=true;st.o=a;const m=mv();m.style.willChange='transform';m.style.transition='none';cfg.onStart?.()}else{st.track=false;return false}}
  const now=performance.now();if(coal&&coal.length)for(const ce of coal)st.pts.push([ce.timeStamp?performance.timeOrigin+ce.timeStamp-performance.timeOrigin:now,ax({x:ce.clientX,y:ce.clientY})]);else st.pts.push([now,a]);
  while(st.pts.length>2&&now-st.pts[0][0]>G.VWIN)st.pts.shift();
  st.delta=Math.max(0,rubber((a-st.o)*cfg.dir));st.pend=st.delta;if(!st.raf)st.raf=requestAnimationFrame(paint);return true};
 const end=()=>{if(!st.track)return;const was=st.on;st.track=false;st.on=false;flush();const m=mv();
  if(!was){return}
  const stale=performance.now()-(st.pts[st.pts.length-1]?.[0]||0)>G.STALE_MS*2;const v=stale?0:vel();
  const commit=st.delta>size()*(cfg.ratio||G.RATIO)||v>(cfg.fling||G.FLING);
  /* ปล่อย: ล้างตัวแปรลาก แล้วให้ onEnd ตั้งสถานะปลายทาง · เล่นสปริงต่อจากตำแหน่ง+ความเร็วปัจจุบัน (ถ้า cfg.spring) ด้วย WAAPI บน compositor */
  const startD=st.delta;m.style.willChange='';m.style.transition='';
  cfg.onEnd(commit,startD,v);
  if(cfg.spring&&m.animate){try{const tgt=cfg.spring(commit,startD);/* tgt: {prop:(x)=>string, target:number} — target = ระยะปลายทางของ "ตัวแปรลาก" เทียบกับ CSS สถานะใหม่ */
    const from=startD-tgt.target;const sp=springFrames(from*cfg.dir,v*1000*cfg.dir,tgt.k,tgt.c,1,28,tgt.maxMs||520);
    const kf=sp.frames.map((x:number,i:number)=>({transform:tgt.prop(x*cfg.dir),offset:i/28}));
    st.anim=m.animate(kf,{duration:sp.dur,easing:'linear',composite:'replace'});const a=st.anim;a.onfinish=a.oncancel=()=>{if(st.anim===a)st.anim=null}}catch{st.anim=null}}};
 /* Pointer Events ชุดเดียว (นิ้ว/เมาส์/ปากกา) — touchmove ไม่ต้อง preventDefault: ใช้ touch-action บน element เป็นตัวบอกแกนที่ปล่อยให้เบราว์เซอร์ */
 el.addEventListener('pointerdown',(e:any)=>{if(e.pointerType==='mouse'){if(e.button)return;if(!cfg.mouseAny&&!(cfg.handle&&e.target.closest?.(cfg.handle)))return}
  if(st.track&&st.id!==e.pointerId)return;begin({x:e.clientX,y:e.clientY},e.target,e.pointerId)},{passive:true});
 const onMove=(e:any)=>{if(!st.track||e.pointerId!==st.id)return;const wasOn=st.on;const coal=e.getCoalescedEvents?.();const moved=move({x:e.clientX,y:e.clientY},coal&&coal.length?coal:undefined);
  if(st.on&&!wasOn){try{el.setPointerCapture(e.pointerId)}catch{}}};
 el.addEventListener('pointermove',onMove,{passive:true});
 const onUp=(e:any)=>{if(e.pointerId!==st.id)return;try{el.releasePointerCapture(e.pointerId)}catch{}end();st.id=-1};
 el.addEventListener('pointerup',onUp);el.addEventListener('pointercancel',onUp);
 /* เมาส์ที่ออกนอก element: pointer capture ดูแลแล้ว · ปล่อยนอกหน้าต่าง -> lostpointercapture */
 el.addEventListener('lostpointercapture',(e:any)=>{if(e.pointerId===st.id&&st.on){end();st.id=-1}});
 return st}
/* ลากปิด sheet: ใช้เอนจินกลาง (แทน pointer drag เดิม) ปิดเมื่อลากเกิน 35% ของความสูง หรือเร็วเกิน .55 px/ms */
attachGesture(sheet,{axis:'y',dir:1,scroll:true,handle:'.ev-grab,h2',size:()=>sheet.offsetHeight,
 /* ตำแหน่งระหว่างลากอยู่ใน --gx (CSS ประกอบ transform + ความจางของม่าน) · ตอนปล่อยเล่นสปริงต่อจากความเร็วนิ้ว: ปิด = สปริงไปพ้นขอบล่าง, ไม่ปิด = เด้งกลับ 0 */
 onStart:()=>{sheet.dataset.drag='true';scrim.style.transition='none'},onMove:(d:number,r:number)=>{scrim.style.opacity=String(1-r)},
 spring:(c:boolean,d:number)=>({prop:(x:number)=>`translate3d(0,${x}px,0)`,target:c?sheet.offsetHeight:0,k:c?260:420,c:c?34:38,maxMs:c?340:520}),
 onEnd:(c:boolean)=>{sheet.dataset.drag='false';sheet.style.removeProperty('--gx');sheet.style.removeProperty('--gp');if(!(c&&closeTop())){scrim.style.opacity='';scrim.style.transition=''}else{scrim.style.opacity='';scrim.style.transition=''}}});
/* moved by move_defs (evarel-ts-1f) */
function closePop(){if(pop.hidden)return;pop.dataset.open='false';ST.popBtn?.setAttribute?.('aria-expanded','false');ST.popBtn=null;setTimeout(()=>{if(pop.dataset.open==='false')pop.hidden=true},170)}

Object.assign(window, { pageOf, hasPage, $, sheet, scrim, page, dialog, pop, LAYERS, BEHIND, scrollY0, lock, pushLayer, popLayer, CONFIRM, sheetGuard, closeTop, setSheet, openSheet, openDialog, confirmDialog, openPage, attachGesture, gScrolledAway, refreshInert, G, closePop, perfPref, perfApply, perfDetect, perfProbe, PERF_PREF_KEY, PERF_AUTO_KEY, kbSync, syncThemeColor, EDGE_BACK_PX });

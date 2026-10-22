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
  onStart:()=>{el.dataset.drag='true'},onMove:x=>{el.style.transform=`translateX(${x}px)`},
  onEnd:c=>{el.dataset.drag='false';if(c)el.dataset.exit='x';if(!(c&&closeTop())){delete el.dataset.exit;el.style.transform=''}}});
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
function syncThemeColor(){const m=document.querySelector('meta[name="theme-color"]') as HTMLMetaElement|null;if(m)m.content=getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim()||'#F7F7F9'}
window.matchMedia?.('(prefers-color-scheme:dark)').addEventListener?.('change',syncThemeColor);
/* ===== เอนจินสัมผัสนิ้ว (v24 ui/gesture): ปัดเพื่อปิด ใช้ร่วม sheet · หน้าเต็มจอ · drawer =====
   cfg: {axis:'x'|'y', dir:+1|-1, size():px, scroll:true, handle:'selector', canStart(p,target), mouseAny, onStart(), onMove(delta,ratio), onEnd(commit,delta)}
   กฎเลื่อนซ้อน: ตัดสินใจ "ตอนเริ่มแตะ" ครั้งเดียว ถ้าเนื้อหาข้างในยังเลื่อนกลับได้จะเลื่อนเนื้อหาตามปกติและไม่ปิดตลอดการแตะนั้น */
const G={SLOP:4,FLING:.55,RATIO:.35,STALE_MS:80};
function gScrolledAway(target:any,root:any,axis:string,dir:number){for(let n=target;n&&n!==root&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);
 if(axis==='y'&&/(auto|scroll)/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight+1&&(dir>0?n.scrollTop>0:n.scrollTop+n.clientHeight<n.scrollHeight-1))return true;
 if(axis==='x'&&/(auto|scroll)/.test(cs.overflowX)&&n.scrollWidth>n.clientWidth+1&&(dir>0?n.scrollLeft>0:n.scrollLeft+n.clientWidth<n.scrollWidth-1))return true}return false}
/* เอนจินติดตามนิ้ว (เขียนใหม่): แก้อาการ "ตามช้า แล้วกระตุกปึ๊บ" ที่ต้นเหตุ
   1) ระยะ dead-zone (SLOP) ไม่ถูกทิ้งแล้วกระโดด: เมื่อ lock แกน ใช้ตำแหน่งนิ้ว ณ จุด lock เป็นศูนย์ใหม่ (origin) ให้แผงเริ่มจาก 0 แล้วตามนิ้วทุกพิกเซลต่อเนื่อง
      และตั้ง SLOP เล็กลง (4px) เพราะตัดสินแกนด้วยอัตราส่วนแล้ว
   2) เขียน transform ครั้งเดียวต่อเฟรมด้วย rAF (ใช้ตำแหน่งล่าสุดเสมอ) ไม่เขียนทุก touchmove ที่ถี่กว่าจอ
   3) ความเร็วคำนวณจากตำแหน่งนิ้วจริงในหน้าต่างเวลา 100ms ล่าสุด (ไม่ใช่ EMA ของค่าที่กระโดด) fling จึงแม่น
   4) ปิด transition แบบ inline ตอนเริ่มลาก (ชนะกฎ CSS ทุกชั้น) แล้วคืนค่าตอนปล่อย
   5) pointercapture/touch-action ให้เบราว์เซอร์ไม่แย่งนิ้วไปเลื่อนเอง เมื่อ lock แล้ว preventDefault ทุก move */
function attachGesture(el:any,cfg:any){const st:any={track:false,on:false,a0:0,c0:0,o:0,delta:0,blocked:false,hist:[] as number[][],raf:0,pend:-1};
 const ax=(p:any)=>cfg.axis==='x'?p.x:p.y,cx=(p:any)=>cfg.axis==='x'?p.y:p.x,size=()=>Math.max(1,cfg.size());
 const SLOP=cfg.slop??4;
 const paint=()=>{st.raf=0;if(!st.on||st.pend<0)return;const d=st.pend;st.pend=-1;cfg.onMove(d,Math.min(1,d/size()))};
 const flush=()=>{if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}if(st.pend>=0&&st.on){const d=st.pend;st.pend=-1;cfg.onMove(d,Math.min(1,d/size()))}};
 const begin=(p:any,target:any)=>{if(cfg.canStart&&!cfg.canStart(p,target))return;const inHandle=!!(cfg.handle&&target?.closest?.(cfg.handle));
  Object.assign(st,{track:true,on:false,a0:ax(p),c0:cx(p),o:0,delta:0,hist:[[performance.now(),ax(p)]],pend:-1,blocked:!inHandle&&!!cfg.scroll&&gScrolledAway(target,el,cfg.axis,cfg.dir)})};
 const move=(p:any,stop?:any)=>{if(!st.track)return;const a=ax(p),raw=a-st.a0,d0=raw*cfg.dir,c=Math.abs(cx(p)-st.c0);
  if(!st.on){if(Math.abs(raw)<SLOP&&c<SLOP)return;if(d0>0&&Math.abs(raw)>=c&&!st.blocked){st.on=true;st.o=a;(cfg.mover||el).style.transition='none';cfg.onStart?.()}else{st.track=false;return}}
  stop?.();const now=performance.now();st.hist.push([now,a]);while(st.hist.length>2&&now-st.hist[0][0]>100)st.hist.shift();
  st.delta=Math.max(0,(a-st.o)*cfg.dir);st.pend=st.delta;if(!st.raf)st.raf=requestAnimationFrame(paint)};
 const end=()=>{if(!st.track)return;const was=st.on;st.track=false;st.on=false;flush();if(!was)return;
  const now=performance.now(),h=st.hist,last=h[h.length-1],first=h[0];let v=0;if(last&&first&&last[0]>first[0]&&now-last[0]<=G.STALE_MS*2)v=((last[1]-first[1])*cfg.dir)/(last[0]-first[0]);
  const mv=cfg.mover||el;mv.style.transition='';void mv.offsetWidth;cfg.onEnd(st.delta>size()*(cfg.ratio||G.RATIO)||v>(cfg.fling||G.FLING),st.delta)};
 const tp=(t:any)=>({x:t.clientX,y:t.clientY});
 el.addEventListener('touchstart',(e:any)=>{if(e.touches.length===1)begin(tp(e.touches[0]),e.target)},{passive:true});
 el.addEventListener('touchmove',(e:any)=>{if(e.touches.length===1)move(tp(e.touches[0]),()=>{if(e.cancelable)e.preventDefault()})},{passive:false});
 el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);
 const mm=(e:any)=>move({x:e.clientX,y:e.clientY}),mu=()=>{removeEventListener('pointermove',mm);end()};
 el.addEventListener('pointerdown',(e:any)=>{if(e.pointerType!=='mouse'||e.button)return;if(!cfg.mouseAny&&!(cfg.handle&&e.target.closest?.(cfg.handle)))return;begin({x:e.clientX,y:e.clientY},e.target);if(st.track){addEventListener('pointermove',mm);addEventListener('pointerup',mu,{once:true})}});
 return st}
/* ลากปิด sheet: ใช้เอนจินกลาง (แทน pointer drag เดิม) ปิดเมื่อลากเกิน 35% ของความสูง หรือเร็วเกิน .55 px/ms */
attachGesture(sheet,{axis:'y',dir:1,scroll:true,handle:'.ev-grab,h2',size:()=>sheet.offsetHeight,
 onStart:()=>{sheet.dataset.drag='true';scrim.style.transition='none'},onMove:(d:number,r:number)=>{sheet.style.transform=`translateY(${d}px)`;scrim.style.opacity=String(1-r)},
 onEnd:(c:boolean)=>{sheet.dataset.drag='false';if(!(c&&closeTop())){sheet.style.transform='';scrim.style.opacity='';scrim.style.transition=''}}});
/* moved by move_defs (evarel-ts-1f) */
function closePop(){if(pop.hidden)return;pop.dataset.open='false';ST.popBtn?.setAttribute?.('aria-expanded','false');ST.popBtn=null;setTimeout(()=>{if(pop.dataset.open==='false')pop.hidden=true},170)}

Object.assign(window, { pageOf, hasPage, $, sheet, scrim, page, dialog, pop, LAYERS, BEHIND, scrollY0, lock, pushLayer, popLayer, CONFIRM, sheetGuard, closeTop, setSheet, openSheet, openDialog, confirmDialog, openPage, attachGesture, gScrolledAway, refreshInert, G, closePop, perfPref, perfApply, perfDetect, perfProbe, PERF_PREF_KEY, PERF_AUTO_KEY, kbSync, syncThemeColor, EDGE_BACK_PX });

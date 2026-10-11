/* ===== MODULE: ui/popover (dropdown) ===== */

function closePop(){if(pop.hidden)return;pop.dataset.open='false';ST.popBtn?.setAttribute?.('aria-expanded','false');ST.popBtn=null;setTimeout(()=>{if(pop.dataset.open==='false')pop.hidden=true},170)}
function openPop(anchor,items,o={}){if(ST.popBtn===anchor){closePop();return}closePop();ST.popBtn=anchor;anchor.setAttribute?.('aria-expanded','true');
 pop.innerHTML=items.map(m=>m==='-'?'<hr>':`<button role="menuitem" data-act="${m.act}" data-id="${esc(m.id??'')}" ${m.tone?`data-tone="${m.tone}"`:''}>${icon(m.icon)}<span>${m.label}</span>${m.hint?`<small>${m.hint}</small>`:''}</button>`).join('');
 pop.hidden=false;const r=anchor.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight,vw=innerWidth,vh=innerHeight;
 let left=o.align==='right'?r.right-w:o.align==='center'?r.left+r.width/2-w/2:r.left;left=Math.max(8,Math.min(vw-w-8,left));
 const below=o.prefer!=='up'&&r.bottom+6+h<vh-8,top=below?r.bottom+6:Math.max(8,r.top-h-8);
 pop.style.left=left+'px';pop.style.top=top+'px';pop.style.transformOrigin=`${below?'top':'bottom'} ${o.align==='right'?'right':o.align==='center'?'center':'left'}`;void pop.offsetWidth;pop.dataset.open='true'}
document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!e.target.closest('#pop')&&!(ST.popBtn&&ST.popBtn.contains(e.target)))closePop()});
addEventListener('scroll',closePop,true);addEventListener('resize',closePop);


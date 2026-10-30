import { popPlace } from './core/popover.js';
/* ===== MODULE: ui/popover (dropdown) ===== */


function openPop(anchor,items,o={}){if(ST.popBtn===anchor){closePop();return}closePop();ST.popBtn=anchor;anchor.setAttribute?.('aria-expanded','true');
 pop.innerHTML=items.map(m=>m==='-'?'<hr>':`<button role="menuitem" data-act="${m.act}" data-id="${esc(m.id??'')}" ${m.tone?`data-tone="${m.tone}"`:''}>${icon(m.icon)}<span>${m.label}</span>${m.hint?`<small>${m.hint}</small>`:''}</button>`).join('');
 pop.hidden=false;const r=anchor.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight,vw=innerWidth,vh=innerHeight;
 const {left,top,below}=popPlace(r,w,h,vw,vh,o);
 pop.style.left=left+'px';pop.style.top=top+'px';pop.style.transformOrigin=`${below?'top':'bottom'} ${o.align==='right'?'right':o.align==='center'?'center':'left'}`;void pop.offsetWidth;pop.dataset.open='true'}
document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!e.target.closest('#pop')&&!(ST.popBtn&&ST.popBtn.contains(e.target)))closePop()});
addEventListener('scroll',closePop,true);addEventListener('resize',closePop);


Object.assign(window, { openPop });

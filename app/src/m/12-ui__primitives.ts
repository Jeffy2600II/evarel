/* ===== MODULE: ui/primitives ===== */

const empty=(ic,t,h)=>`<div class="ev-empty"><div class="orb">${icon(ic)}</div><h3>${t}</h3><p>${h}</p></div>`;
const skeleton=()=>`<div class="ev-main" style="padding-top:var(--s4)"><div class="ev-skeleton"></div><div class="ev-skeleton"></div><div class="ev-skeleton"></div></div>`;
const header=(sub,title)=>`<header class="ev-header"><span class="ev-sub">${sub}</span><div class="ev-row" style="gap:10px"><button class="ev-ai-pill" data-act="ai" aria-label="ผู้ช่วย AI">${icon('chat')}ถาม AI</button><button class="ev-avatar" data-act="settings" aria-label="ตั้งค่า">${initial()}</button></div></header><h1 class="ev-title">${title}</h1>`;
const pills=(act,opts,cur)=>`<div class="ev-filters" role="group">${opts.map(([k,l])=>`<button aria-pressed="${cur===k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
function itemRow(it,ds,i,opts={}){const v=val(it,ds),tg=target(it),done=tracked(it)&&isDone(it,ds),multi=it.track==='count'||it.track==='timer',fut=isFuture(ds),sk=skipped(it,ds);
 const lead=it.track==='check'?`<button class="ev-check" role="checkbox" aria-checked="${done}" aria-label="ทำแล้ว: ${esc(it.title)}" data-act="check" data-id="${it.id}" data-date="${ds}" ${UI.pop==it.id&&done?'data-pop="true"':''} ${fut?'disabled':''}>${icon('check')}</button>`:`<span class="ev-badge">${icon(it.track==='timer'?'clock':it.track==='count'?'chart':it.type==='event'?'bell':'cal')}</span>`;
 const tail=it.track==='count'?`<div class="ev-step"><button data-act="dec" data-id="${it.id}" data-date="${ds}" aria-label="ลด" ${v<=0||fut?'disabled':''}>−</button><button data-act="inc" data-id="${it.id}" data-date="${ds}" aria-label="เพิ่ม" ${fut?'disabled':''}>+</button></div>`
  :it.track==='timer'?`<button class="ev-mini" data-tone="solid" data-act="timeropen" data-id="${it.id}" data-date="${ds}" aria-label="จับเวลา">${icon('play')}</button>`:'';
 const sub=[opts.late?`เลยกำหนด ${fmtDate(it.start)}`:'',timeText(it),multi?`${v}/${tg} ${esc(it.unitName)}`:esc(it.subject),sk?'ข้ามวันนี้':''].filter(Boolean).join(' · ');
 return `<li class="ev-list-item" style="--i:${i}" data-state="${done?'done':'todo'}" ${opts.next?'data-next="true"':''}>${lead}<div class="grow" role="button" tabindex="0" data-act="open" data-id="${it.id}" data-date="${ds}"><b>${esc(it.title)}</b><span class="ev-sub">${sub}</span>${multi?`<div class="ev-bar"><i data-full="${v>=tg}" data-k="b-${it.id}-${ds}" data-to="${Math.min(100,Math.round(v/tg*100))}"></i></div>`:''}</div>${tail}</li>`}

/* moved by move_defs (evarel-ts-1f) */
function agendaHTML(ds){const list=onDate(ds);return `<section class="ev-card"><div class="ev-sec-head"><h3 class="ev-group">${dayLab(ds)}<span>${fmtDate(ds)}</span></h3></div>${list.length?`<ul>${list.map((it,i)=>itemRow(it,ds,i)).join('')}</ul>`:empty('inbox','ไม่มีรายการในวันนี้','กดปุ่ม + เพื่อเพิ่มรายการ')}</section>`}

Object.assign(window, { empty, skeleton, header, pills, itemRow, agendaHTML });

/* ===== MODULE: core/undo + toast ===== */
const toastEl=document.getElementById('toast');let toastTimer=0;
function toast(msg,undo){clearTimeout(toastTimer);toastEl.style.setProperty('--toast-ms',TOAST_MS+'ms');
 toastEl.innerHTML=`<span>${esc(msg)}</span>${undo?'<button data-act="undo">ย้อนกลับ</button>':''}`;toastEl._undo=undo||null;
 toastEl.dataset.open='false';void toastEl.offsetWidth;toastEl.dataset.open='true';toastTimer=setTimeout(()=>{toastEl.dataset.open='false'},TOAST_MS)}
const clone=x=>JSON.parse(JSON.stringify(x));
function syncFail(err,restore){console.warn('sync failed',err);restore();ST._render();toast('บันทึกไม่สำเร็จ จึงย้อนค่ากลับให้แล้ว')}
let PENDING=0;
function commit(msg,fn,quiet){const prev=clone(S.items);fn();const next=clone(S.items);ST._render();PENDING++;
 syncChanges(prev,next).catch(err=>syncFail(err,()=>{S.items=prev})).finally(()=>{PENDING--});
 if(!quiet)toast(msg,()=>{S.items=clone(prev);ST._render();PENDING++;syncChanges(next,prev).catch(err=>syncFail(err,()=>{S.items=next})).finally(()=>{PENDING--})})}

/* moved by move_defs (evarel-ts-1f) */
const LP={t:null,fired:false};

Object.assign(window, { toastEl, toastTimer, toast, clone, syncFail, PENDING, commit, LP });

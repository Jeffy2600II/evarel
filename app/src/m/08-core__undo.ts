/* ===== MODULE: core/undo + toast ===== */
const toastEl=document.getElementById('toast');let toastTimer=0;
function toast(msg,undo){clearTimeout(toastTimer);toastEl.style.setProperty('--toast-ms',TOAST_MS+'ms');
 toastEl.innerHTML=`<span>${esc(msg)}</span>${undo?'<button data-act="undo">ย้อนกลับ</button>':''}`;toastEl._undo=undo||null;
 toastEl.dataset.open='false';void toastEl.offsetWidth;toastEl.dataset.open='true';toastTimer=setTimeout(()=>{toastEl.dataset.open='false'},TOAST_MS)}
const clone=x=>JSON.parse(JSON.stringify(x));
function syncFail(err,restore){console.warn('sync failed',err);restore();ST._render();toast('บันทึกไม่สำเร็จ จึงย้อนค่ากลับให้แล้ว')}
/* ตัวนับการบันทึกที่ใช้ข้ามโมดูล: ทุกไฟล์โหลดเป็น type=module ตัวแปร let ของไฟล์นี้จึงมองไม่เห็นจากไฟล์อื่น และ Object.assign(window,{PENDING}) คัดลอกค่า ณ ตอนโหลด (0 ตลอด) ต้องใช้วัตถุเดียวกันที่ window.SYNC
   pending = จำนวน PUT ที่ยังค้าง | writes = นับครั้งที่แก้ข้อมูลในเครื่อง (รวมย้อนกลับ) ให้ liveRefresh เทียบก่อน/หลังดึง ถ้าเปลี่ยนแปลว่าผู้ใช้แก้ระหว่างรอ ผลที่ดึงมาอาจเก่ากว่า ต้องทิ้ง */
const SYNC={pending:0,writes:0};
function commit(msg,fn,quiet){const prev=clone(S.items);fn();const next=clone(S.items);ST._render();SYNC.pending++;SYNC.writes++;
 syncChanges(prev,next).catch(err=>syncFail(err,()=>{S.items=prev})).finally(()=>{SYNC.pending--});
 if(!quiet)toast(msg,()=>{S.items=clone(prev);ST._render();SYNC.pending++;SYNC.writes++;syncChanges(next,prev).catch(err=>syncFail(err,()=>{S.items=next})).finally(()=>{SYNC.pending--})})}

/* moved by move_defs (evarel-ts-1f) */
const LP={t:null,fired:false};

Object.assign(window, { toastEl, toastTimer, toast, clone, syncFail, SYNC, commit, LP });

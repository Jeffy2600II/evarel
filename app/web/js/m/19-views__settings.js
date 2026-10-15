/* ===== MODULE: views/settings ===== */
function notifInfo(){if(!('Notification' in window))return ['ไม่รองรับ','เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน'];const p=Notification.permission;if(p==='denied')return ['ถูกปิดไว้','ต้องเปิดที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์'];if(p==='granted')return pushSavedState()?['อนุญาตแล้ว','เครื่องนี้พร้อมรับการแจ้งเตือน']:['อนุญาตแล้ว แต่ยังไม่ได้ลงทะเบียน','กดปุ่มเพื่อลงทะเบียนเครื่องนี้กับระบบ'];return ['ยังไม่ได้ขอ','กดปุ่มเพื่อให้เครื่องนี้รับการแจ้งเตือนได้']}
const themeNow=()=>document.documentElement.dataset.theme||'auto';
function settingsHTML(){const [st,note]=notifInfo(),total=countNotifiable(S.items);
 return `<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>ตั้งค่า</h2></div><div class="ev-page-scroll">
 <section class="ev-card ev-row" style="gap:14px"><span class="ev-avatar" style="width:52px;height:52px;font-size:20px;display:grid">${initial()}</span><div class="grow"><b>${esc(ST.USER?.name||'ผู้ใช้')}</b><p class="ev-sub" style="overflow:hidden;text-overflow:ellipsis">${esc(ST.USER?.email||'')}</p></div><span class="ev-chip">${ST.USER?.provider==='google'?'Google':'อีเมล'}</span></section>
 <section class="ev-card"><b>ธีม</b><div style="margin-top:12px">${seg('theme',[['auto','ตามเครื่อง'],['light','สว่าง'],['dark','มืด']],themeNow())}</div></section>
 <section class="ev-card"><div class="ev-stat"><div><b>การแจ้งเตือน</b><p class="ev-sub">${note}</p></div><span class="ev-chip">${st}</span></div>${'Notification' in window&&(Notification.permission==='default'||(Notification.permission==='granted'&&!pushSavedState()))?`<button class="ev-btn-primary ev-btn-block" style="margin-top:12px" data-act="notify">${Notification.permission==='granted'?'ลงทะเบียนเครื่องนี้':'อนุญาตการแจ้งเตือน'}</button>`:''}
  <p class="ev-sub" style="margin-top:12px">ตั้งเวลาแจ้งเตือนไว้ ${total} รายการ แจ้งเฉพาะเวลาที่คุณตั้งเท่านั้น เวลาที่ตั้งไว้บันทึกกับบัญชีของคุณและส่งถึงเครื่องนี้ตามเวลา</p></section>
 
 <section class="ev-card"><b>บัญชี</b><div class="ev-form" style="margin-top:12px"><button class="ev-btn-ghost ev-btn-block" data-act="au-signout-ask">ออกจากระบบ</button><button class="ev-btn-danger ev-btn-block" data-act="au-delete-ask">ลบบัญชี</button></div></section></div>`}
function applyTheme(t){t==='auto'?document.documentElement.removeAttribute('data-theme'):document.documentElement.dataset.theme=t;try{localStorage.setItem(THEME_KEY,t)}catch(e){console.warn('theme',e)}}
try{const t=localStorage.getItem(THEME_KEY);if(t&&t!=='auto')applyTheme(t)}catch(e){console.warn('theme load',e)}


Object.assign(window, { notifInfo, themeNow, settingsHTML, applyTheme });

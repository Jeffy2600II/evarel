/* ===== MODULE: views/settings ===== */
function notifInfo(){if(!('Notification' in window))return ['ไม่รองรับ','เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน'];const p=Notification.permission;if(p==='denied')return ['ถูกปิดไว้','ต้องเปิดที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์'];if(p==='granted')return pushSavedState()?['อนุญาตแล้ว','เครื่องนี้พร้อมรับการแจ้งเตือน']:['อนุญาตแล้ว แต่ยังไม่ได้ลงทะเบียน','กดปุ่มเพื่อลงทะเบียนเครื่องนี้กับระบบ'];return ['ยังไม่ได้ขอ','กดปุ่มเพื่อให้เครื่องนี้รับการแจ้งเตือนได้']}
const themeNow=()=>document.documentElement.dataset.theme||'auto';
/* การ์ดการใช้งาน AI (v24): อ่าน ST.QUOTA จริง (ได้จาก quotaFetch) สถานะเดียวกับ quotaState: ok/low/out, ไม่ทราบ = null */
function usageCardHTML(){const q=ST.QUOTA,st=quotaState(q);
 if(!st)return `<b>การใช้งาน AI วันนี้</b><p class="ev-sub" style="margin-top:6px">${q?'ดูข้อมูลการใช้งานไม่ได้ในขณะนี้ แต่ยังใช้ AI ได้ตามปกติ':'กำลังโหลด…'}</p>${q?'<button class="ev-btn-ghost ev-btn-sm" style="margin-top:10px" data-act="usage-refresh">ลองใหม่</button>':''}`;
 const c=q.calls,t=q.tokens,cp=Math.min(100,Math.round(100*c.used/c.limit)),tp=Math.min(100,Math.round(100*t.used/t.limit)),lab={ok:'ปกติ',low:'ใกล้ถึงขีดจำกัด',out:'ถึงขีดจำกัดแล้ว'}[st];
 return `<div class="ev-stat"><b>การใช้งาน AI วันนี้</b><span class="ev-chip" data-state="${st==='out'?'late':st==='low'?'soon':'done'}">${lab}</span></div>
  <div class="ev-use"><div class="ev-stat"><span>จำนวนครั้งที่ถาม</span><b>${c.used} / ${c.limit}</b></div><div class="ev-bar ev-bar-lg"><i data-k="u-calls" data-to="${cp}" data-lv="${st}"></i></div></div>
  <div class="ev-use"><div class="ev-stat"><span>ความยาวบทสนทนา</span><b>${tp}%</b></div><div class="ev-bar ev-bar-lg"><i data-k="u-tok" data-to="${tp}" data-lv="${st}"></i></div></div>
  <p class="ev-sub" style="margin-top:14px">รีเซ็ตทุกเที่ยงคืน (00:00 น.) · ${resetIn(q.resetAt)}</p>`}
const providerChip=u=>u?.provider==='google'?`<span class="ev-chip ev-chip-g">${GLOGO}Google</span>`:'<span class="ev-chip">อีเมล</span>';
function settingsHTMLClassic(){const [st,note]=notifInfo(),total=countNotifiable(S.items);
 return `<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>ตั้งค่า</h2></div><div class="ev-page-scroll">
 <section class="ev-card ev-row" style="gap:14px">${avatarHTML({size:56})}<div class="grow"><b>${esc(ST.USER?.name||'ผู้ใช้')}</b><p class="ev-sub" style="overflow:hidden;text-overflow:ellipsis">${esc(ST.USER?.email||'')}</p></div>${providerChip(ST.USER)}</section>
 <section class="ev-card" id="usageWrap">${usageCardHTML()}</section>
 <section class="ev-card"><b>ธีม</b><div style="margin-top:12px">${seg('theme',[['auto','ตามเครื่อง'],['light','สว่าง'],['dark','มืด']],themeNow())}</div></section>
  <section class="ev-card"><b>อนิเมชั่น</b><p class="ev-sub">อัตโนมัติจะลดเอฟเฟกต์เองเมื่อเครื่องไม่ลื่น</p><div style="margin-top:12px">${seg('perf',[['auto','อัตโนมัติ'],['full','เต็มรูปแบบ'],['lite','ประหยัดเครื่อง']],perfPref())}</div></section>
 <section class="ev-card"><div class="ev-stat"><div><b>การแจ้งเตือน</b><p class="ev-sub">${note}</p></div><span class="ev-chip">${st}</span></div>${'Notification' in window&&(Notification.permission==='default'||(Notification.permission==='granted'&&!pushSavedState()))?`<button class="ev-btn-primary ev-btn-block" style="margin-top:12px" data-act="notify">${Notification.permission==='granted'?'ลงทะเบียนเครื่องนี้':'อนุญาตการแจ้งเตือน'}</button>`:''}
  <p class="ev-sub" style="margin-top:12px">ตั้งเวลาแจ้งเตือนไว้ ${total} รายการ (รายการใหม่เปิด "ตรงเวลา" ให้อัตโนมัติ และต้องมีเวลา) · เวลาที่ตั้งไว้บันทึกกับบัญชีของคุณและส่งถึงเครื่องนี้ตามเวลา</p></section>
 
 <section class="ev-card" id="appVerWrap">${versionCardHTML()}</section>

 <section class="ev-card"><b>บัญชี</b><div class="ev-form" style="margin-top:12px"><button class="ev-btn-ghost ev-btn-block" data-act="au-signout-ask">ออกจากระบบ</button><button class="ev-btn-danger ev-btn-block" data-act="au-delete-ask">ลบบัญชี</button></div></section></div>`}
/* ชั้น 4: หน้าตั้งค่าผลิตโดย React (runtime ร่วม + ไฟล์หน้า โหลดแบบ lazy หลัง load) ถ้ายังโหลดไม่ครบหรือโหลดไม่ได้ ใช้ template เดิมแทนทันที ผู้ใช้เห็นเหมือนเดิม */
function settingsProps(){const [st,note]=notifInfo(),granted='Notification' in window&&Notification.permission==='granted',canBtn='Notification' in window&&(Notification.permission==='default'||(granted&&!pushSavedState()));
 const pf=profileOf();
 return {usageHTML:usageCardHTML(),versionHTML:versionCardHTML(),googleChipInner:GLOGO+'Google',avatarBg:pf.bg,avatarName:pf.name||'โปรไฟล์',user:{name:ST.USER?.name||'ผู้ใช้',email:ST.USER?.email||'',provider:ST.USER?.provider},notif:{state:st,note},total:countNotifiable(S.items),themeSegHTML:seg('theme',[['auto','ตามเครื่อง'],['light','สว่าง'],['dark','มืด']],themeNow()),perfSegHTML:seg('perf',[['auto','อัตโนมัติ'],['full','เต็มรูปแบบ'],['lite','ประหยัดเครื่อง']],perfPref()),backIconHTML:icon('back'),avatarText:initial(),showNotifyBtn:canBtn,notifyBtnLabel:granted?'ลงทะเบียนเครื่องนี้':'อนุญาตการแจ้งเตือน'}}
function settingsHTML(){
 const R=(window as any).EvarelPages?.settings;
 if(typeof R!=='function')return settingsHTMLClassic();
 try{return R(settingsProps())}
 catch(e){console.warn('settings react',e);return settingsHTMLClassic()}}
/* S4 ไบต์ 5: หน้าตั้งค่า mount React จริงที่ #page เมื่อพร้อม (แพทเทิร์นเดียวกับ detail ใน 20-services__calendar) */
/* การ์ดเวอร์ชัน: เลขที่แสดงคือรุ่นที่ "รันอยู่จริง" อ่านจาก service worker ที่คุมหน้านี้ (ไม่ใช่รุ่นล่าสุดบนเซิร์ฟเวอร์) เพื่อให้ตรวจ popup อัปเดตได้ตรง */
function versionCardHTML(){const v=(ST as any).APPVER||{};const ver=v.version||'—';const bld=v.build?` · build ${v.build}`:'';
 return `<b>เกี่ยวกับ</b><div class="ev-stat" style="margin-top:12px"><div><div id="appVerNum" style="font-size:20px;font-weight:700;letter-spacing:-.01em">${ver}</div><p class="ev-sub" id="appVerSub">${v.date?v.date:'ตรวจสอบรุ่น…'}${bld}</p></div></div>`}
function versionPaint(){const e=$('appVerWrap');if(e)e.innerHTML=versionCardHTML()}
async function versionRefresh(){try{const U=(window as any).EvarelUpdate;const b=await U?.runningBuild?.();const sw=navigator.serviceWorker?.controller;
  let version='',build=b||'';if(sw){version=await new Promise<string>(res=>{const ch=new MessageChannel();const t=setTimeout(()=>res(''),1500);ch.port1.onmessage=(e:any)=>{clearTimeout(t);res(e.data&&e.data.version||'')};sw.postMessage({type:'get-build'},[ch.port2])})}
  let date='';try{const rel=await U?.latestRelease?.();if(rel&&rel.build===build)date=rel.date||''}catch(e){}
  (ST as any).APPVER={version,build,date}}catch(e){(ST as any).APPVER={}}versionPaint()}
function usagePaint(){['usageWrap','usageSheet'].forEach(id=>{const e=$(id);if(e){e.innerHTML=usageCardHTML();growBars(e)}})}
async function usageRefresh(){try{const q=await quotaFetch();ST.QUOTA=q||{unknown:true}}catch(err){ST.QUOTA={unknown:true}}usagePaint()}
function settingsOpen(){const MT=(window as any).EvarelMount;
 if(MT?.ready('settings')){MT.unmountOne('settings');let sp=pageOf('settings');if(!sp)sp=openPage('',undefined,'settings');sp.innerHTML='';MT.mountAt(sp,'settings',settingsProps());usageRefresh();versionRefresh();return}
 const html=settingsHTML();const sp=pageOf('settings');if(sp)patch(sp,html);else openPage(html,undefined,'settings');usageRefresh();versionRefresh()}
function settingsRepaint(){const MT=(window as any).EvarelMount;
 const sp=pageOf('settings');if(!sp)return;
 if(MT?.ready('settings')){MT.mountAt(sp,'settings',settingsProps());return}
 patch(sp,settingsHTML())}
/* โหลดทีละไฟล์ตามลำดับ runtime ก่อนแล้วหน้า (หน้าอ่าน window.EvarelReact ตอนรัน) พลาดไฟล์ใดก็ไม่เป็นไร ใช้ของเดิมต่อ */
function loadReactFile(name){return new Promise((ok,no)=>{const W=window as any;if(name==='runtime'&&W.EvarelReact)return ok(0);/* index โหลด runtime ก่อนบูตแล้ว ห้าม execute ซ้ำเพราะจะเกิด React สองชุด */
 const k=`script[data-ev-react="${name}"]`;if(document.querySelector(k))return ok(0);
 const el=document.createElement('script');el.type='module';el.src=`js/react/${name}.js`+((window as any).__EV_BUILD__?`?v=${(window as any).__EV_BUILD__}`:'');el.async=false;el.dataset.evReact=name;el.onload=()=>ok(0);el.onerror=()=>no(new Error(name));document.head.appendChild(el)})}
/* หน้าที่ย้ายเป็น React แล้ว (เพิ่มชื่อหน้าใหม่ที่นี่ที่เดียว) โหลด runtime ก่อนแล้วไล่ทีละหน้า พลาดไฟล์ใดใช้ของเดิมต่อ */
/* today+calendar โหลดจาก index.html ก่อนบูต (render แรกเป็น mount ทันที) ที่เหลือยัง lazy */
const REACT_LAZY=['settings','stats','all'];const REACT_PAGES=['settings','stats','all','item-row','today','calendar','ai','nav','dialog','sheet','form','detail','auth','quota','aiShell','focus'];
function loadReactSettings(){const W=window as any;if(REACT_PAGES.every(n=>W.EvarelPages?.[n]))return Promise.resolve(0);
 /* เรียก render ผ่าน window ตอนรันเท่านั้น (ไม่อ้างชื่อตรง) ไม่ให้เกิดเส้นพึ่งพาย้อนทิศไป 23-render ซึ่งโหลดหลังไฟล์นี้ */
 return loadReactFile('runtime').then(()=>REACT_PAGES.reduce((p,n)=>p.then(()=>loadReactFile(n)),Promise.resolve(0))).then(()=>{try{if(W.UI?.auth?.status!=='in'&&typeof W.renderAuthRoot==='function'){(document.getElementById('auth')||{}).dataset.screen='';W.renderAuthRoot()}else if((W.UI?.tab==='stats'||W.UI?.tab==='all')&&typeof W.render==='function')W.render()}catch(e){}}).catch(e=>console.warn('react ไม่พร้อม ใช้หน้าเดิม',e&&e.message))}
window.addEventListener('load',()=>setTimeout(loadReactSettings,0));
function applyTheme(t){t==='auto'?document.documentElement.removeAttribute('data-theme'):document.documentElement.dataset.theme=t;try{localStorage.setItem(THEME_KEY,t)}catch(e){console.warn('theme',e)}syncThemeColor()}
try{const t=localStorage.getItem(THEME_KEY);if(t&&t!=='auto')applyTheme(t)}catch(e){console.warn('theme load',e)}


Object.assign(window, { usageCardHTML, usagePaint, usageRefresh, versionCardHTML, versionPaint, versionRefresh, providerChip, notifInfo, themeNow, settingsHTML, settingsHTMLClassic, loadReactSettings, loadReactFile, applyTheme, settingsProps, settingsOpen, settingsRepaint });

import { EMAIL_RE, PW_MIN, MAIL_TYPO, authValidate } from './core/authform.js';
/* ===== MODULE: views/auth (เข้าสู่ระบบ / สร้างบัญชี / ลืมรหัสผ่าน) ===== */
const AU_MSG={invalid_credentials:'อีเมลหรือรหัสผ่านไม่ถูกต้อง',email_taken:'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน',network:'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',unknown:'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง',needs_link:'อีเมลนี้มีบัญชีอยู่แล้ว เข้าสู่ระบบด้วยบัญชีเดิมก่อน',code_invalid:'รหัสไม่ถูกต้อง ลองตรวจอีกครั้ง',code_expired:'รหัสหมดอายุแล้ว กดส่งรหัสใหม่',too_many_requests:'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่',unverified:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'};
const RESEND_SEC=30;
const GLOGO='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const EV_MARK='<svg class="mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="24" cy="24" r="17"/><path d="M16.5 24.5l5.5 5.5 10-11.5"/></svg>';
const RINGS=`<svg class="ev-rings" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${[46,86,126,166,206,246].map((r,i)=>`<circle cx="200" cy="130" r="${r}" stroke-width="1" stroke-opacity="${(.34-i*.05).toFixed(2)}" style="animation-delay:${i*90}ms"/>`).join('')}</svg>`;
const authBack=to=>`<div class="ev-auth-top"><button class="ev-icon-btn" data-flat data-act="au-go" data-id="${to}" aria-label="ย้อนกลับ">${icon('back')}</button></div>`;
const gBtn=t=>`<button type="button" class="ev-btn-auth" data-kind="google" data-act="au-google">${GLOGO}<span>${t}</span></button>`;
const legal='<p class="ev-legal">การดำเนินการต่อ ถือว่าคุณยอมรับ <button type="button" data-act="au-terms" data-id="terms">ข้อกำหนด</button> และ <button type="button" data-act="au-terms" data-id="privacy">นโยบายความเป็นส่วนตัว</button></p>';
const eyeBtn=id=>`<button type="button" class="ev-icon-btn" data-flat data-act="au-eye" data-id="${id}" aria-label="แสดงรหัสผ่าน" aria-pressed="false">${icon('eye')}</button>`;
const fld=(label,name,type,extra='',after='')=>`<div class="ev-ifield"><label for="f-${name}">${label}</label><div class="ev-pw"><input class="ev-input" id="f-${name}" name="${name}" type="${type}" ${extra}>${after}</div><div class="ev-field-err" id="e-${name}" hidden></div></div>`;
const EMAIL_X='autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="name@gmail.com"';
const submitBtn=l=>`<button class="ev-btn-auth" data-kind="accent" type="submit" data-label="${l}"><span>${l}</span></button>`;
const heroS=to=>`<div class="ev-hero ev-hero-s">${RINGS}<div class="ev-brand">${EV_MARK}<b>Evarel</b></div><button class="ev-icon-btn" data-flat data-act="au-go" data-id="${to}" aria-label="ย้อนกลับ">${icon('back')}</button></div>`;
const AUTH_VIEWS={
 welcome:()=>`<div class="ev-hero">${RINGS}<div class="ev-brand">${EV_MARK}<b>Evarel</b><span class="ev-tag">จัดการกิจวัตรและชีวิตให้ง่ายขึ้น</span></div></div>
  <div class="ev-auth-body"><div><h1 class="ev-auth-title">เริ่มต้นใช้งาน</h1><p class="ev-sub" style="margin-top:6px">ติ๊ก นับ จับเวลา และดูความต่อเนื่องของนิสัย ทั้งหมดในที่เดียว</p></div>
  <div class="ev-stack">${gBtn('ดำเนินการต่อด้วย Google')}<button class="ev-btn-auth" data-kind="ink" data-act="au-go" data-id="signup">${icon('mail')}<span>สร้างบัญชีด้วยอีเมล</span></button></div>
  <p class="ev-auth-sw">มีบัญชีอยู่แล้ว? <button data-act="au-go" data-id="login">เข้าสู่ระบบ</button></p></div>${legal}`,
 login:()=>`${heroS('welcome')}<div><h1 class="ev-auth-title">เข้าสู่ระบบ</h1><p class="ev-sub" style="margin-top:6px">ยินดีต้อนรับกลับมา</p></div>${gBtn('เข้าสู่ระบบด้วย Google')}<div class="ev-or">หรือใช้อีเมล</div>
  <form class="ev-form ev-authform" data-kind="login" novalidate><div class="ev-banner" id="form-err" role="alert" hidden></div>${fld('อีเมล','email','email',EMAIL_X)}${fld('รหัสผ่าน','password','password','autocomplete="current-password" placeholder="รหัสผ่าน"',eyeBtn('f-password'))}
  <button type="button" class="ev-link" style="justify-self:end;padding:0" data-act="au-go" data-id="forgot">ลืมรหัสผ่าน?</button>${submitBtn('เข้าสู่ระบบ')}</form><p class="ev-auth-sw">ยังไม่มีบัญชี? <button data-act="au-go" data-id="signup">สร้างบัญชี</button></p>${legal}`,
 signup:()=>`${heroS('welcome')}<div><h1 class="ev-auth-title">สร้างบัญชี</h1><p class="ev-sub" style="margin-top:6px">ใช้เวลาไม่ถึงหนึ่งนาที</p></div>${gBtn('สมัครด้วย Google')}<div class="ev-or">หรือใช้อีเมล</div>
  <form class="ev-form ev-authform" data-kind="signup" novalidate><div class="ev-banner" id="form-err" role="alert" hidden></div>${fld('ชื่อที่ใช้แสดง','name','text','autocomplete="name" maxlength="40" placeholder="ชื่อของคุณ"')}${fld('อีเมล','email','email',EMAIL_X)}
  <div class="ev-ifield">${fld('รหัสผ่าน','password','password',`autocomplete="new-password" placeholder="อย่างน้อย ${PW_MIN} ตัวอักษร"`,eyeBtn('f-password'))}<div class="ev-meter" id="pwMeter" data-lv="0"><i></i><i></i><i></i><i></i></div><span class="ev-sub" id="pwLabel">ใช้ตัวพิมพ์เล็ก-ใหญ่ ตัวเลข และสัญลักษณ์ผสมกันจะปลอดภัยขึ้น</span></div>
  <div class="ev-ifield"><label class="ev-check-row"><input type="checkbox" class="ev-cb" name="terms"><span>ฉันยอมรับ <button type="button" data-act="au-terms" data-id="terms">ข้อกำหนด</button> และ <button type="button" data-act="au-terms" data-id="privacy">นโยบายความเป็นส่วนตัว</button></span></label><div class="ev-field-err" id="e-terms" hidden></div></div>${submitBtn('สร้างบัญชี')}</form><p class="ev-auth-sw">มีบัญชีอยู่แล้ว? <button data-act="au-go" data-id="login">เข้าสู่ระบบ</button></p>`,
 forgot:()=>`${heroS('login')}<div><h1 class="ev-auth-title">ลืมรหัสผ่าน</h1><p class="ev-sub" style="margin-top:6px">ใส่อีเมลที่ใช้สมัคร เราจะส่งรหัส 6 หลักไปให้</p></div>
  <form class="ev-form ev-authform" data-kind="forgot" novalidate><div class="ev-banner" id="form-err" role="alert" hidden></div>${fld('อีเมล','email','email',EMAIL_X)}${submitBtn('ส่งรหัส')}</form>`,
 sent:()=>`${authBack('login')}<div class="ev-sent"><div class="orb">${icon('mail')}</div><h1 class="ev-auth-title" style="font-size:24px">ตรวจสอบอีเมลของคุณ</h1><p class="ev-sub" style="max-width:300px">ถ้ามีบัญชีที่ใช้ <b>${esc(UI.auth.email)}</b> เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว</p></div>
  <button class="ev-btn-auth" data-kind="accent" data-act="au-go" data-id="login">กลับไปเข้าสู่ระบบ</button><button class="ev-btn-auth" data-kind="google" id="resendBtn" data-act="au-resend" disabled></button>`,
 code:()=>`${heroS(UI.auth.codeType==='recovery'?'forgot':'signup')}<div><h1 class="ev-auth-title">ใส่รหัส 6 หลัก</h1><p class="ev-sub" style="margin-top:6px">เราส่งรหัสไปที่ <b>${esc(UI.auth.email)}</b> ใส่รหัสเพื่อ${UI.auth.codeType==='recovery'?'ตั้งรหัสผ่านใหม่':'ยืนยันอีเมล'}</p></div>
  <form class="ev-form ev-authform" data-kind="code" novalidate><div class="ev-banner" id="form-err" role="alert" hidden></div>${fld('รหัส 6 หลัก','code','text','inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"')}${submitBtn('ยืนยัน')}</form>
  <button class="ev-btn-auth" data-kind="google" id="resendBtn" data-act="au-resend" disabled></button>`,
 newpw:()=>`<div><h1 class="ev-auth-title">ตั้งรหัสผ่านใหม่</h1><p class="ev-sub" style="margin-top:6px">ตั้งรหัสผ่านใหม่ให้บัญชี <b>${esc(UI.auth.email)}</b></p></div>
  <form class="ev-form ev-authform" data-kind="newpw" novalidate><div class="ev-banner" id="form-err" role="alert" hidden></div>${fld('รหัสผ่านใหม่','password','password',`autocomplete="new-password" placeholder="อย่างน้อย ${PW_MIN} ตัวอักษร"`,eyeBtn('f-password'))}${submitBtn('บันทึกรหัสผ่าน')}</form>`};
const AUTH_SPLASH=`<div class="ev-splash">${EV_MARK}<b style="font-size:28px;letter-spacing:-1px">Evarel</b></div>`;
function renderAuthRoot(){const au=$('auth');au.hidden=false;const sc=UI.auth.status==='loading'?'loading':UI.auth.screen;if(au.dataset.screen===sc)return;au.dataset.screen=sc;
 const MT=(window as any).EvarelMount;
 if(MT?.ready('auth')){MT.mountAt(au,'auth',{screen:sc})}
 else{au.innerHTML=`<div class="ev-auth-in">${sc==='loading'?AUTH_SPLASH:AUTH_VIEWS[sc]()}</div>`}
 au.scrollTop=0;[...au.firstElementChild.children].forEach((el,i)=>el.style.setProperty('--i',i));
 if(sc==='sent'||sc==='code')startCool();if(['login','signup','forgot','code','newpw'].includes(sc))setTimeout(()=>au.querySelector('input')?.focus({preventScroll:true}),400)}
let coolT=null;
function paintCool(){const b=$('resendBtn');if(!b)return;const n=UI.auth.cool;b.disabled=n>0;b.innerHTML=n>0?`<span>ส่งอีกครั้งได้ใน ${n} วินาที</span>`:`<span>${UI.auth.screen==='code'?'ส่งรหัสอีกครั้ง':'ส่งลิงก์อีกครั้ง'}</span>`}
function startCool(){stopCool();UI.auth.cool=RESEND_SEC;paintCool();coolT=setInterval(()=>{UI.auth.cool=Math.max(0,UI.auth.cool-1);paintCool();if(!UI.auth.cool)stopCool()},1000)}
function stopCool(){clearInterval(coolT);coolT=null}
async function resendReset(){if(UI.auth.cool>0)return;const b=$('resendBtn');b.disabled=true;b.innerHTML='<span class="ev-spin"></span>';try{if(UI.auth.screen==='code'&&Auth.resend)await Auth.resend(UI.auth.email,UI.auth.codeType);else await Auth.sendReset(UI.auth.email);toast(UI.auth.screen==='code'?'ส่งรหัสอีกครั้งแล้ว':'ส่งลิงก์อีกครั้งแล้ว')}catch(err){toast(AU_MSG[err.code]||AU_MSG.unknown)}startCool()}
const fieldErr=(form,name,msg)=>{const inp=form.querySelector(`[name="${name}"]`),box=form.querySelector(`#e-${name}`);if(inp&&inp.type!=='checkbox')inp.setAttribute('aria-invalid',String(!!msg));if(box){box.hidden=!msg;box.removeAttribute('data-tone');box.innerHTML=msg?`${icon('alert')}<span>${esc(msg)}</span>`:''}};
function clearErrs(form){form.querySelectorAll('.ev-input').forEach(i=>i.setAttribute('aria-invalid','false'));form.querySelectorAll('.ev-field-err').forEach(b=>{b.hidden=true;b.innerHTML=''});const fe=form.querySelector('#form-err');if(fe){fe.hidden=true;fe.textContent=''}}
function setBusy(form,on){const b=form.querySelector('button[type="submit"]');b.disabled=on;b.innerHTML=on?'<span class="ev-spin"></span>':`<span>${b.dataset.label}</span>`;form.querySelectorAll('input').forEach(i=>{i.readOnly=on})}
document.addEventListener('input',e=>{const t=e.target;if(t.id==='f-password'&&t.closest('[data-kind="signup"]')){const p=t.value,s=[p.length>=PW_MIN,p.length>=12,/[a-z]/.test(p)&&/[A-Z]/.test(p),/\d/.test(p),/[^\w]/.test(p)].filter(Boolean).length,lv=p.length<PW_MIN?(p?1:0):Math.min(4,Math.max(1,s-1));
 $('pwMeter').dataset.lv=String(lv);$('pwLabel').textContent=p?(p.length<PW_MIN?`อีก ${PW_MIN-p.length} ตัวอักษรจึงจะใช้ได้`:['','อ่อน','พอใช้','ดี','แข็งแรง'][lv]):'ใช้ตัวพิมพ์เล็ก-ใหญ่ ตัวเลข และสัญลักษณ์ผสมกันจะปลอดภัยขึ้น'}
 if(t.closest('.ev-authform')&&t.getAttribute('aria-invalid')==='true'){t.setAttribute('aria-invalid','false');const b=$('e-'+t.name);if(b){b.hidden=true;b.innerHTML=''}}});
document.addEventListener('focusout',e=>{const t=e.target;if(t.name!=='email'||!t.closest?.('.ev-authform'))return;const [u,dom]=t.value.trim().split('@'),fix=dom&&MAIL_TYPO[dom.toLowerCase()],b=$('e-email');
 if(fix&&b){b.hidden=false;b.dataset.tone='hint';b.innerHTML=`<span>หมายถึง ${esc(u)}@${fix} หรือเปล่า?</span><button type="button" data-act="au-fixmail" data-id="${esc(u)}@${fix}">ใช้อันนี้</button>`}});

/* ===== ซิงก์ข้ามอุปกรณ์ (เปิดเฉพาะโหมด Supabase) =====
   ต้นฉบับอยู่ที่ Supabase: ดึงใหม่เมื่อกลับมาเห็นหน้าจอ/กลับมาออนไลน์ และทุก LIVE_MS ขณะเปิดอยู่
   เทียบลายนิ้วมือข้อมูลก่อน ไม่เปลี่ยนก็ไม่วาดซ้ำ; ข้ามรอบถ้ากำลังบันทึก (PENDING) หรือกำลังพิมพ์ในฟอร์ม */
let liveBusy=false;
const sigOf=items=>{const t=JSON.stringify([...items].sort((a,b)=>a.id-b.id).map(i=>[i.id,i.type,i.title,i.subject,i.time,i.timeEnd,i.track,i.target,i.unitName,i.repeat,i.start,i.end,i.log,i.skip,i.rem]));let h=5381;for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return h+':'+items.length};
const typingNow=()=>{const a=document.activeElement;return !!a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&!!a.closest('#sheet,#dialog,#page')};
async function liveRefresh(){if(!SUPA_API||liveBusy||SYNC.pending>0||UI.auth.status!=='in'||UI.loading||document.hidden||typingNow())return;liveBusy=true;
 try{const w0=SYNC.writes,r=await ST.Repo.load();if(SYNC.pending>0||SYNC.writes!==w0)return;if(sigOf(r.items)!==sigOf(S.items)){S.items=r.items;ST._render()}}
 catch(err){console.warn('live refresh',err)}finally{liveBusy=false}}
/* Realtime: ฟังการเปลี่ยนแปลงตาราง items ผ่าน WebSocket ของ Supabase (กุญแจสาธารณะ + JWT ของผู้ใช้ → RLS กรองให้เห็นเฉพาะของตัวเอง)
   เหตุการณ์ที่มาแค่ "กระตุ้น" liveRefresh (ดึงแล้วเทียบลายนิ้วมือ) → ตรรกะตัดสินความถูกต้องอยู่จุดเดียว ไม่มีข้อมูลซ้ำ/ตีกันกับการแก้ในเครื่อง */
const SUPA_PK='sb_publishable_91KcKgK7ujojcnIynSoXyQ_8f85NcBL';
let rtWs=null,rtOn=false,rtRef=0,rtHb=null,rtRetry=0,rtTimer=null,rtDeb=null,rtTokT=null;
const rtSend=(topic,event,payload)=>{try{rtWs&&rtWs.readyState===1&&rtWs.send(JSON.stringify({topic,event,payload,ref:String(++rtRef)}))}catch(e){console.warn('rt send',e)}};
const rtKick=()=>{clearTimeout(rtDeb);rtDeb=setTimeout(liveRefresh,250)};
async function rtConnect(){if(!rtOn||rtWs)return;let tok;try{tok=await ST.Repo.token()}catch(e){rtSchedule();return}
 let ws;try{ws=new WebSocket(SUPA_HOST.replace('https','wss')+'/realtime/v1/websocket?apikey='+SUPA_PK+'&vsn=1.0.0')}catch(e){rtSchedule();return}
 rtWs=ws;
 ws.onopen=()=>{rtSend('realtime:evarel-items','phx_join',{config:{broadcast:{self:false},presence:{key:''},postgres_changes:[{event:'*',schema:'public',table:'items'}]},access_token:tok});
  clearInterval(rtHb);rtHb=setInterval(()=>rtSend('phoenix','heartbeat',{}),25000);
  clearInterval(rtTokT);rtTokT=setInterval(async()=>{try{rtSend('realtime:evarel-items','access_token',{access_token:await ST.Repo.token()})}catch(e){console.warn('rt token',e)}},10*60*1000)};
 ws.onmessage=m=>{let d;try{d=JSON.parse(m.data)}catch(e){return}
  if(d.event==='phx_reply'&&d.topic==='realtime:evarel-items'){if(d.payload?.status==='ok'){rtRetry=0;rtKick()}else{console.warn('rt join',d.payload);try{ws.close()}catch(e){}}}
  else if(d.event==='postgres_changes')rtKick();
  else if(d.event==='phx_error'||d.event==='phx_close'){try{ws.close()}catch(e){}}};
 ws.onclose=()=>{if(rtWs===ws)rtWs=null;clearInterval(rtHb);clearInterval(rtTokT);rtSchedule()};
 ws.onerror=()=>{try{ws.close()}catch(e){}}}
function rtSchedule(){if(!rtOn||rtTimer)return;const wait=Math.min(30000,1000*Math.pow(2,rtRetry++));rtTimer=setTimeout(()=>{rtTimer=null;rtConnect()},wait)}
function startLiveSync(){if(!SUPA_API)return;stopLiveSync();rtOn=true;rtRetry=0;rtConnect()}
function stopLiveSync(){rtOn=false;clearTimeout(rtTimer);rtTimer=null;clearTimeout(rtDeb);clearInterval(rtHb);clearInterval(rtTokT);const w=rtWs;rtWs=null;if(w){w.onclose=null;try{w.close()}catch(e){}}}
const rtResume=()=>{if(rtOn&&!rtWs){clearTimeout(rtTimer);rtTimer=null;rtRetry=0;rtConnect()}liveRefresh()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)rtResume()});window.addEventListener('online',rtResume);window.addEventListener('focus',rtResume);

async function doSignOut(del){stopLiveSync();try{if(del)await Auth.deleteAccount();else await Auth.signOut()}catch(err){console.warn('signout',err);toast(AU_MSG.unknown);return}
 while(LAYERS.length)popLayer();closePop();destroyCal('main');destroyCal('habit');ST.DETAIL=null;S.items=[];ST.CH={list:[],cur:null};ST.TM=null;ST.USER=null;
 Object.assign(UI,{tab:'today',date:TODAY,type:'all',weekOff:0,loading:true,error:null});UI.auth={status:'out',screen:'welcome',email:'',cool:0};$('auth').dataset.screen='';ST._render();if(del)toast('ลบบัญชีแล้ว')}


document.addEventListener('touchstart',e=>{ST.swipeX=e.target.closest('.ev-week')?e.touches[0].clientX:null},{passive:true});
document.addEventListener('touchend',e=>{if(ST.swipeX==null)return;const dx=e.changedTouches[0].clientX-ST.swipeX;ST.swipeX=null;if(Math.abs(dx)>50){UI.weekOff+=dx<0?1:-1;UI.weekDir=dx<0?1:-1;ST._render()}},{passive:true});
const errorView=()=>`<div class="ev-error">${empty('x','โหลดข้อมูลไม่สำเร็จ','ตรวจสอบการเชื่อมต่อแล้วลองใหม่')}<button class="ev-btn-primary" data-act="retry">ลองใหม่</button></div>`;


Object.assign(window, { AU_MSG, EMAIL_RE, PW_MIN, RESEND_SEC, MAIL_TYPO, GLOGO, EV_MARK, RINGS, authBack, gBtn, legal, eyeBtn, fld, EMAIL_X, submitBtn, AUTH_VIEWS, AUTH_SPLASH, renderAuthRoot, coolT, paintCool, startCool, stopCool, resendReset, fieldErr, clearErrs, setBusy, authValidate, liveBusy, sigOf, typingNow, liveRefresh, SUPA_PK, rtWs, rtOn, rtRef, rtHb, rtRetry, rtTimer, rtDeb, rtTokT, rtSend, rtKick, rtConnect, rtSchedule, startLiveSync, stopLiveSync, rtResume, doSignOut, errorView });

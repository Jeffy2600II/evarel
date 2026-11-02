import { planImport } from './core/repo.js';
/* ===== MODULE: services/legacy-import (เฟส C) =====
   ข้อมูลเก่าในมือถือ (evarel-demo-v3 หรือ evarel-demo-v3:<uid>) -> Supabase หนึ่งครั้งต่อบัญชี
   บัญชีว่าง = นำเข้าเงียบ | เซิร์ฟเวอร์มีของ = ถามเลือก | จดผลที่ evarel-imported:<uid> */
const IMPORT_FLAG=()=>'evarel-imported:'+ST.USER.id;
function readLegacyItems(){const out=[];const seen=new Set();
 for(const k of [uk(STORE_KEY),STORE_KEY]){try{const j=JSON.parse(localStorage.getItem(k)||'null');
  if(j&&Array.isArray(j.items))for(const it of j.items){if(it&&it.id!=null&&it.title&&!seen.has(it.id)){seen.add(it.id);out.push(it)}}}catch(e){}}
 return out}
async function importLegacy(list,serverItems,mode){
 const upserts=planImport(list,serverItems,mode);
 await ST.Repo.apply({upserts,removes:[]});return upserts.length}
async function maybeImportLegacy(serverItems){
 if(!SUPA_API||!ST.USER||localStorage.getItem(IMPORT_FLAG()))return serverItems;
 const list=readLegacyItems();if(!list.length){localStorage.setItem(IMPORT_FLAG(),'none');return serverItems}
 if(!serverItems.length){try{await importLegacy(list,serverItems,'empty');localStorage.setItem(IMPORT_FLAG(),'done:'+list.length);
   toast(`นำเข้าข้อมูลเดิม ${list.length} รายการแล้ว`);return (await ST.Repo.load()).items}catch(err){console.warn('import failed',err);toast('นำเข้าข้อมูลเดิมไม่สำเร็จ จะลองใหม่ครั้งหน้า');return serverItems}}
 IMPORT_PENDING={list,serverItems};
 openDialog(`<h3>พบข้อมูลเดิมในเครื่องนี้</h3><p class="ev-sub">มี ${list.length} รายการเก่าในเครื่อง แต่บัญชีนี้มี ${serverItems.length} รายการอยู่แล้ว จะนำเข้ามารวมไหม (รายการที่มีอยู่แล้วจะไม่ถูกทับ)</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="imp-skip">ไม่นำเข้า</button><button class="ev-btn-primary" data-act="imp-add">นำเข้าเพิ่ม</button></div>`);
 return serverItems}
let IMPORT_PENDING=null;
async function runImport(mode){const P=IMPORT_PENDING;IMPORT_PENDING=null;if(!P)return;
 if(mode==='skip'){localStorage.setItem(IMPORT_FLAG(),'skipped');return}
 try{const n=await importLegacy(P.list,P.serverItems,'append');localStorage.setItem(IMPORT_FLAG(),'done:'+n);
  S.items=(await ST.Repo.load()).items;UI.animate=false;render();toast(`นำเข้าเพิ่ม ${n} รายการแล้ว`)}catch(err){console.warn('import failed',err);toast('นำเข้าไม่สำเร็จ จะถามใหม่ครั้งหน้า')}}
async function loadApp(){claimLegacyData();UI.auth.status='in';ST.CH=loadChats();ST.TM=loadTM();UI.loading=true;UI.error=null;render();
 try{const [s]=await Promise.all([ST.Repo.load(),wait(SKELETON_MS)]);S.items=s.items}catch(err){console.warn('load failed',err);UI.error=err}
 UI.loading=false;UI.animate=true;render();
 if(!UI.error){const r=await maybeImportLegacy(S.items);if(r!==S.items){S.items=r;UI.animate=false;render()}}}
async function boot(){UI.auth.status='loading';render();let oauthNote='';
 try{ST.USER=(Auth.takeOAuthReturn&&await Auth.takeOAuthReturn())||await Auth.session()}
 catch(err){console.warn('session failed',err);
  /* กลับจาก Google แล้วมีปัญหา: แจ้งผู้ใช้แบบเข้าใจง่าย และยังลองเซสชันเดิมต่อ (เคสยกเลิกที่หน้า Google ต้องเข้าแอปตามเดิมถ้าเซสชันเก่ายังอยู่)
     oauth_failed คง token ที่จอดไว้ (OAUTH_PARK) — รีโหลดหน้าถัดไปจะลองใหม่เองอัตโนมัติ */
  if(err&&err.code==='oauth_cancelled'){oauthNote='ยกเลิกการเข้าสู่ระบบด้วย Google แล้ว';try{ST.USER=await Auth.session()}catch(e2){ST.USER=null}}
  else if(err&&err.code==='oauth_failed'){oauthNote='เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้ง';try{ST.USER=await Auth.session()}catch(e2){ST.USER=null}}
  else ST.USER=null}
 if(oauthNote)toast(oauthNote);
 if(!ST.USER){UI.auth.status='out';
  /* กลับมาหลังปิดแท็บ/รีเฟรชระหว่างรอยืนยัน: พากลับไปหน้ายืนยันของอีเมลเดิมทันที ไม่ต้องเริ่มสมัครใหม่
     (สถานะเก็บใน localStorage ผ่าน Auth.pendingInfo — สมัครซ้ำไม่ได้เพราะบัญชีมีอยู่แล้ว) */
  const pd=Auth.pendingInfo&&Auth.pendingInfo();
  if(pd&&pd.email){UI.auth.email=pd.email;UI.auth.codeType=pd.type==='recovery'?'recovery':'signup';UI.auth.screen='code';render();
   if(pd.type!=='recovery'){try{await Auth.resend(pd.email,'signup');toast('ส่งรหัสยืนยันชุดใหม่ให้ทางอีเมลแล้ว')}catch(err){console.warn('resume resend',err)}}
   return}
  UI.auth.screen='welcome';render();return}await loadApp();try{startLiveSync();pushAutoSync()}catch(err){console.warn('live sync',err)}}
boot();
/* moved by move_defs (evarel-ts-1f) */
async function authSubmit(kind,form){clearErrs(form);const v=/** @type {Record<string,string>} */(Object.fromEntries(new FormData(form))),errs=authValidate(kind,v),keys=Object.keys(errs);
 if(keys.length){keys.forEach(k=>fieldErr(form,k,errs[k]));form.querySelector(`[name="${keys[0]}"]`)?.focus();haptic();return}
 setBusy(form,true);
 try{if(kind==='forgot'){await Auth.sendReset(v.email.trim());UI.auth.email=v.email.trim();UI.auth.codeType='recovery';UI.auth.screen=Auth.verifyCode?'code':'sent';renderAuthRoot();return}
  if(kind==='code'){const u=await Auth.verifyCode(UI.auth.email,v.code.trim(),UI.auth.codeType);if(UI.auth.codeType==='recovery'){UI.auth.pendingUser=u;UI.auth.screen='newpw';renderAuthRoot();return}await enterApp(u);return}
  if(kind==='newpw'){await Auth.setPassword(v.password);const u=UI.auth.pendingUser;UI.auth.pendingUser=null;toast('ตั้งรหัสผ่านใหม่แล้ว');await enterApp(u);return}
  const user=kind==='login'?await Auth.signInEmail(v.email.trim(),v.password):await Auth.signUp({name:v.name.trim(),email:v.email.trim(),password:v.password});await enterApp(user)}
 catch(err){setBusy(form,false);if(err.code==='verify_needed'){UI.auth.email=v.email.trim();UI.auth.codeType='signup';UI.auth.screen='code';renderAuthRoot();return}if(err.code==='email_taken'||err.code==='needs_link')fieldErr(form,'email',AU_MSG[err.code]);else if(err.code==='code_invalid'||err.code==='code_expired')fieldErr(form,'code',AU_MSG[err.code]);else{const fe=form.querySelector('#form-err');fe.textContent=AU_MSG[err.code]||AU_MSG.unknown;fe.hidden=false;fe.style.animation='none';void fe.offsetWidth;fe.style.animation=''}haptic()}}
async function authGoogle(btn){const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="ev-spin"></span>';
 /* กันสปินเนอร์ค้าง: ถ้าพาไปหน้า Google ไม่สำเร็จ (เน็ตหลุด/ถูกบล็อก) 10 วิ คืนปุ่มและแจ้งเสมอ — ถ้าไปได้ปกติหน้านี้เปลี่ยนไปก่อน timer ทำงาน */
 const back=setTimeout(()=>{btn.disabled=false;btn.innerHTML=old;toast(AU_MSG.network)},10000);
 try{await enterApp(await Auth.signInGoogle())}catch(err){clearTimeout(back);btn.disabled=false;btn.innerHTML=old;toast(AU_MSG[err.code]||AU_MSG.unknown)}}
async function enterApp(user){ST.USER=user;await loadApp();try{startLiveSync();pushAutoSync()}catch(err){console.warn('live sync',err)}}

Object.assign(window, { IMPORT_FLAG, readLegacyItems, importLegacy, maybeImportLegacy, IMPORT_PENDING, runImport, loadApp, boot, authSubmit, authGoogle, enterApp });

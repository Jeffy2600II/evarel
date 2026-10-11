/* ===== MODULE: services/legacy-import (เฟส C) =====
   ข้อมูลเก่าในมือถือ (evarel-demo-v3 หรือ evarel-demo-v3:<uid>) -> Supabase หนึ่งครั้งต่อบัญชี
   บัญชีว่าง = นำเข้าเงียบ | เซิร์ฟเวอร์มีของ = ถามเลือก | จดผลที่ evarel-imported:<uid> */
const IMPORT_FLAG=()=>'evarel-imported:'+USER.id;
function readLegacyItems(){const out=[];const seen=new Set();
 for(const k of [uk(STORE_KEY),STORE_KEY]){try{const j=JSON.parse(localStorage.getItem(k)||'null');
  if(j&&Array.isArray(j.items))for(const it of j.items){if(it&&it.id!=null&&it.title&&!seen.has(it.id)){seen.add(it.id);out.push(it)}}}catch(e){}}
 return out}
async function importLegacy(list,serverItems,mode){
 let nextId=Math.max(0,...serverItems.map(x=>Number(x.id)||0))+1;const taken=new Set(serverItems.map(x=>Number(x.id)));
 const upserts=list.map(it=>{const c=JSON.parse(JSON.stringify(it));
  if(mode==='append'&&taken.has(Number(c.id))){c.id=nextId++}else if(mode==='append'){taken.add(Number(c.id))}
  return c});
 await Repo.apply({upserts,removes:[]});return upserts.length}
async function maybeImportLegacy(serverItems){
 if(!SUPA_API||!USER||localStorage.getItem(IMPORT_FLAG()))return serverItems;
 const list=readLegacyItems();if(!list.length){localStorage.setItem(IMPORT_FLAG(),'none');return serverItems}
 if(!serverItems.length){try{await importLegacy(list,serverItems,'empty');localStorage.setItem(IMPORT_FLAG(),'done:'+list.length);
   toast(`นำเข้าข้อมูลเดิม ${list.length} รายการแล้ว`);return (await Repo.load()).items}catch(err){console.warn('import failed',err);toast('นำเข้าข้อมูลเดิมไม่สำเร็จ จะลองใหม่ครั้งหน้า');return serverItems}}
 IMPORT_PENDING={list,serverItems};
 openDialog(`<h3>พบข้อมูลเดิมในเครื่องนี้</h3><p class="ev-sub">มี ${list.length} รายการเก่าในเครื่อง แต่บัญชีนี้มี ${serverItems.length} รายการอยู่แล้ว จะนำเข้ามารวมไหม (รายการที่มีอยู่แล้วจะไม่ถูกทับ)</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="imp-skip">ไม่นำเข้า</button><button class="ev-btn-primary" data-act="imp-add">นำเข้าเพิ่ม</button></div>`);
 return serverItems}
let IMPORT_PENDING=null;
async function runImport(mode){const P=IMPORT_PENDING;IMPORT_PENDING=null;if(!P)return;
 if(mode==='skip'){localStorage.setItem(IMPORT_FLAG(),'skipped');return}
 try{const n=await importLegacy(P.list,P.serverItems,'append');localStorage.setItem(IMPORT_FLAG(),'done:'+n);
  S.items=(await Repo.load()).items;UI.animate=false;render();toast(`นำเข้าเพิ่ม ${n} รายการแล้ว`)}catch(err){console.warn('import failed',err);toast('นำเข้าไม่สำเร็จ จะถามใหม่ครั้งหน้า')}}
async function loadApp(){claimLegacyData();UI.auth.status='in';ST.CH=loadChats();ST.TM=loadTM();UI.loading=true;UI.error=null;render();
 try{const [s]=await Promise.all([Repo.load(),wait(SKELETON_MS)]);S.items=s.items}catch(err){console.warn('load failed',err);UI.error=err}
 UI.loading=false;UI.animate=true;render();
 if(!UI.error){const r=await maybeImportLegacy(S.items);if(r!==S.items){S.items=r;UI.animate=false;render()}}}
async function boot(){UI.auth.status='loading';render();try{USER=(Auth.takeOAuthReturn&&await Auth.takeOAuthReturn())||await Auth.session()}catch(err){console.warn('session failed',err);USER=null}
 if(!USER){UI.auth.status='out';UI.auth.screen='welcome';render();return}await loadApp();startLiveSync()}
boot();

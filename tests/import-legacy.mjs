import { chromium } from 'playwright'; import fs from 'fs';
const vals={};for(const l0 of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){let l=l0.trim().replace(/^export /,'');const i=l.indexOf('=');if(i<0)continue;let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}
const K=vals.SUPABASE_SERVICE_KEY,SB='https://vdbmwmmsfrgpaauzspup.supabase.co',API='https://evarel-api-b-test.nontakorn2600.workers.dev',APP=process.argv[2]||'http://localhost:8779/index.html';
const adm={apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'};
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});const U=[];let ok=true;const t=(n,c,v='')=>{console.log(c?'PASS':'FAIL',n,v);if(!c)ok=false};
const mk=(id,ti)=>({id,type:'habit',title:ti,subject:'',time:'07:00',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'day',every:1,days:[]},start:'2026-10-01',end:'',log:{'2026-10-09':1},skip:{},rem:[]});
const mkUser=async n=>{const em=`im${n}${Date.now()}@example.com`;const r=await (await fetch(SB+'/auth/v1/admin/users',{method:'POST',headers:adm,body:JSON.stringify({email:em,password:'Passw0rd!im1',email_confirm:true})})).json();U.push(r.id);return {em,id:r.id}};
const rows=async id=>(await (await fetch(SB+`/rest/v1/items?user_id=eq.${id}&select=id,title&order=id`,{headers:adm})).json());
const logs=async id=>(await (await fetch(SB+`/rest/v1/item_logs?user_id=eq.${id}&select=item_id`,{headers:adm})).json());
async function session(legacy){const c=await b.newContext({viewport:{width:412,height:915}});await c.addInitScript(a=>{window.EVAREL_API=a},API);const p=await c.newPage();await p.route(/fonts\./,r=>r.abort());
 await p.goto(APP);await p.waitForTimeout(700);if(legacy)await p.evaluate(o=>localStorage.setItem('evarel-demo-v3',o),JSON.stringify({items:legacy}));await p.reload();await p.waitForTimeout(900);return p}
async function login(p,u){await p.click('[data-act="au-go"][data-id="login"]').catch(()=>{});await p.waitForTimeout(300);await p.fill('#f-email',u.em);await p.fill('#f-password','Passw0rd!im1');await p.click('button[type="submit"]');await p.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:20000});await p.waitForTimeout(3500)}
try{
 // 1) บัญชีว่าง -> นำเข้าเงียบ
 const A=await mkUser('a');let p=await session([mk(1,'OLD-A'),mk(2,'OLD-B'),mk(3,'OLD-C')]);await login(p,A);
 let r=await rows(A.id);t('1 บัญชีว่าง: นำเข้าครบ 3 รายการ',r.length===3,JSON.stringify(r.map(x=>x.title)));
 t('1 ไม่มีหน้าต่างถาม',!(await p.locator('[data-act="imp-add"]').isVisible()));
 t('1 log ตามไปด้วย (3 วัน)',(await logs(A.id)).length===3);
 t('1 รายการขึ้นหน้าจอ',await p.evaluate(()=>document.body.innerText.includes('OLD-A')));
 // 4) ล็อกอินใหม่ ต้องไม่ถามและไม่ซ้ำ
 await p.evaluate(()=>doSignOut(false));await p.waitForTimeout(1500);await login(p,A);r=await rows(A.id);t('4 ล็อกอินซ้ำ: ยังแค่ 3 ไม่ซ้ำ',r.length===3);t('4 ไม่ถามซ้ำ',!(await p.locator('[data-act="imp-add"]').isVisible()));
 // 2) เซิร์ฟเวอร์มีของ id ชนกัน -> ถาม -> นำเข้าเพิ่ม
 const B=await mkUser('b');await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,Prefer:'return=minimal'},body:JSON.stringify([{id:1,user_id:B.id,type:'task',title:'SERVER-1',track:'none'},{id:2,user_id:B.id,type:'task',title:'SERVER-2',track:'none'}])});
 p=await session([mk(1,'MOBILE-X'),mk(2,'MOBILE-Y'),mk(7,'MOBILE-Z')]);await login(p,B);
 t('2 เจอเซิร์ฟเวอร์มีของ: ขึ้นหน้าต่างถาม',await p.locator('[data-act="imp-add"]').isVisible());
 t('2 ยังไม่เขียนอะไรก่อนตอบ',(await rows(B.id)).length===2);
 await p.click('[data-act="imp-add"]');await p.waitForTimeout(3500);r=await rows(B.id);
 t('2 นำเข้าเพิ่ม: รวม 5 รายการ',r.length===5,JSON.stringify(r.map(x=>x.title)));
 t('2 ของเดิมบนเซิร์ฟเวอร์ไม่ถูกทับ',r.filter(x=>x.title==='SERVER-1').length===1&&r.filter(x=>x.title==='SERVER-2').length===1);
 t('2 ของมือถือครบทั้ง 3 (id ชนถูกเลื่อน)',['MOBILE-X','MOBILE-Y','MOBILE-Z'].every(n=>r.some(x=>x.title===n)));
 // 3) ไม่นำเข้า
 const C=await mkUser('c');await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,Prefer:'return=minimal'},body:JSON.stringify([{id:1,user_id:C.id,type:'task',title:'SERVER-C',track:'none'}])});
 p=await session([mk(5,'SKIP-ME')]);await login(p,C);t('3 ขึ้นหน้าต่างถาม',await p.locator('[data-act="imp-skip"]').isVisible());
 await p.click('[data-act="imp-skip"]');await p.waitForTimeout(1500);r=await rows(C.id);t('3 ไม่นำเข้า: ยังมีแค่ของเดิม',r.length===1&&r[0].title==='SERVER-C');
 await p.evaluate(()=>doSignOut(false));await p.waitForTimeout(1500);await login(p,C);t('3 จำคำตอบ ไม่ถามอีก',!(await p.locator('[data-act="imp-skip"]').isVisible()));
 // 5) ปิดหน้าต่างโดยไม่ตอบ -> ครั้งหน้าถามใหม่
 const D=await mkUser('d');await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,Prefer:'return=minimal'},body:JSON.stringify([{id:1,user_id:D.id,type:'task',title:'SERVER-D',track:'none'}])});
 p=await session([mk(9,'LATER')]);await login(p,D);await p.keyboard.press('Escape').catch(()=>{});await p.evaluate(()=>{try{closeTop()}catch(e){}});await p.waitForTimeout(600);
 t('5 ปิดโดยไม่ตอบ: ไม่เขียนอะไร',(await rows(D.id)).length===1);
 await p.evaluate(()=>doSignOut(false));await p.waitForTimeout(1500);await login(p,D);t('5 ไม่ตอบ = ครั้งหน้าถามใหม่',await p.locator('[data-act="imp-add"]').isVisible());
}catch(e){console.log('ERR',String(e).slice(0,220));ok=false}
finally{for(const id of U){await fetch(SB+'/rest/v1/item_logs?user_id=eq.'+id,{method:'DELETE',headers:adm});await fetch(SB+'/rest/v1/items?user_id=eq.'+id,{method:'DELETE',headers:adm});await fetch(SB+'/auth/v1/admin/users/'+id,{method:'DELETE',headers:adm})}await b.close();console.log(ok?'ALL PASS':'HAS FAIL')}

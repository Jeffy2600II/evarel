import { chromium } from 'playwright'; import fs from 'fs';
const vals={};for(const l0 of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){let l=l0.trim().replace(/^export /,'');const i=l.indexOf('=');if(i<0)continue;let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}
const K=vals.SUPABASE_SERVICE_KEY,SB='https://vdbmwmmsfrgpaauzspup.supabase.co',API='https://evarel-api-b-test.nontakorn2600.workers.dev',APP='http://localhost:8779/index.html';
const adm={apikey:K,Authorization:'Bearer '+K};const mkU=async(n)=>{const em=`lk${n}${Date.now()}@example.com`;const r=await (await fetch(SB+'/auth/v1/admin/users',{method:'POST',headers:{...adm,'Content-Type':'application/json'},body:JSON.stringify({email:em,password:'Passw0rd!lk1',email_confirm:true})})).json();return {em,id:r.id}};
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});const U=[];let ok=true;const t=(n,c)=>{console.log(c?'PASS':'FAIL',n);if(!c)ok=false};
try{
 const A=await mkU('a'),Bu=await mkU('b');U.push(A,Bu);
 await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({id:1,user_id:A.id,type:'task',title:'SECRET-OF-A',track:'none'})});
 const c=await b.newContext({viewport:{width:412,height:915}});await c.addInitScript(a=>{window.EVAREL_API=a},API);
 const p=await c.newPage();await p.route(/fonts\./,r=>r.abort());
 let open=0,closed=0;p.on('websocket',w=>{open++;w.on('close',()=>closed++)});
 const login=async u=>{await p.goto(APP);await p.waitForTimeout(1200);await p.click('[data-act="au-go"][data-id="login"]').catch(()=>{});await p.waitForTimeout(300);await p.fill('#f-email',u.em);await p.fill('#f-password','Passw0rd!lk1');await p.click('button[type="submit"]');await p.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:20000});await p.waitForTimeout(3500)};
 await login(A);const txtA=await p.evaluate(()=>document.querySelector('.ev-app').innerText);t('A เห็นรายการของตัวเอง',txtA.includes('SECRET-OF-A'));
 // ออกจากระบบด้วยการเรียกฟังก์ชันของแอปตรงๆ
 await p.evaluate(()=>doSignOut(false));await p.waitForTimeout(2500);
 t('ออกจากระบบแล้วซ็อกเก็ตถูกปิด (open='+open+' closed='+closed+')',open>=1&&closed>=1);
 const afterOut=await p.evaluate(()=>document.querySelector('.ev-app')?.innerText||'');t('หลังออก ไม่มีข้อมูลของ A บนหน้า',!afterOut.includes('SECRET-OF-A'));
 // เขียนเพิ่มให้ A หลังออก: ถ้าซ็อกเก็ตรั่ว หน้าจะเปลี่ยน
 await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({id:2,user_id:A.id,type:'task',title:'LEAK-AFTER-LOGOUT',track:'none'})});await p.waitForTimeout(3500);
 const leak=await p.evaluate(()=>document.body.innerText);t('A เขียนเพิ่มหลังออก หน้าไม่เปลี่ยน',!leak.includes('LEAK-AFTER-LOGOUT'));
 await login(Bu);const txtB=await p.evaluate(()=>document.querySelector('.ev-app').innerText);t('B ล็อกอินต่อบนเครื่องเดียวกัน ไม่เห็นของ A',!txtB.includes('SECRET-OF-A')&&!txtB.includes('LEAK-AFTER-LOGOUT'));
 await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({id:3,user_id:A.id,type:'task',title:'A-WRITES-WHILE-B-IN',track:'none'})});await p.waitForTimeout(3500);
 const txtB2=await p.evaluate(()=>document.body.innerText);t('A เขียนระหว่างที่ B ใช้งาน B ไม่เห็น',!txtB2.includes('A-WRITES-WHILE-B-IN'));
}catch(e){console.log('ERR',String(e).slice(0,200));ok=false}
finally{for(const u of U){if(u.id){await fetch(SB+'/rest/v1/items?user_id=eq.'+u.id,{method:'DELETE',headers:adm});await fetch(SB+'/auth/v1/admin/users/'+u.id,{method:'DELETE',headers:adm})}}await b.close();console.log(ok?'ALL PASS':'HAS FAIL')}

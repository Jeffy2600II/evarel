import { chromium } from 'playwright'; import fs from 'fs';
const vals={};for(const l0 of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){let l=l0.trim().replace(/^export /,'');const i=l.indexOf('=');if(i<0)continue;let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}
const K=vals.SUPABASE_SERVICE_KEY,SB='https://vdbmwmmsfrgpaauzspup.supabase.co',API='https://evarel-api-b-test.nontakorn2600.workers.dev',APP=process.argv[2]||'http://localhost:8779/index.html';
const adm={apikey:K,Authorization:'Bearer '+K};
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const em='lat'+Date.now()+'@example.com';let uid=null,gets=0,wsOpen=0;
try{
 const c=await b.newContext({viewport:{width:412,height:915}});await c.addInitScript(a=>{window.EVAREL_API=a},API);
 const B=await c.newPage();await B.route(/fonts\./,r=>r.abort());
 B.on('request',r=>{if(/\/api\/items$/.test(r.url())&&r.method()==='GET')gets++});B.on('websocket',()=>wsOpen++);
 await B.goto(APP);await B.waitForTimeout(1200);
 await B.click('[data-act="au-go"][data-id="signup"]');await B.waitForTimeout(300);await B.fill('#f-name','lat');await B.fill('#f-email',em);await B.fill('#f-password','Passw0rd!x1');await B.check('input[name="terms"]');await B.click('button[type="submit"]');
 await B.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:20000});await B.waitForTimeout(4000);
 const us=await (await fetch(SB+'/auth/v1/admin/users?per_page=100',{headers:adm})).json();uid=(us.users||[]).find(u=>u.email===em)?.id;
 // นิ่ง 35 วินาที: นับ GET (polling เดิมจะยิง ~3 ครั้ง)
 const g0=gets;await B.waitForTimeout(35000);console.log('IDLE_GETS_35s',gets-g0,'(polling เดิม ~3)');
 // เขียนจากภายนอก (จำลองเครื่อง A) แล้ววัดเวลาที่ B เห็น
 const t0=Date.now();
 await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({id:77,user_id:uid,type:'task',title:'LATENCY-PROBE',track:'none'})});
 await B.waitForFunction(()=>document.querySelector('.ev-app')?.innerText.includes('LATENCY-PROBE'),null,{timeout:20000});
 console.log('SEEN_MS',Date.now()-t0,'| ws_opened',wsOpen,'| gets_total',gets);
}catch(e){console.log('ERR',String(e).slice(0,160))}
finally{ if(uid){await fetch(SB+'/rest/v1/items?user_id=eq.'+uid,{method:'DELETE',headers:adm});await fetch(SB+'/auth/v1/admin/users/'+uid,{method:'DELETE',headers:adm})} await b.close()}

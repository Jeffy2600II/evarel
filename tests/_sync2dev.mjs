import { chromium } from 'playwright'; import fs from 'fs';
const vals={}; for(let l of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){l=l.trim().replace(/^export /,'');const i=l.indexOf('=');if(i>0){let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}}
const K=vals.SUPABASE_SERVICE_KEY,SB='https://vdbmwmmsfrgpaauzspup.supabase.co',API='https://evarel-api-b-test.nontakorn2600.workers.dev',APP='http://localhost:8779/index.html';
const j=async(m,u,b,h={})=>{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...h},body:b?JSON.stringify(b):undefined});const t=await r.text();try{return JSON.parse(t)}catch{return t}};
const adm={apikey:K,Authorization:'Bearer '+K};
const em=`sync-${Math.random().toString(36).slice(2,7)}@example.com`,pw='Passw0rd!x1';
const u=await j('POST',SB+'/auth/v1/admin/users',{email:em,password:pw,email_confirm:true,user_metadata:{full_name:'ซิงก์'}},adm);
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const ok=(n,c,v='')=>console.log((c?'PASS ':'FAIL ')+n,v);
async function open(){const c=await b.newContext({viewport:{width:412,height:915}});await c.addInitScript(a=>{window.EVAREL_API=a},API);const p=await c.newPage();await p.route(/fonts\./,r=>r.abort());
 await p.goto(APP);await p.waitForTimeout(1200);await p.click('[data-act="au-go"][data-id="login"]');await p.waitForTimeout(300);
 await p.fill('#f-email',em);await p.fill('#f-password',pw);await p.click('button[type="submit"]');
 await p.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:20000});await p.waitForTimeout(1800);return p}

async function addItem(p,title){await p.click('[data-act="add"]');await p.waitForTimeout(600);await p.click('#sheet [data-act="dtype"][data-id="task"]');await p.waitForTimeout(700);
 await p.fill('#sheet input[name="title"]',title);
 const sub=await p.$('#sheet button[type="submit"]'); if(sub) await sub.click(); else await p.press('#sheet input[name="title"]','Enter');
 await p.waitForTimeout(1800);return sub?'submit-btn':'enter'}
const dbTitles=async()=>{const r=await j('GET',SB+'/rest/v1/items?select=title&user_id=eq.'+u.id,null,adm);return Array.isArray(r)?r.map(x=>x.title):r};
const titles=p=>p.evaluate(()=>document.querySelector('.ev-app')?.innerText.replace(/\s+/g,' ')||'');
try{
 const A=await open(),B=await open();
 ok('เปิดได้ 2 เครื่อง (บัญชีเดียวกัน)',true);
 // A เพิ่มรายการผ่านปุ่มจริง
 console.log('วิธีบันทึก:',await addItem(A,'งานจากเครื่อง A'),'| ในฐานข้อมูล:',JSON.stringify(await dbTitles()));
 ok('A เห็นรายการของตัวเอง',(await titles(A)).includes('งานจากเครื่อง A'),await titles(A));
 // B ยังไม่เห็นทันที แล้วต้องเห็นเองภายใน ~ 20 วินาทีโดยไม่รีเฟรช
 const t0=Date.now();let seen=false;
 while(Date.now()-t0<26000){ if((await titles(B)).includes('งานจากเครื่อง A')){seen=true;break} await B.waitForTimeout(1000)}
 ok('B เห็นรายการจาก A เองโดยไม่รีเฟรช',seen,Math.round((Date.now()-t0)/1000)+'s');
 // B สลับกลับมาโฟกัส -> ต้องดึงทันที: เพิ่มจาก A อีกอัน แล้วจำลอง visibilitychange
 await addItem(A,'งานที่สองจาก A');
 await B.evaluate(()=>window.dispatchEvent(new Event('focus')));await B.waitForTimeout(2500);
 ok('B ดึงทันทีเมื่อกลับมาโฟกัส',(await titles(B)).includes('งานที่สองจาก A'));
 // ไม่ทับการแก้ที่ยังไม่เสร็จ: B เปิดฟอร์มพิมพ์ค้างไว้ แล้ว A เพิ่ม -> ฟอร์ม B ต้องไม่หาย
 await B.click('[data-act="add"]');await B.waitForTimeout(600);await B.click('#sheet [data-act="dtype"][data-id="task"]');await B.waitForTimeout(700);await B.fill('#sheet input[name="title"]','กำลังพิมพ์ค้าง');
 await addItem(A,'งานที่สามจาก A');
 await B.evaluate(()=>window.dispatchEvent(new Event('focus')));await B.waitForTimeout(2500);
 ok('ฟอร์มที่กำลังพิมพ์ใน B ไม่ถูกล้าง',(await B.inputValue('#sheet input[name="title"]'))==='กำลังพิมพ์ค้าง');
}catch(e){console.log('ERR',String(e).slice(0,300))}
finally{await b.close();await j('DELETE',SB+'/auth/v1/admin/users/'+u.id,null,adm)}

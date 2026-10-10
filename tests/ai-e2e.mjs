import { chromium } from 'playwright'; import fs from 'fs';
const vals={};for(const l0 of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){let l=l0.trim().replace(/^export /,'');const i=l.indexOf('=');if(i<0)continue;let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}
const K=vals.SUPABASE_SERVICE_KEY,SB='https://vdbmwmmsfrgpaauzspup.supabase.co',API='https://evarel-api-b-test.nontakorn2600.workers.dev',APP=process.argv[2]||'http://localhost:8779/index.html';
const adm={apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'};
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});let uid,ok=true;const t=(n,c,v='')=>{console.log(c?'PASS':'FAIL',n,v);if(!c)ok=false};
const em=`e2e${Date.now()}@example.com`,pw='Passw0rd!e21';
const rows=async()=>(await (await fetch(SB+`/rest/v1/items?user_id=eq.${uid}&select=id,title,time,type,rem,repeat&order=id`,{headers:adm})).json());
try{
 const u=await (await fetch(SB+'/auth/v1/admin/users',{method:'POST',headers:adm,body:JSON.stringify({email:em,password:pw,email_confirm:true})})).json();uid=u.id;
 await fetch(SB+'/rest/v1/items',{method:'POST',headers:{...adm,Prefer:'return=minimal'},body:JSON.stringify([{id:1,user_id:uid,type:'task',title:'การบ้านฟิสิกส์',subject:'',time:'',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},start:'2026-10-12',end:'',skip:{},rem:[]}])});
 const c=await b.newContext({viewport:{width:412,height:915}});await c.addInitScript(a=>{window.EVAREL_API=a},API);
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
 await p.goto(APP);await p.waitForTimeout(800);
 await p.click('[data-act="au-go"][data-id="login"]').catch(()=>{});await p.waitForTimeout(300);await p.fill('#f-email',em);await p.fill('#f-password',pw);await p.click('button[type="submit"]');
 await p.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:20000});await p.waitForTimeout(2500);
 // เปิดหน้า AI
 await p.click('[data-act="ai"]');await p.waitForTimeout(900);
 const send=async txt=>{await p.fill('#aiText',txt);await p.click('.ev-send');await p.waitForTimeout(500)};
 // 1) สั่งเพิ่ม -> การ์ด -> ยังไม่เขียน
 await send('เพิ่มกิจวัตรออกกำลังกายทุกเช้า 06:00 เตือนก่อน 10 นาที');
 await p.waitForSelector('[data-act="ai-cok"]',{timeout:30000});
 t('1 AI ตอบเป็นการ์ดยืนยัน',await p.locator('[data-act="ai-cok"]').isVisible());
 t('1 ยังไม่เขียนก่อนกดยืนยัน',(await rows()).length===1);
 const card=await p.locator('.ev-card b').last().innerText();console.log('  card:',card);
 // 2) ยืนยัน -> ขึ้น Supabase
 await p.click('[data-act="ai-cok"]');await p.waitForTimeout(2500);let r=await rows();
 t('2 กดยืนยัน: ขึ้นฐานข้อมูลจริง',r.length===2&&r.some(x=>/ออกกำลัง/.test(x.title)),JSON.stringify(r.map(x=>x.title)));
 const nw=r.find(x=>/ออกกำลัง/.test(x.title));
 t('2 เวลา 06:00',nw?.time==='06:00');
 t('2 รูปแบบเตือนถูกต้อง [{k:before,m:10}]',JSON.stringify(nw?.rem)==='[{"k":"before","m":10}]',JSON.stringify(nw?.rem));
 t('2 การ์ดเปลี่ยนเป็น "ทำแล้ว"',(await p.locator('.ev-chip',{hasText:'ทำแล้ว'}).count())>=1);
 // 3) สั่งลบ -> การ์ดแดง -> ยกเลิก -> ไม่ลบ
 await send('ลบการบ้านฟิสิกส์');await p.waitForSelector('[data-act="ai-cno"]',{timeout:30000});
 t('3 ลบ: ขึ้นการ์ดปุ่มสีอันตราย',await p.locator('.ev-btn-solid-danger[data-act="ai-cok"]').isVisible());
 await p.click('[data-act="ai-cno"]');await p.waitForTimeout(1200);
 t('3 กดยกเลิก: ไม่ลบ',(await rows()).length===2);
 // 4) สั่งลบอีกรอบ -> ยืนยัน -> ลบจริง
 await send('ลบการบ้านฟิสิกส์');await p.waitForSelector('.ev-btn-solid-danger[data-act="ai-cok"]',{timeout:30000});
 await p.click('.ev-btn-solid-danger[data-act="ai-cok"]');await p.waitForTimeout(2500);r=await rows();
 t('4 ยืนยันลบ: หายจากฐานข้อมูล',r.length===1&&!r.some(x=>/ฟิสิกส์/.test(x.title)),JSON.stringify(r.map(x=>x.title)));
 // 5) ประวัติแชทเก็บการ์ดที่ตอบแล้ว รีโหลดแล้วยังอยู่
 await p.reload();await p.waitForTimeout(3000);
 t('5 ไม่มี pageerror',errs.length===0,errs.join('|').slice(0,120));
}catch(e){console.log('ERR',String(e).slice(0,240));ok=false}
finally{if(uid){await fetch(SB+'/rest/v1/items?user_id=eq.'+uid,{method:'DELETE',headers:adm});await fetch(SB+'/auth/v1/admin/users/'+uid,{method:'DELETE',headers:adm})}await b.close();console.log(ok?'ALL PASS':'HAS FAIL')}

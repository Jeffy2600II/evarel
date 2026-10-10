/* ทดสอบบนเว็บที่ deploy จริง + Worker จริง + Groq จริง + MemoryLake จริง (ไม่จำลองอะไร) ผู้ใช้ทดสอบถูกลบหลังจบ */
import { chromium } from 'playwright'; import fs from 'fs';
const vals={};for(const l0 of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){let l=l0.trim().replace(/^export /,'');const i=l.indexOf('=');if(i<0)continue;let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}
const K=vals.SUPABASE_SERVICE_KEY,SB='https://vdbmwmmsfrgpaauzspup.supabase.co',APP=process.argv[2]||'https://evarel-v13s-test.nontakorn2600.workers.dev/';
const adm={apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'};
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});let uid,ok=true;const t=(n,c,v='')=>{console.log(c?'PASS':'FAIL',n,v);if(!c)ok=false};
const em=`memweb${Date.now()}@example.com`,pw='Passw0rd!W3b99';
try{
 const u=await (await fetch(SB+'/auth/v1/admin/users',{method:'POST',headers:adm,body:JSON.stringify({email:em,password:pw,email_confirm:true})})).json();uid=u.id;
 const c=await b.newContext({viewport:{width:412,height:915}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
 await p.goto(APP);await p.waitForTimeout(1200);
 await p.click('[data-act="au-go"][data-id="login"]').catch(()=>{});await p.waitForTimeout(300);await p.fill('#f-email',em);await p.fill('#f-password',pw);await p.click('button[type="submit"]');
 await p.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:25000});await p.waitForTimeout(2000);
 t('0 SW v29 ทำงานบนเว็บจริง',await p.evaluate(async()=>{const ks=await caches.keys();return ks.some(k=>/v29-mem/.test(k))}).catch(()=>false));
 await p.click('[data-act="ai"]');await p.waitForTimeout(900);
 const send=async txt=>{await p.fill('#aiText',txt);await p.click('.ev-send');await p.waitForTimeout(500)};
 // 1) สั่งให้จำ
 await send('จำไว้ว่าฉันเรียนอยู่ ม.5/1 และชอบอ่านหนังสือก่อนนอน');await p.waitForSelector('[data-act="ai-cok"]',{timeout:30000});
 const lbl=(await p.locator('[data-act="ai-cok"]').last().innerText()).trim();const cardTxt=await p.locator('.ev-card').last().innerText();console.log('   การ์ด:',cardTxt.replace(/\n/g,' | ').slice(0,120));
 t('1 การ์ดปุ่ม "จำไว้"',lbl==='จำไว้',lbl);
 await p.locator('[data-act="ai-cok"]').last().click();await p.waitForSelector('.ev-chip:has-text("จำแล้ว")',{timeout:15000}).catch(()=>{});
 t('1 กดแล้วเป็น "จำแล้ว" (เขียน MemoryLake จริง)',(await p.locator('.ev-chip',{hasText:'จำแล้ว'}).count())===1);
 // 2) แชทใหม่ ถามกลับ -> ต้องจำได้
 await p.click('[data-act="ai-new"]').catch(async()=>{await p.click('[data-act="ai-hist"]').catch(()=>{});});await p.waitForTimeout(700);
 await send('ฉันเรียนอยู่ชั้นไหน และชอบทำอะไรก่อนนอน');await p.waitForTimeout(6000);
 const ans=await p.locator('.ev-bubble-ai').last().innerText();console.log('   AI ตอบ:',ans.replace(/\n/g,' ').slice(0,140));
 t('2 แชทใหม่: AI จำได้ (พูดถึง ม.5 และหนังสือ)',/5/.test(ans)&&/หนังสือ/.test(ans));
 // 3) สั่งลืม
 await send('ลืมเรื่องที่ฉันชอบอ่านหนังสือก่อนนอนไปได้เลย');await p.waitForSelector('[data-act="ai-cok"]',{timeout:30000});
 const lbl2=(await p.locator('[data-act="ai-cok"]').last().innerText()).trim();console.log('   การ์ดลืม:',(await p.locator('.ev-card').last().innerText()).replace(/\n/g,' | ').slice(0,120));
 t('3 การ์ดปุ่ม "ลืม"',lbl2==='ลืม',lbl2);
 await p.locator('[data-act="ai-cok"]').last().click();await p.waitForSelector('.ev-chip:has-text("ลืมแล้ว")',{timeout:15000}).catch(()=>{});
 t('3 กดแล้วเป็น "ลืมแล้ว"',(await p.locator('.ev-chip',{hasText:'ลืมแล้ว'}).count())===1);
 await p.waitForTimeout(1500);
 // 4) ถามอีกรอบ -> ต้องไม่รู้เรื่องหนังสือแล้ว แต่ยังรู้ ม.5/1
 await p.click('[data-act="ai-new"]').catch(()=>{});await p.waitForTimeout(700);
 await send('ฉันชอบทำอะไรก่อนนอน');await p.waitForTimeout(6000);
 const ans2=await p.locator('.ev-bubble-ai').last().innerText();console.log('   AI ตอบหลังลืม:',ans2.replace(/\n/g,' ').slice(0,140));
 t('4 หลังลืม: ไม่เล่าเรื่องอ่านหนังสือก่อนนอนอีก',!/อ่านหนังสือ/.test(ans2)||/ไม่(ทราบ|รู้|มี)/.test(ans2));
 // 5) ผู้ใช้ไม่เห็น id ภายใน
 const all=await p.locator('.ev-chat').last().innerText();t('5 UI ไม่โชว์ id ภายใน (fact-...)',!/fact-[0-9a-f]{8}/.test(all));
 t('6 ไม่มี pageerror',errs.length===0,errs.join('|').slice(0,160));
}catch(e){console.log('ERR',String(e).slice(0,300));ok=false}
finally{
 try{const base='https://app.memorylake.ai/openapi/memorylake/api/v3',h={Authorization:'Bearer '+vals.MEMORYLAKE_API_KEY};const g=await (await fetch(`${base}/actors/${encodeURIComponent('evarel:'+uid)}?by_custom_id=true`,{headers:h})).json();if(g?.data?.id){const r=await fetch(`${base}/actors/${g.data.id}`,{method:'DELETE',headers:h});console.log('   เก็บกวาด actor:',r.status)}}catch{}
 if(uid){await fetch(SB+'/rest/v1/items?user_id=eq.'+uid,{method:'DELETE',headers:adm});await fetch(SB+'/auth/v1/admin/users/'+uid,{method:'DELETE',headers:adm})}
 await b.close();console.log(ok?'ALL PASS':'SOME FAILED');process.exit(ok?0:1)}

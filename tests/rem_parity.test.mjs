/* ประตูภาพแผงแจ้งเตือนในฟอร์ม (ฉากที่เดิมประตูพาริตีไม่จับเพราะต้องคลิกขยาย) — เทียบเดโม v24 จริงกับแอป 0 พิกเซล
   รัน: node tests/_rem_parity.mjs */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const user=await makeTestUser('remparity'); user.session.user={...user.session.user,name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; await seedItems(user.session,SEED_ITEMS);
const APP='http://localhost:8779/index.html';
async function run(url,cs,file,logged){
  const isApp=url===APP; let p;
  if(isApp){ const ctx=logged?await openAsUser(b,user,{colorScheme:cs}):await openAsUser(b,{session:null},{colorScheme:cs}); p=await ctx.newPage(); }
  else{ p=await b.newPage({viewport:{width:412,height:915},colorScheme:cs,timezoneId:'Asia/Bangkok'}); }
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/,async r=>{ const u=r.request().url();
    if(/fonts\.googleapis\.com\/css/.test(u)){ const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8'); const m=css.match(/@font-face\{font-family:'Anuphan'[^\n]*\n(?:@font-face[^\n]*\n)*/); return r.fulfill({contentType:'text/css',body:(m?m[0]:'').replace(/url\(\.\.\/fonts\//g,'url(file:///tmp/evarel-repo/app/web/fonts/')}); }
    return r.abort(); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  if(isApp){ await p.goto(APP_ORIGIN+'/index.html'); await p.waitForTimeout(2600);
    await p.evaluate(()=>{ if(window.ST?.USER){ window.ST.USER.id='u_test'; window.render?.(); } }); await p.waitForTimeout(400); }
  else{ await p.goto(url); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear());
    await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},SEED_ITEMS);
    await p.reload(); await p.waitForTimeout(2600); }
  /* เปิดฟอร์มเพิ่มงานแล้วขยายแผงแจ้งเตือน */
  await p.click('[data-act="add"]'); await p.waitForTimeout(400);
  await p.click('[data-act="dtype"][data-id="task"]'); await p.waitForSelector('#addForm',{timeout:6000}); await p.waitForTimeout(400);
  await p.click('[data-act="dopen"][data-id="rem"]'); await p.waitForTimeout(500);
  const evStage=process.env.REM_STAGE||'task';
  if(evStage!=='task'){ /* ฉากฟอร์มกิจกรรม/คาบเรียน: แถว TR เริ่ม/จบ */
    await p.screenshot({path:file.replace('.png','_base.png')});
    await p.close(); return errs; }
  const geo=await p.evaluate(()=>{const el=document.querySelector('.ev-panel[data-key="rem"]');
  const rows=[...document.querySelectorAll('#addForm .ev-set-row,#addForm .ev-stepper,#addForm .ev-panel,#addForm .ev-cap,#addForm .ev-block,#addForm .ev-filters')].map(r=>{const b=r.getBoundingClientRect();return [r.className.split(' ')[0].slice(0,10),Math.round(b.y),Math.round(b.height),(r.textContent||'').replace(/\s+/g,' ').slice(0,24)]});
  const sc=document.querySelector('#sheet .ev-sheet-body, #sheet .ev-sheet-body, #sheet [class*="body"], #sheet');const r=el?el.getBoundingClientRect():null;return {rows,panel:r?Math.round(r.y):null,sheetScroll:sc?sc.scrollTop:null,panelTop:el?Math.round(el.getBoundingClientRect().top - (sc?sc.getBoundingClientRect().top:0)):null}});
  console.log('PANELGEO',url.slice(0,30),cs,JSON.stringify(geo));
  await p.screenshot({path:file});
  if(logged){ /* ถ่ายสถานะมีค่า: ใส่เวลาใน tbox กดเพิ่ม */
    await p.fill('#remTime','07:30'); await p.waitForTimeout(200);
    await p.click('[data-act="remadd"]'); await p.waitForTimeout(400);
    await p.screenshot({path:file.replace('.png','_added.png')}); }
  return errs;
}
async function runStage(stage,url,cs,file,logged){
  const isApp=url===APP; let p;
  if(isApp){ const ctx=logged?await openAsUser(b,user,{colorScheme:cs}):await openAsUser(b,{session:null},{colorScheme:cs}); p=await ctx.newPage(); }
  else{ p=await b.newPage({viewport:{width:412,height:915},colorScheme:cs,timezoneId:'Asia/Bangkok'}); }
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/,async r=>{ const u=r.request().url();
    if(/fonts\.googleapis\.com\/css/.test(u)){ const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8'); const m=css.match(/@font-face\{font-family:'Anuphan'[^\n]*\n(?:@font-face[^\n]*\n)*/); return r.fulfill({contentType:'text/css',body:(m?m[0]:'').replace(/url\(\.\.\/fonts\//g,'url(file:///tmp/evarel-repo/app/web/fonts/')}); }
    return r.abort(); });
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  if(isApp){ await p.goto(APP_ORIGIN+'/index.html'); await p.waitForTimeout(2600);
    await p.evaluate(()=>{ if(window.ST?.USER){ window.ST.USER.id='u_test'; window.render?.(); } }); await p.waitForTimeout(400); }
  else{ await p.goto(url); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear());
    await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},SEED_ITEMS);
    await p.reload(); await p.waitForTimeout(2600); }
  await p.click('[data-act="add"]'); await p.waitForTimeout(400);
  await p.click(`[data-act="dtype"][data-id="${stage}"]`); await p.waitForSelector('#addForm',{timeout:6000}); await p.waitForTimeout(450);
  if(process.env.REM_DEBUG) console.log('FOCUSDBG',stage,await p.evaluate(()=>{const ti=document.querySelector('.ev-title-input');return {border:ti?getComputedStyle(ti).borderBottomColor:null,active:(document.activeElement?.className||'')+'|'+(document.activeElement?.id||'')}}));
  await p.screenshot({path:file});
  await p.close();
  return errs;
}
let bad=0;
for(const cs of ['light','dark']){
  const e1=await run('file:///tmp/evarel-repo/design/master-demo-v24.html',cs,'/tmp/rem_demo_'+cs+'.png',true);
  const e2=await run(APP,cs,'/tmp/rem_app_'+cs+'.png',true);
  for(const suf of ['','_added']){
    const a=(await import('child_process')).execSync(`python3 - <<'PY'
from PIL import Image, ImageChops
import sys
A=Image.open('/tmp/rem_demo_${cs}${suf}.png').convert('RGB'); B=Image.open('/tmp/rem_app_${cs}${suf}.png').convert('RGB')
d=ImageChops.difference(A,B).convert('L')
px=[(x,y) for y in range(d.height) for x in range(d.width) if d.getpixel((x,y))>8]
print(len(px), (px[0][0],px[0][1],px[-1][0],px[-1][1]) if px else '')
PY`).toString().trim();
    const [n,box]=a.split(' ');
    const ok=n==='0';
    if(!ok)bad++;
    console.log((ok?'PASS ':'FAIL ')+cs+suf+' ต่าง '+n+' พิกเซล '+(box||''));
  }
  if(e1.length||e2.length){bad++;console.log('errs เดโม',e1.length,'แอป',e2.length,e1[0],e2[0]);}
}
/* ฉากฟอร์มกิจกรรม + คาบเรียน (แถว TR เริ่ม/จบ) */
import { execSync } from 'child_process';
for(const stage of ['event','class']){
  for(const cs of ['light','dark']){
    const e1=await runStage(stage,'file:///tmp/evarel-repo/design/master-demo-v24.html',cs,`/tmp/rem_demo_${stage}_${cs}.png`,true);
    const e2=await runStage(stage,APP,cs,`/tmp/rem_app_${stage}_${cs}.png`,true);
    const out=execSync(`python3 - <<'PY'
from PIL import Image, ImageChops
A=Image.open('/tmp/rem_demo_${stage}_${cs}.png').convert('RGB'); B=Image.open('/tmp/rem_app_${stage}_${cs}.png').convert('RGB')
d=ImageChops.difference(A,B).convert('L')
n=sum(1 for y in range(d.height) for x in range(d.width) if d.getpixel((x,y))>8)
print(n)
PY`).toString().trim();
    const ok=out==='0'; if(!ok)bad++;
    console.log((ok?'PASS ':'FAIL ')+stage+' '+cs+' ต่าง '+out+' พิกเซล');
    if(e1.length||e2.length){bad++;console.log('errs',e1[0],e2[0]);}
  }
}
await b.close();
console.log(bad? 'REM-PARITY FAIL' : 'REM-PARITY PASS');
process.exit(bad?1:0);

import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, seedItems } from './live_user.mjs';
const user=await makeTestUser('parity');
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8')+'\n'+fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8');
const blocks=(css.match(/@font-face\s*\{[^}]*\}/g)||[]).filter(x=>/font-family:\s*['"]?(Anuphan|Noto Sans Thai)['"]?/.test(x));
const FONT_CSS=blocks.join('\n').replace(/url\(\s*['"]?\.\.\/fonts\//g,"url('file:///tmp/evarel-repo/app/web/fonts/");
const DEMO='file:///tmp/evarel-repo/design/master-demo-v24.html';
async function t(name,{init=false,reload=false,fc=false}={}){
  const p=await b.newPage({viewport:{width:412,height:915},colorScheme:'light',timezoneId:'Asia/Bangkok'});
  if(init) await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F; const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st));});
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  if(fc) await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
  await p.goto(DEMO); await p.waitForTimeout(800);
  await p.evaluate(()=>localStorage.clear());
  if(reload){ await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},[{x:1}]); await p.reload(); await p.waitForTimeout(2600); }
  const r=await p.evaluate(async()=>{ await document.fonts.ready; return document.fonts.size+':'+[...document.fonts].filter(f=>f.family==='Anuphan').length; });
  try{ await p.addStyleTag({content:FONT_CSS}); await p.evaluate(async()=>{ await Promise.all([...document.fonts].map(f=>f.load().catch(()=>{}))); }); }catch(e){ console.log(name,'INJERR',e.message.slice(0,80)); }
  const r2=await p.evaluate(async()=>{ await document.fonts.ready; return document.fonts.size+':'+[...document.fonts].filter(f=>f.family==='Anuphan').length; });
  console.log(name,'ก่อน',r,'หลัง',r2);
  await p.close();
}
await t('1 เบสิก',{});
await t('2 +fc',{fc:true});
await t('3 +reload',{reload:true});
await t('4 +init',{init:true});
await t('5 ทั้งหมด',{init:true,reload:true,fc:true});
await b.close();

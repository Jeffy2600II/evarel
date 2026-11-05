import { chromium } from 'playwright'; import fs from 'fs'; import crypto from 'crypto';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const seen={};
for (let i=0;i<8;i++){
  const p=await b.newPage({viewport:{width:412,height:915},colorScheme:'light',timezoneId:'Asia/Bangkok'});
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  await p.goto('http://localhost:8792/index.html'); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear());
  await p.evaluate(()=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test')});
  await p.reload(); await p.waitForTimeout(2600); await p.waitForTimeout(500);
  const buf=await p.screenshot(); const h=crypto.createHash('sha256').update(buf).digest('hex').slice(0,8);
  const txt=await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,260));
  (seen[h] ||= {n:0,txt,buf}).n++; if(!seen[h].saved){fs.writeFileSync('/tmp/flap_'+h+'.png',buf); seen[h].saved=1}
  await p.close();
}
const ks=Object.keys(seen); console.log('จำนวนภาพต่างกัน:',ks.length);
for (const k of ks) console.log(k,'x'+seen[k].n,'|',seen[k].txt.slice(0,200));
await b.close();

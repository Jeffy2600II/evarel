// เทียบ app-ts กับ app-v13 ตรงๆ (ไม่ผ่านเดโม) ภาพเดียวกัน สถานะเดียวกัน รันซ้ำหลายรอบเพื่อวัดความนิ่ง
import { chromium } from 'playwright'; import fs from 'fs'; import crypto from 'crypto';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const [,, A, B, REPS='3', WAIT='2600'] = process.argv;
async function shot(url,cs,tab){
  const p=await b.newPage({viewport:{width:412,height:915},colorScheme:cs,timezoneId:'Asia/Bangkok'});
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  await p.goto(url); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear());
  await p.evaluate(()=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test')});
  await p.reload(); await p.waitForTimeout(+WAIT);
  if(tab==='all') await p.click('[data-tab="all"]');
  if(tab==='calendar'){ await p.click('[data-tab="calendar"]'); await p.waitForTimeout(1200); }
  await p.waitForTimeout(500);
  const buf=await p.screenshot(); await p.close(); return crypto.createHash('sha256').update(buf).digest('hex').slice(0,12);
}
for (const tab of ['today','all','calendar']) for (const cs of ['light']) {
  const ra=[], rb=[];
  for (let i=0;i<+REPS;i++){ ra.push(await shot(A,cs,tab)); rb.push(await shot(B,cs,tab)); }
  console.log(`${cs} ${tab}`.padEnd(16),'A:',[...new Set(ra)].join(','),'| B:',[...new Set(rb)].join(','),'|',(new Set([...ra,...rb]).size===1?'เหมือนกันทุกรอบ':'ต่างหรือไม่นิ่ง'));
}
await b.close();

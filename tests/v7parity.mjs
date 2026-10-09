import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
async function run(url,cs,file,step){
  const p=await b.newPage({viewport:{width:412,height:915},colorScheme:cs,timezoneId:'Asia/Bangkok'});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date; const fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;});
  await p.goto(url); await p.waitForTimeout(1500);
  await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await step(p); await p.waitForTimeout(700);
  await p.screenshot({path:file}); await p.close(); return errs.length;
}
const steps={
 today:async p=>{}, 
 all:async p=>{await p.click('[data-tab="all"]')},
 schedule:async p=>{await p.click('[data-tab="schedule"]')},
 stats:async p=>{await p.click('[data-tab="stats"]')},
 add:async p=>{await p.click('[data-act="add"]')},
};
let bad=0;
for(const cs of ['light','dark']) for(const [n,st] of Object.entries(steps)){
  const e1=await run('http://localhost:8773/index.html',cs,'o.png',st);
  const e2=await run('http://localhost:8774/index.html',cs,'n.png',st);
  const r=execSync(`python3 -W ignore -c "from PIL import Image,ImageChops;a=Image.open('o.png').convert('RGB');b=Image.open('n.png').convert('RGB');d=ImageChops.difference(a,b);print(d.getbbox(), sum(1 for v in d.convert('L').getdata() if v>8))"`).toString().trim();
  console.log(cs,n,'diff:',r,'errs',e1,e2); if(!r.endsWith(' 0')) bad++;
}
console.log('screens differing:',bad);
await b.close();

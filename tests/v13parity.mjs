// เทียบภาพ 0 พิกเซล: เดโม v12 ต้นฉบับ (design/master-demo-v12.html) กับ app-v13 | สถานะเดียวกัน (MockAuth ของเดโม)
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const DEMO='file:///tmp/evarel-repo/design/master-demo-v12.html', APP=process.argv[2]||'http://localhost:8779/index.html';
async function run(url,cs,file,step,logged){
  const p=await b.newPage({viewport:{width:412,height:915},colorScheme:cs,timezoneId:'Asia/Bangkok'});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  /* เดโมโหลด FullCalendar จาก CDN: ป้อนไฟล์เดียวกับที่แอปเก็บเองไว้ เพื่อเทียบเงื่อนไขเท่ากัน */
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  await p.goto(url); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear());
  if(logged){ await p.evaluate(()=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test')}); }
  await p.reload(); await p.waitForTimeout(2600);
  await step(p); await p.waitForTimeout(500); await p.screenshot({path:file}); await p.close(); return errs;
}
const click=s=>async p=>{await p.click(s)};
const steps={
 'app-today':[true,async p=>{}], 'app-all':[true,click('[data-tab="all"]')],
 'app-calendar':[true,async p=>{await p.click('[data-tab="calendar"]');await p.waitForTimeout(1200)}],
 'app-stats':[true,click('[data-tab="stats"]')], 'app-add':[true,click('[data-act="add"]')],
 'app-settings':[true,async p=>{await p.evaluate(()=>ACTIONS.settings());await p.waitForTimeout(600)}],
 'auth-welcome':[false,async p=>{}],
 'auth-login':[false,async p=>{await p.click('[data-act="au-go"][data-id="login"]')}],
 'auth-signup':[false,async p=>{await p.click('[data-act="au-go"][data-id="signup"]')}],
 'auth-forgot':[false,async p=>{await p.click('[data-act="au-go"][data-id="login"]');await p.waitForTimeout(300);await p.click('[data-act="au-go"][data-id="forgot"]')}],
};
let bad=0,total=0;
for(const cs of ['light','dark']) for(const [n,[lg,st]] of Object.entries(steps)){
  const e1=await run(DEMO,cs,'o.png',st,lg), e2=await run(APP,cs,'n.png',st,lg);
  const r=execSync(`python3 -W ignore -c "from PIL import Image,ImageChops;a=Image.open('o.png').convert('RGB');b=Image.open('n.png').convert('RGB');print(a.size==b.size);d=ImageChops.difference(a,b);print(d.getbbox(), sum(1 for v in d.convert('L').getdata() if v>8))"`).toString().trim().replace(/\n/g,' ');
  total++; const ok=r.endsWith(' 0')&&r.startsWith('True'); if(!ok)bad++;
  console.log(ok?'PASS':'FAIL',cs,n,r,'| errs demo',e1.length,'app',e2.length, e2.slice(0,1).join(''));
}
console.log(`\n${bad?bad+' FAILED of ':'ALL PASS '}${total}`); await b.close(); process.exit(bad?1:0);

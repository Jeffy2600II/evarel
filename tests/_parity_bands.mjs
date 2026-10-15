// เทียบภาพ 0 พิกเซล: เดโม v12 ต้นฉบับ (design/master-demo-v12.html) กับ app-v13 | สถานะเดียวกัน (MockAuth ของเดโม)
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
/* ฝั่งแอป = ผู้ใช้จริงผ่าน API forge (สร้างครั้งเดียว ลบท้ายสุด) | ฝั่งเดโม = mock ของไฟล์ต้นฉบับเอง ไม่แตะ | ชื่อและอีเมลที่แสดงผลตั้งให้ตรงเดโม (ไม่กระทบการยืนยันตัวตน เพราะเซิร์ฟเวอร์ตรวจ JWT) */
const user=await makeTestUser('parity'); user.session.user={...user.session.user,name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; await seedItems(user.session,SEED_ITEMS);
/* ต้นฉบับ = master-demo-v12.html ปรับเฉพาะ 3 จุดที่ตั้งใจให้แอปต่าง (พิสูจน์แล้ว 15 ต.ค. 2026): (1) ไม่มีปุ่มข้อมูลตัวอย่าง (คอมมิต 4d989eb), (2) รีเซ็ตข้อมูลทั้งหมด -> ลบรายการทั้งหมด, (3) ข้อความแจ้งเตือนตรงความจริง | ที่เหลือทุกพิกเซลต้อง 0 */
const DEMO='file:///tmp/evarel-repo/design/master-demo-v12-intended.html', APP=process.argv[2]||'http://localhost:8779/index.html';
async function run(url,cs,file,step,logged){
  const isApp=url===APP; let ctx=null, p;
  if(isApp){ ctx=logged?await openAsUser(b,user,{colorScheme:cs}):await openAsUser(b,{session:null},{colorScheme:cs}); p=await ctx.newPage(); }
  else{ p=await b.newPage({viewport:{width:412,height:915},colorScheme:cs,timezoneId:'Asia/Bangkok'}); }
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  /* เดโมโหลด FullCalendar จาก CDN: ป้อนไฟล์เดียวกับที่แอปเก็บเองไว้ เพื่อเทียบเงื่อนไขเท่ากัน */
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  if(isApp){ await p.goto(APP_ORIGIN+'/index.html'); await p.waitForTimeout(2600); }
  else{ await p.goto(url); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear()); }
  if(logged&&!isApp){ await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},SEED_ITEMS); }
  if(!isApp){ await p.reload(); await p.waitForTimeout(2600); }
  await step(p); await p.waitForTimeout(500); await p.screenshot({path:file}); await p.close(); if(ctx) await ctx.close(); return errs;
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
  const bands=execSync(`python3 -W ignore -c "from PIL import Image,ImageChops;a=Image.open('o.png').convert('RGB');b=Image.open('n.png').convert('RGB');d=ImageChops.difference(a,b).convert('L');w,h=d.size;px=d.load();rows=[y for y in range(h) if any(px[x,y]>8 for x in range(w))];g=[];
for y in rows:
    (g[-1].__setitem__(1,y) if g and y-g[-1][1]<=24 else g.append([y,y]))
print(g)"`).toString().trim();
  if(bands!=='[]')console.log('   ย่านต่าง(แนวตั้ง y):',bands);
  const r=execSync(`python3 -W ignore -c "from PIL import Image,ImageChops;a=Image.open('o.png').convert('RGB');b=Image.open('n.png').convert('RGB');print(a.size==b.size);d=ImageChops.difference(a,b);print(d.getbbox(), sum(1 for v in d.convert('L').getdata() if v>8))"`).toString().trim().replace(/\n/g,' ');
  total++; const ok=r.endsWith(' 0')&&r.startsWith('True'); if(!ok)bad++;
  console.log(ok?'PASS':'FAIL',cs,n,r,'| errs demo',e1.length,'app',e2.length, e2.slice(0,1).join(''));
}
console.log(`\n${bad?bad+' FAILED of ':'ALL PASS '}${total}`); await b.close(); console.log('ลบผู้ใช้ทดสอบ ->',await user.cleanup()); process.exit(bad?1:0);

// เทียบภาพ 0 พิกเซล: เดโม v12 ต้นฉบับ (design/master-demo-v12.html) กับ app-v13 | สถานะเดียวกัน (MockAuth ของเดโม)
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--disable-gpu','--disable-lcd-text','--font-render-hinting=none']});
/* ฟอนต์เดียวกับแอป ฉีดเข้าเดโมโดยตรง: ชีต https ที่ fulfill มาอ้าง file:// ไม่ได้ (Chrome ไม่ลงทะเบียนเลย) จึง addStyleTag ในเอกสาร file:// ที่อ้าง file:// ได้ */
const FONT_CSS=(()=>{ /* ฟอนต์ของแอป = ฟอนต์ระบบ (Master เลือก 23 ต.ค. 2026) จึงไม่มี @font-face ให้คัดลอก: อ่านค่า --font จริงจาก app.css แล้วทับ :root ฝั่งเดโม
     เดโมต้นฉบับประกาศ --font เป็น Anuphan จาก Google Fonts (โหลดไม่ได้ในเครื่องทดสอบ) ถ้าไม่พบ --font ต้องล้มดัง ไม่ใช่ได้ CSS ว่างเงียบๆ (ต้นเหตุที่ประตูตกทุกฉากโดยไม่มีใครรู้) */
  const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8'); const m=/--font:\s*([^;}]+)[;}]/.exec(css);
  if(!m) throw new Error('ไม่พบ --font ใน app.css: ประตูภาพฉีดฟอนต์ให้เดโมไม่ได้'); return ':root{--font:'+m[1].trim()+'!important}'; })();
/* ฝั่งแอป = ผู้ใช้จริงผ่าน API forge (สร้างครั้งเดียว ลบท้ายสุด) | ฝั่งเดโม = mock ของไฟล์ต้นฉบับเอง ไม่แตะ | ชื่อและอีเมลที่แสดงผลตั้งให้ตรงเดโม (ไม่กระทบการยืนยันตัวตน เพราะเซิร์ฟเวอร์ตรวจ JWT) */
const user=await makeTestUser('parity'); user.session.user={...user.session.user,name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; await seedItems(user.session,SEED_ITEMS);
/* ฐานเทียบ = เดโมจริงทั้งไฟล์ Evarel v24.html ไม่ใช่ไฟล์ intended | ต่างได้เฉพาะที่ Master อนุญาต: หน้าตั้งค่าที่ลบจุดออก, ข้อความ/ส่วนที่บอกว่าเป็นเดโมหรือจำลอง | ที่เหลือทุกพิกเซลต้อง 0 */
const DEMO='http://localhost:8779/design/Evarel%20v24.html', APP=process.argv[2]||'http://localhost:8779/index.html';
async function run(url,cs,file,step,logged,name){
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
  if(!isApp){ try{ await p.addStyleTag({content:FONT_CSS}); await p.evaluate(async()=>{ await Promise.all([...document.fonts].map(f=>f.load().catch(()=>{}))); }); }catch(e){ errs.push('font-inject: '+e.message.slice(0,60)); } }
  /* เงื่อนไขทดสอบ: สีอวตารสร้างจาก hash ของ id ผู้ใช้ (v24: id||email||name) เดโมใช้ id 'u_test' แต่ผู้ใช้ทดสอบของแอปมี UUID จริงจาก Supabase
     จึงได้ hue คนละเบอร์ทั้งที่อัลกอริทึมตรงกัน ตั้ง id ฝั่งแอปให้เท่าเดโมเฉพาะในหน้านี้ (ไม่แตะ session/ข้อมูล) แล้ววาดใหม่ก่อนถ่ายภาพ */
  if(isApp&&logged){ await p.evaluate(()=>{ if(window.ST?.USER){ window.ST.USER.id='u_test'; window.render?.(); } }); await p.waitForTimeout(400); }

  await step(p); await p.waitForTimeout(500);
  if(name==='app-settings'){ try{ SET_TITLES[isApp?'app':'demo']=await p.evaluate(()=>{const pg=document.querySelector('[data-page="settings"]'); return pg? pg.innerText.split('\n').map(l=>l.trim()).filter(l=>l):[];}); }catch(e){} }
  /* เงื่อนไขทดสอบ: การ์ดโควตาในตั้งค่า เดโมใช้ข้อมูลตัวอย่าง แอปได้ค่าจริงของผู้ใช้ทดสอบ ตั้ง ST.QUOTA ให้เท่ากันเฉพาะฉากตั้งค่า */
  if(isApp&&logged){ await p.evaluate(()=>{ const n=new Date(Date.now()+7*3600000); n.setUTCHours(0,0,0,0); n.setUTCDate(n.getUTCDate()+1); window.ST.QUOTA={resetAt:n.getTime(),blocked:false,calls:{used:6,limit:40,remaining:34},tokens:{used:7200,limit:60000,remaining:52800}}; const e=document.getElementById('usageWrap'); if(e){ e.innerHTML=window.usageCardHTML(); window.growBars?.(e); } }); await p.waitForTimeout(300); }
  /* settle รอย: บาร์สถิติ/ปฏิทินเป็นแอนิเมชั่น JS ที่ปิดด้วย init-script ไม่ได้ จับซ้ำจนภาพนิ่ง */
  { let prev=null; for(let i=0;i<12;i++){ const cur=await p.screenshot(); if(prev && cur.equals(prev)) break; prev=cur; await p.waitForTimeout(250); } }
  /* rebuild เลเยอร์หลังทุกอย่างนิ่งแล้ว: raster ที่เกิดก่อนฟอนต์/กลางแอนิเมชั่นทิ้ง AA มุมโค้งเพี้ยน สร้างใหม่ทั้งสองฝั่งในสถานะเดียวกัน */
  /* ปฏิทินข้าม rebuild: display-toggle ปลุก resize handler ของ FullCalendar ทำให้ชิปจุดคำนวณใหม่ไม่นิ่ง (วัดจริง: flaky 46px ทั้งสองโหมดในชุดเต็ม) ฉากอื่น rebuild เพื่อล้าง AA มุมโค้ง */
  await p.evaluate(async()=>{ const rb=async e=>{ if(!e) return; e.style.display='none'; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); e.style.display=''; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }; await rb(document.querySelector('.ev-nav')); if(name!=='app-calendar') await rb(document.querySelector('.ev-app')); });
  { let prev=null; for(let i=0;i<8;i++){ const cur=await p.screenshot(); if(prev && cur.equals(prev)) break; prev=cur; await p.waitForTimeout(250); } }
  { const rc=await p.evaluate(()=>[...document.querySelectorAll('.ev-card[data-tone="ink"]')].filter(e=>e.offsetParent!==null).map(e=>{const r=e.getBoundingClientRect();return [Math.floor(r.left),Math.floor(r.top),Math.ceil(r.right),Math.ceil(r.bottom)]}));
    fs.writeFileSync(file.replace('.png','.ink.json'),JSON.stringify(rc)); }
  await p.screenshot({path:file,animations:'disabled'}); await p.close(); if(ctx) await ctx.close(); return errs;
}
const click=s=>async p=>{await p.click(s)};
const steps={
 'app-today':[true,async p=>{}], 'app-all':[true,click('[data-tab="all"]')],
 'app-calendar':[true,async p=>{await p.click('[data-tab="calendar"]');await p.waitForTimeout(1200)}],
 'app-stats':[true,click('[data-tab="stats"]')], 'app-add':[true,click('[data-act="add"]')],
 'app-settings':[true,async p=>{await p.evaluate(()=>ACTIONS.settings());await p.waitForTimeout(600)}],
 /* ฉากหน้ารายละเอียด 3 ชนิด (เพิ่มชั้น 4: ก่อนหน้านี้ประตูไม่เห็นหน้านี้เลย) เปิดด้วย openDetail ที่มีทั้งเดโมและแอป ใช้ id จาก seed_items ชุดเดียวกัน */
 'app-detail-habit':[true,async p=>{await p.evaluate(()=>openDetail(1760100000001));await p.waitForTimeout(1200)}],
 'app-detail-task':[true,async p=>{await p.evaluate(()=>openDetail(1760100000002));await p.waitForTimeout(600)}],
 'app-detail-event':[true,async p=>{await p.evaluate(()=>openDetail(1760100000003));await p.waitForTimeout(600)}],
 /* ฉาก AI (เดโมจริง): เปิดหน้า AI ว่าง · เปิดลิ้นชัก · เปิดเมนูเพิ่มเติม — เดโมกับแอปใช้ openAI ชื่อเดียวกัน */
 'ai-empty':[true,async p=>{await p.evaluate(()=>openAI());await p.waitForTimeout(1500)}],
 'ai-drawer':[true,async p=>{await p.evaluate(()=>openAI());await p.waitForTimeout(1200);await p.click('[data-act="ai-hist"]');await p.waitForTimeout(900)}],
 'auth-welcome':[false,async p=>{}],
 'auth-login':[false,async p=>{await p.click('[data-act="au-go"][data-id="login"]')}],
 'auth-signup':[false,async p=>{await p.click('[data-act="au-go"][data-id="signup"]')}],
 'auth-forgot':[false,async p=>{await p.click('[data-act="au-go"][data-id="login"]');await p.waitForTimeout(300);await p.click('[data-act="au-go"][data-id="forgot"]')}],
};
const SET_TITLES={demo:[],app:[]};
let bad=0,total=0;
for(const cs of (process.env.PB_CS||'light,dark').split(',')) for(const [n,[lg,st]] of Object.entries(steps).filter(([k])=>!process.env.PB_ONLY||process.env.PB_ONLY.split(',').includes(k))){
  const e1=await run(DEMO,cs,'o.png',st,lg,n), e2=await run(APP,cs,'n.png',st,lg,n);
  const bands=execSync(`python3 -W ignore -c "from PIL import Image,ImageChops;a=Image.open('o.png').convert('RGB');b=Image.open('n.png').convert('RGB');d=ImageChops.difference(a,b).convert('L');w,h=d.size;px=d.load();rows=[y for y in range(h) if any(px[x,y]>8 for x in range(w))];g=[];
for y in rows:
    (g[-1].__setitem__(1,y) if g and y-g[-1][1]<=24 else g.append([y,y]))
print(g)"`).toString().trim();
  if(bands!=='[]')console.log('   ย่านต่าง(แนวตั้ง y):',bands);
  const r=execSync(`python3 -W ignore -c "from PIL import Image,ImageChops;a=Image.open('o.png').convert('RGB');b=Image.open('n.png').convert('RGB');print(a.size==b.size);d=ImageChops.difference(a,b);print(d.getbbox(), sum(1 for v in d.convert('L').getdata() if v>8))"`).toString().trim().replace(/\n/g,' ');
  total++; let pixelOk=r.endsWith(' 0')&&r.startsWith('True'); let inkTag='';
  if(!pixelOk&&r.startsWith('True')){
    /* ไล่เฉดการ์ดม่วง (.ev-card[data-tone="ink"]): ปลายไล่เฉดเดโม #6D50FF แอป #5836FF ตามคอมมิต 13b2644 (23 ต.ค. 2026) Master อนุญาต เพื่อ WCAG 1.4.3 (3.73 -> 4.70)
       ยอมเฉพาะ: พิกเซลที่ต่างอยู่ในกรอบการ์ดม่วง + แอปเข้มกว่าเดโม + ต่างไม่เกิน 45 ระดับ | นอกกรอบต้อง 0 เหมือนเดิม | ไม่มีการ์ดม่วงในฉาก = ไม่ยกเว้นอะไรเลย */
    const j=execSync(`python3 -W ignore -c "import json;from PIL import Image;import numpy as np;a=np.array(Image.open('o.png').convert('RGB')).astype(int);b=np.array(Image.open('n.png').convert('RGB')).astype(int);R=json.load(open('o.ink.json'))+json.load(open('n.ink.json'));m=np.zeros(a.shape[:2],bool)
for l,t,rr,bb in R: m[max(t,0):bb,max(l,0):rr]=True
d=np.abs(a-b).max(axis=2);bad=d>8;out=int((bad&~m).sum());ins=bad&m;lighter=int((ins&((b.sum(axis=2)-a.sum(axis=2))>0)).sum());big=int((ins&(d>45)).sum());print(out,int(ins.sum()),lighter,big,len(R))"`).toString().trim().split(' ').map(Number);
    const [outside,inside,lighter,big,nrect]=j;
    if(nrect>0&&outside===0&&lighter===0&&big===0){ pixelOk=true; inkTag=` INTENDED-INK-GRADIENT (ต่างเฉพาะในการ์ดม่วง ${inside} จุด แอปเข้มกว่า ไม่เกิน 45 ระดับ)`; }
    else if(nrect>0) inkTag=` ink-check: นอกกรอบ ${outside} | ในกรอบ ${inside} | แอปสว่างกว่า ${lighter} | ต่างเกิน45 ${big}`;
  }
  let ok=pixelOk, verdictTag=inkTag;
  if(n==='app-settings'&&!pixelOk){
    /* หน้าตั้งค่า: ต่างจากเดโมจริงได้ตามที่เจ้าของกำหนด (ลบการ์ด ข้อมูลของคุณ + จำลองสถานะ/ข้อความเดโม ใช้ของจริง) — ตรวจเชิงโครงสร้างแทน: หัวข้อแอปต้องเท่ากับเดโมเมินสองส่วนที่ตั้งใจลบเท่านั้น */
    const D=SET_TITLES.demo, A=SET_TITLES.app;
    const has=(L,t)=>L.some(l=>l.includes(t));
    const core=['ตั้งค่า','การใช้งาน AI วันนี้','ธีม','อนิเมชั่น','การแจ้งเตือน','บัญชี'];
    const reasons=[];
    for(const c of core){ if(!has(D,c))reasons.push('เดโมขาด '+c); if(!has(A,c))reasons.push('แอปขาด '+c); }
    if(!has(D,'ข้อมูลของคุณ')||!has(D,'จำลองสถานะ'))reasons.push('เทียบไม่ใช่เดโมจริง (ไม่เจอสองส่วนที่เจ้าของตัด)');
    if(has(A,'ข้อมูลของคุณ'))reasons.push('แอปยังมี ข้อมูลของคุณ');
    if(has(A,'จำลองสถานะ'))reasons.push('แอปยังมี จำลองสถานะ');
    ok=reasons.length===0;
    verdictTag=ok?' INTENDED-SETTING (หมวดหลักครบ สองส่วนที่เจ้าของลบไม่มีในแอป ตามเป้าหมาย)':' โครงสร้างผิด: '+reasons.join('; ');
    if(ok)console.log('   บรรทัดแอปในหน้าตั้งค่า:',A.length,'| เดโม:',D.length);
  }
  if(!ok)bad++;
  console.log(ok?'PASS':'FAIL',cs,n,r,verdictTag,'| errs demo',e1.length,'app',e2.length, e2.slice(0,1).join(''));
}
console.log(`\n${bad?bad+' FAILED of ':'ALL PASS '}${total}`); await b.close(); console.log('ลบผู้ใช้ทดสอบ ->',await user.cleanup()); process.exit(bad?1:0);

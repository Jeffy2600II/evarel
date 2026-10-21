// เทียบภาพ 0 พิกเซล: เดโม v12 ต้นฉบับ (design/master-demo-v12.html) กับ app-v13 | สถานะเดียวกัน (MockAuth ของเดโม)
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
/* ฝั่งแอป = ผู้ใช้จริงผ่าน API forge (สร้างครั้งเดียว ลบท้ายสุด) | ฝั่งเดโม = mock ของไฟล์ต้นฉบับเอง ไม่แตะ | ชื่อและอีเมลที่แสดงผลตั้งให้ตรงเดโม (ไม่กระทบการยืนยันตัวตน เพราะเซิร์ฟเวอร์ตรวจ JWT) */
const user=await makeTestUser('parity'); user.session.user={...user.session.user,name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; await seedItems(user.session,SEED_ITEMS);
/* ฐานเทียบ = เดโมจริงทั้งไฟล์ master-demo-v24.html ไม่ใช่ไฟล์ intended | ต่างได้เฉพาะที่ Master อนุญาต: หน้าตั้งค่าที่ลบจุดออก, ข้อความ/ส่วนที่บอกว่าเป็นเดโมหรือจำลอง | ที่เหลือทุกพิกเซลต้อง 0 */
const DEMO='file:///tmp/evarel-repo/design/master-demo-v24.html', APP=process.argv[2]||'http://localhost:8779/index.html';
async function run(url,cs,file,step,logged){
  const isApp=url===APP; let ctx=null, p;
  if(isApp){ ctx=logged?await openAsUser(b,user,{colorScheme:cs}):await openAsUser(b,{session:null},{colorScheme:cs}); p=await ctx.newPage(); }
  else{ p=await b.newPage({viewport:{width:412,height:915},colorScheme:cs,timezoneId:'Asia/Bangkok'}); }
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/,async r=>{ const u=r.request().url();
    if(/fonts\.googleapis\.com\/css/.test(u)){ const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8'); const m=css.match(/@font-face\{font-family:'Anuphan'[^\n]*\n(?:@font-face[^\n]*\n)*/); return r.fulfill({contentType:'text/css',body:(m?m[0]:'').replace(/url\(\.\.\/fonts\//g,'url(file:///tmp/evarel-repo/app/web/fonts/')}); }
    return r.abort(); });
  /* เดโมโหลด FullCalendar จาก CDN: ป้อนไฟล์เดียวกับที่แอปเก็บเองไว้ เพื่อเทียบเงื่อนไขเท่ากัน */
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  if(isApp){ await p.goto(APP_ORIGIN+'/index.html'); await p.waitForTimeout(2600); }
  else{ await p.goto(url); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear()); }
  if(logged&&!isApp){ await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},SEED_ITEMS); }
  if(!isApp){ await p.reload(); await p.waitForTimeout(2600); }
  /* เงื่อนไขทดสอบ: สีอวตารสร้างจาก hash ของ id ผู้ใช้ (v24: id||email||name) เดโมใช้ id 'u_test' แต่ผู้ใช้ทดสอบของแอปมี UUID จริงจาก Supabase
     จึงได้ hue คนละเบอร์ทั้งที่อัลกอริทึมตรงกัน ตั้ง id ฝั่งแอปให้เท่าเดโมเฉพาะในหน้านี้ (ไม่แตะ session/ข้อมูล) แล้ววาดใหม่ก่อนถ่ายภาพ */
  if(isApp&&logged){ await p.evaluate(()=>{ if(window.ST?.USER){ window.ST.USER.id='u_test'; window.render?.(); } }); await p.waitForTimeout(400); }

  await step(p); await p.waitForTimeout(500);
  /* เงื่อนไขทดสอบ: การ์ดโควตาในตั้งค่า เดโมใช้ข้อมูลตัวอย่าง (UsageView ชนิดเดียวกับ GET /api/ai/quota: calls 6/40 tokens 7200/60000, รีเซ็ตเที่ยงคืนกรุงเทพถัดไปตามนาฬิกาที่ล็อก)
     แอปได้ค่าจริงของผู้ใช้ทดสอบ (0/40) จึงตั้ง ST.QUOTA ให้เท่าตัวอย่างเดโมเฉพาะฉากตั้งค่า แล้วหยุดไม่ให้ดึงทับ */
  if(isApp&&logged){ await p.evaluate(()=>{ const n=new Date(Date.now()+7*3600000); n.setUTCHours(0,0,0,0); const resetAt=new Date(+n+86400000-7*3600000).toISOString();
      window.ST.QUOTA={resetAt,blocked:false,calls:{used:6,limit:40,remaining:34},tokens:{used:7200,limit:60000,remaining:52800}}; const e=document.getElementById('usageWrap'); if(e){ e.innerHTML=window.usageCardHTML(); window.growBars?.(e); } }); await p.waitForTimeout(300); } if(process.env.PB_CARDS){ const dir='/app/.agents/.state/work/evarel-demo-exact/cards/'+(isApp?'app':'demo'); fs.mkdirSync(dir,{recursive:true}); const hs=await p.$$eval('.ev-card',els=>els.map(e=>((e.querySelector('b')||{}).textContent||'').trim())); const els=await p.$$('.ev-card'); for(let i=0;i<els.length;i++){ const key=(hs[i].replace(/[^0-9A-Za-zก-๙]/g,'_').slice(0,30)||('card'+i)); await els[i].screenshot({path:dir+'/'+key+'.png'}); } fs.writeFileSync(dir+'/_order.json',JSON.stringify(hs)); fs.writeFileSync(dir+'/_style.json',JSON.stringify(await p.$$eval('.ev-card',els=>els.map(e=>{ const out=[]; const P=['color','backgroundColor','fontSize','fontWeight','fontFamily','lineHeight','letterSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','borderTopLeftRadius','borderTopWidth','boxShadow','display','gap','width','height','opacity']; for(const n of [e,...e.querySelectorAll('*')]){ const c=getComputedStyle(n); out.push((n.tagName+'.'+(n.className&&n.className.baseVal===undefined?n.className:'')).slice(0,40)+'|'+P.map(k=>c[k]).join('|')); } return {h:(e.querySelector('b')||{}).textContent||'',s:out}; })))); fs.writeFileSync(dir+'/_text.json',JSON.stringify(await p.$$eval('.ev-card',els=>els.map(e=>({t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,260),h:Math.round(e.getBoundingClientRect().height),y:Math.round(e.getBoundingClientRect().top)}))))); } await p.screenshot({path:file}); await p.close(); if(ctx) await ctx.close(); return errs;
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
 'auth-welcome':[false,async p=>{}],
 'auth-login':[false,async p=>{await p.click('[data-act="au-go"][data-id="login"]')}],
 'auth-signup':[false,async p=>{await p.click('[data-act="au-go"][data-id="signup"]')}],
 'auth-forgot':[false,async p=>{await p.click('[data-act="au-go"][data-id="login"]');await p.waitForTimeout(300);await p.click('[data-act="au-go"][data-id="forgot"]')}],
};
let bad=0,total=0;
for(const cs of (process.env.PB_CS||'light,dark').split(',')) for(const [n,[lg,st]] of Object.entries(steps).filter(([k])=>!process.env.PB_ONLY||process.env.PB_ONLY.split(',').includes(k))){
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

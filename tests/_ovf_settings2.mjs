import { chromium, devices } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/', exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const ctx=await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'});
const p=await ctx.newPage(); await p.route(/fonts\./,r=>r.abort()); await p.goto('http://localhost:8779/index.html'); await p.waitForTimeout(1200);
await p.click('[data-act="au-go"][data-id="signup"]'); await p.waitForTimeout(300);
await p.fill('#f-name','Nontakorn Nonsurat (Jeffy)'); await p.fill('#f-email','n'+Date.now()+'@gmail.com'); await p.fill('#f-password','Passw0rd!x1'); await p.check('input[name="terms"]'); await p.tap('button[type="submit"]'); await p.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:15000}).catch(()=>console.log('AUTH NOT IN:',document.body?.innerText?.slice(0,80))); await p.waitForTimeout(1500); await p.tap('[data-act="add"]'); await p.waitForTimeout(700); await p.tap('#sheet [data-act="dtype"][data-id="task"]').catch(()=>{}); await p.waitForTimeout(400); await (await p.$('#sheet input[name="title"], #sheet input[type="text"], #sheet input')).fill('x'); await (await p.$('#sheet .ev-btn-primary')).tap(); await p.waitForSelector('.ev-week',{timeout:15000,state:'attached'}).catch(()=>console.log('NO WEEK')); await p.waitForTimeout(1200);
const m=()=>p.evaluate(()=>({inner:innerWidth,client:document.documentElement.clientWidth,scrollW:document.documentElement.scrollWidth,vv:Math.round(visualViewport.width),scale:visualViewport.scale}));

const probe=()=>p.evaluate(()=>{const W=document.documentElement.clientWidth,out=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0&&(r.right>W+1||r.left<-1))out.push(String(e.className).split(' ')[0]+'<'+e.tagName+'> L'+Math.round(r.left)+' R'+Math.round(r.right))});return {W,scrollW:document.documentElement.scrollWidth,vv:Math.round(visualViewport.width),scale:visualViewport.scale,out:out.slice(0,8)}});

const mx=()=>p.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth));
// ติดตามความกว้างตลอดการเปิดเลเยอร์ (แอนิเมชัน translateY+scale) และหลังสลับธีม/ปัดสัปดาห์ก่อน
await p.evaluate(()=>{window.__m=[];const t0=performance.now();const f=()=>{window.__m.push(Math.max(document.documentElement.scrollWidth,document.body.scrollWidth));if(performance.now()-t0<1500)requestAnimationFrame(f)};requestAnimationFrame(f)});
await p.tap('.ev-app [data-act="settings"]'); await p.waitForTimeout(1700);
console.log('เปิดตั้งค่า: scrollWidth สูงสุด =',Math.max(...await p.evaluate(()=>window.__m)),'(จอ 412)');
// ลองเปลี่ยนธีมแล้วปิด-เปิดซ้ำ + ปัดสัปดาห์ก่อนเปิด
await p.tap('[data-act="close"]').catch(()=>{}); await p.waitForTimeout(700);
await p.evaluate(()=>{const w=document.querySelector('.ev-week'),r=w.getBoundingClientRect(),mk=x=>new Touch({identifier:1,target:w,clientX:x,clientY:r.top+10});w.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[mk(r.right-20)],changedTouches:[mk(r.right-20)]}));document.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[mk(r.left+20)]}))});
await p.waitForTimeout(500); await p.tap('.ev-app [data-act="settings"]'); await p.waitForTimeout(1200);
console.log('เปิดตั้งค่าหลังปัดสัปดาห์:',await mx());
await p.screenshot({path:'/app/conversations/6ac77d8632a1ea4bea84b135/settings-mobile.png'}); await b.close();

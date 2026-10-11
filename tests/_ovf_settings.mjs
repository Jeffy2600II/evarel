import { chromium, devices } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/', exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const ctx=await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'});
const p=await ctx.newPage(); await p.route(/fonts\./,r=>r.abort()); await p.goto('http://localhost:8779/index.html'); await p.waitForTimeout(1200);
await p.click('[data-act="au-go"][data-id="signup"]'); await p.waitForTimeout(300);
await p.fill('#f-name','Nontakorn Nonsurat (Jeffy)'); await p.fill('#f-email','n'+Date.now()+'@gmail.com'); await p.fill('#f-password','Passw0rd!x1'); await p.check('input[name="terms"]'); await p.tap('button[type="submit"]'); await p.waitForFunction(()=>document.body.dataset.auth==='in',null,{timeout:15000}).catch(()=>console.log('AUTH NOT IN:',document.body?.innerText?.slice(0,80))); await p.waitForTimeout(1500); await p.tap('[data-act="add"]'); await p.waitForTimeout(700); await p.tap('#sheet [data-act="dtype"][data-id="task"]').catch(()=>{}); await p.waitForTimeout(400); await (await p.$('#sheet input[name="title"], #sheet input[type="text"], #sheet input')).fill('x'); await (await p.$('#sheet .ev-btn-primary')).tap(); await p.waitForSelector('.ev-week',{timeout:15000,state:'attached'}).catch(()=>console.log('NO WEEK')); await p.waitForTimeout(1200);
const m=()=>p.evaluate(()=>({inner:innerWidth,client:document.documentElement.clientWidth,scrollW:document.documentElement.scrollWidth,vv:Math.round(visualViewport.width),scale:visualViewport.scale}));

const probe=()=>p.evaluate(()=>{const W=document.documentElement.clientWidth,out=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width>0&&(r.right>W+1||r.left<-1))out.push(String(e.className).split(' ')[0]+'<'+e.tagName+'> L'+Math.round(r.left)+' R'+Math.round(r.right))});return {W,scrollW:document.documentElement.scrollWidth,vv:Math.round(visualViewport.width),scale:visualViewport.scale,out:out.slice(0,8)}});
await p.tap('.ev-app [data-act="settings"]'); await p.waitForTimeout(1500);
console.log('settings',JSON.stringify(await probe()));
const pg=await p.evaluate(()=>{const e=document.querySelector('.ev-page');return e?{w:Math.round(e.getBoundingClientRect().width),sw:e.scrollWidth,kids:[...e.querySelectorAll('.ev-page-scroll > *')].map(k=>k.className.split(' ')[0]+':'+Math.round(k.getBoundingClientRect().width)+'/'+k.scrollWidth).slice(0,9)}:null});
console.log('page',JSON.stringify(pg));
await b.close();

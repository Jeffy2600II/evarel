import { chromium } from 'playwright';
import fs from 'fs';
const U=process.argv[2]||'http://localhost:8776/index.html';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const _nc=b.newContext.bind(b);b.newContext=async(o)=>{const c=await _nc(o);await c.addInitScript(()=>{if(!localStorage.getItem('evarel-demo-session')){localStorage.setItem('evarel-demo-users',JSON.stringify([{id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}]));localStorage.setItem('evarel-demo-session','u_test')}});return c};
const ctx=await b.newContext({viewport:{width:412,height:915},serviceWorkers:'allow'});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.route(/cdn\.jsdelivr/,r=>r.abort()); // พิสูจน์ว่าไม่พึ่ง CDN อีกต่อไป
await p.goto(U);await p.waitForTimeout(3500);
console.log('SW:',JSON.stringify(await p.evaluate(async()=>({keys:await caches.keys(),n:(await (await caches.open((await caches.keys())[0])).keys()).length,fc:typeof FullCalendar}))));
await p.reload();await p.waitForTimeout(1800);
await ctx.setOffline(true);await p.reload();await p.waitForTimeout(2200);
await p.click('[data-tab="calendar"]');await p.waitForTimeout(1500);
console.log('OFFLINE calendar: FullCalendar',await p.evaluate(()=>typeof FullCalendar),'| day cells',await p.evaluate(()=>document.querySelectorAll('.fc-daygrid-day').length),'| error state shown',await p.evaluate(()=>!!document.querySelector('[data-act="retry"]')));
console.log('errors',errs.length,errs.slice(0,2));
await b.close();

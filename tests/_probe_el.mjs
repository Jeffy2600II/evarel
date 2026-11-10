import { chromium } from 'playwright'; import fs from 'fs';
import { SEED_ITEMS } from './seed_items.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:412,height:915},deviceScaleFactor:2});
await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
  const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
await p.goto(process.argv[2]); await p.waitForTimeout(800);
await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},SEED_ITEMS);
await p.reload(); await p.waitForTimeout(2600);
if(process.argv[5]==='stats'){await p.click('[data-tab="stats"]');await p.waitForTimeout(700)}
const out=await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);let t=[];let n=e;for(let i=0;i<6&&n;i++){t.push(n.tagName+'.'+(n.className&&n.className.baseVal!==undefined?n.className.baseVal:n.className||''));n=n.parentElement}
  const r=e.getBoundingClientRect();return {chain:t,txt:(e.textContent||'').slice(0,30),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}},[+process.argv[3],+process.argv[4]]);
console.log(JSON.stringify(out));
await b.close();

import { chromium } from 'playwright'; import fs from 'fs';
import { SEED_ITEMS } from './seed_items.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:412,height:915},colorScheme:'light',timezoneId:'Asia/Bangkok'});
await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
await p.route(/fonts\.(googleapis|gstatic)/, async r=>{ const u=r.request().url();
  if(/fonts\.googleapis\.com\/css/.test(u)){ const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8'); const m=css.match(/@font-face\{font-family:'Anuphan'[^\n]*\n(?:@font-face[^\n]*\n)*/); return r.fulfill({contentType:'text/css',body:(m?m[0]:'').replace(/url\(\.\.\/fonts\//g,'url(file:///tmp/evarel-repo/app/web/fonts/')}); }
  return r.abort(); });
await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
  const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
await p.goto('file:///tmp/evarel-repo/design/master-demo-v24.html'); await p.waitForTimeout(800);
await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},SEED_ITEMS);
await p.reload(); await p.waitForTimeout(2600);
await p.click('[data-tab="stats"]'); await p.waitForTimeout(500);
await p.screenshot({path:'/tmp/d1.png'}); await p.waitForTimeout(900);
await p.screenshot({path:'/tmp/d2.png'});
await b.close();

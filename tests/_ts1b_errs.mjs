import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
for (const [name,url] of [['app-ts (ลำดับถูก)','http://localhost:8791/index.html'],['สลับ settings<constants','http://localhost:8793/index.html']]) {
  const p=await b.newPage({viewport:{width:412,height:915},timezoneId:'Asia/Bangkok'}); const errs=[]; const cons=[];
  p.on('pageerror',e=>errs.push(e.message.slice(0,90))); p.on('console',m=>{if(m.type()==='warning'||m.type()==='error')cons.push(m.text().slice(0,90))});
  await p.goto(url); await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear());
  await p.evaluate(()=>{const u={id:'u_test',name:'N',email:'a@b.c',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test')});
  await p.reload(); await p.waitForTimeout(2500);
  const ok=await p.evaluate(()=>!!document.querySelector('[data-tab="all"]'));
  console.log(name.padEnd(26),'| pageerror',errs.length,JSON.stringify(errs.slice(0,2)),'| console warn/err',cons.length,JSON.stringify(cons.slice(0,2)),'| แท็บขึ้น',ok);
  await p.close();
}
await b.close();

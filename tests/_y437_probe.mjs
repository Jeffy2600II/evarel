import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
async function probe(url){
  const p=await b.newPage({viewport:{width:412,height:915},timezoneId:'Asia/Bangkok'});
  await p.goto(url); await p.waitForTimeout(800);
  if(url.startsWith('file')){ await p.evaluate(()=>{const u={id:'u_test',name:'N',email:'d@g.com',provider:'google'};localStorage.setItem('evarel-demo-users',JSON.stringify([u]));localStorage.setItem('evarel-demo-session','u_test');localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items:[]}))}); await p.reload(); }
  await p.waitForTimeout(2500);
  await p.click('[data-act="add"]'); await p.waitForTimeout(400);
  await p.click('[data-act="dtype"][data-id="event"]'); await p.waitForSelector('#addForm'); await p.waitForTimeout(450);
  const info=await p.evaluate(()=>{const ti=document.querySelector('.ev-title-input');const cs=ti?getComputedStyle(ti):null;
  return {border:cs?cs.borderBottomColor:null,active:document.activeElement?.className+'|'+document.activeElement?.id,at2:document.elementFromPoint(200,437)?.className};
  const el=document.elementFromPoint(200,437);const rows=[...document.querySelectorAll('#addForm .ev-set-row,#addForm .ev-stepper,#addForm .ev-cap')].map(r=>{const b=r.getBoundingClientRect();return [Math.round(b.y),Math.round(b.height),(r.textContent||'').replace(/\s+/g,' ').slice(0,30),getComputedStyle(r).background]});return {at:el?el.className+'|'+(el.textContent||'').slice(0,30):null,rows}});
  console.log(JSON.stringify(info));
  await p.close();
}
await probe('file:///tmp/evarel-repo/design/master-demo-v24.html');
await probe('http://localhost:8776/index.html');
await b.close();

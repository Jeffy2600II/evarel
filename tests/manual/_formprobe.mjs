import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe}),p=await (await b.newContext({viewport:{width:412,height:915}})).newPage();await p.route(/fonts\./,r=>r.abort());
await p.goto('http://localhost:8779/index.html');await p.waitForTimeout(1200);await p.click('[data-act="au-go"][data-id="signup"]');await p.waitForTimeout(300);
await p.fill('#f-name','ทดสอบ');await p.fill('#f-email','f'+Date.now()+'@example.com');await p.fill('#f-password','Passw0rd!x1');await p.check('input[name="terms"]');await p.click('button[type="submit"]');
await p.waitForFunction(()=>document.body.dataset.auth==='in');await p.waitForTimeout(1800);
await p.click('[data-act="add"]');await p.waitForTimeout(700);
console.log(JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#sheet button')].filter(e=>e.offsetParent).map(e=>(e.dataset.act||'')+':'+(e.dataset.id||'')+':'+e.textContent.trim().slice(0,12)))));
await b.close();

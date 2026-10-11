import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
for(const cs of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:412,height:915},colorScheme:cs}), p=await ctx.newPage(); await p.route(/fonts\./,r=>r.abort());
 await ctx.addInitScript(()=>{window.EVAREL_API='https://evarel-api-b-test.nontakorn2600.workers.dev'});
 await p.goto('http://localhost:8779/index.html'); await p.waitForTimeout(1500);
 await p.click('[data-act="au-go"][data-id="login"]'); await p.waitForTimeout(300); await p.click('[data-act="au-go"][data-id="forgot"]'); await p.waitForTimeout(300);
 await p.fill('#f-email','nobody-shot@example.com'); await p.click('button[type="submit"]'); await p.waitForTimeout(2800);
 await p.fill('#f-code','123456'); await p.click('button[type="submit"]'); await p.waitForTimeout(2500);
 console.log(cs,'error text:',await p.evaluate(()=>document.querySelector('#e-code')?.innerText||'(ไม่มี)'));
 await p.screenshot({path:`/tmp/shot-code-${cs}.png`});
 await ctx.close();
}
await b.close();

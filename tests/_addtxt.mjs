import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});const out={};
for(const [n,u] of [['demo','file:///tmp/evarel-repo/design/master-demo-v12.html'],['app','http://localhost:8779/index.html']]){
 const p=await (await b.newContext({viewport:{width:412,height:915},colorScheme:'dark'})).newPage();await p.route(/fonts\./,r=>r.abort());await p.goto(u);await p.waitForTimeout(1200);
 if(n==='app'){await p.click('[data-act="au-go"][data-id="signup"]');await p.waitForTimeout(300);await p.fill('#f-name','ทดสอบ');await p.fill('#f-email','a'+Date.now()+'@example.com');await p.fill('#f-password','Passw0rd!x1');await p.check('input[name="terms"]');await p.click('button[type="submit"]');await p.waitForFunction(()=>document.body.dataset.auth==='in');await p.waitForTimeout(1800)}
 else {await p.click('[data-act="google"],[data-act="au-google"]').catch(()=>{});await p.waitForTimeout(1800)}
 await p.click('[data-act="add"]');await p.waitForTimeout(800);
 out[n]=await p.evaluate(()=>({sheet:document.querySelector('#sheet')?.innerText.replace(/\s+/g,' ').slice(0,200),today:document.querySelector('.ev-app')?.innerText.replace(/\s+/g,' ').slice(0,160)}));
}
const eq=(x,y)=>x===y;console.log('sheet เหมือนกัน:',eq(out.demo.sheet,out.app.sheet),'| page เหมือนกัน:',eq(out.demo.today,out.app.today));let i=0;const a=out.demo.today||'',c=out.app.today||'';while(i<a.length&&a[i]===c[i])i++;console.log('page ต่างตั้งแต่ตัวอักษรที่',i,'จาก',a.length,'/',c.length,'| demo=',JSON.stringify(a.slice(i,i+30)).replace(/[^\x00-\x7f]/g,'~'),'app=',JSON.stringify(c.slice(i,i+30)).replace(/[^\x00-\x7f]/g,'~'));
await b.close();

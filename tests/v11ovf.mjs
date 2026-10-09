import { chromium } from 'playwright';
import fs from 'fs';
const U=process.argv[2]||'http://localhost:8776/index.html';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
let bad=0;
for(const w of [360,390,412,457]) for(const cs of ['light','dark']){
  const p=await b.newPage({viewport:{width:w,height:915},colorScheme:cs});await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U);await p.waitForTimeout(1800);const issues=[];
  for(const t of ['today','all','calendar','stats']){await p.click(`[data-tab="${t}"]`);await p.waitForTimeout(900);
    const o=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth}));if(o.sw>o.vw)issues.push(t+':'+o.sw);}
  await p.click('[data-tab="calendar"]');await p.waitForTimeout(500);await p.click('[data-act="cal-view"][data-id="timeGridWeek"]');await p.waitForTimeout(900);
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))issues.push('week-view');
  await p.click('[data-act="add"]');await p.waitForTimeout(700);if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))issues.push('form');
  const flag=issues.length||errs.length;if(flag)bad++;console.log(`${w} ${cs}:`,issues.length?issues.join(','):'no overflow','errs',errs.length);await p.close();
}
console.log('combos with problems:',bad);await b.close();

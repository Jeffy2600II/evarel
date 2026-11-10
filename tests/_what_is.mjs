import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const url=process.argv[2];
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:412,height:915},deviceScaleFactor:2});
await p.goto(url); await p.waitForTimeout(2500);
const info=await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);let t=[];let n=e;for(let i=0;i<5&&n;i++){t.push(n.tagName+'.'+(n.className&&n.className.baseVal!==undefined?n.className.baseVal:n.className||'')+' id='+(n.id||''));n=n.parentElement}
return {chain:t,txt:(e.textContent||'').slice(0,40)}},[+process.argv[3],+process.argv[4]]);
console.log(JSON.stringify(info,null,1));
await b.close();

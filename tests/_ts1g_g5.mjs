import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
async function probe(url, api){
  const p=await b.newPage({viewport:{width:412,height:915}});
  if(api) await p.addInitScript(a=>{window.EVAREL_API=a},api);
  /* กันยิงออกเน็ตจริง: ตัดทุกคำขอไป API ปลอม */
  await p.route(/evarel-g5-fake\.invalid/,r=>r.abort());
  await p.goto(url); await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>({SUPA_API:typeof SUPA_API!=='undefined'?SUPA_API:'(ไม่มี)', auth:Auth===MockAuth?'MockAuth':'SupaAuth', repo:Repo===LocalAdapter?'LocalAdapter':'SupaAdapter'}));
  await p.close(); return r;
}
for (const [n,u] of [['app-ts4','http://localhost:8798/index.html']]) {
  const a=await probe(u,null), c=await probe(u,'https://evarel-g5-fake.invalid');
  console.log(n.padEnd(8),'| ไม่ฉีด:',JSON.stringify(a),'| ฉีด:',JSON.stringify(c));
}
await b.close();

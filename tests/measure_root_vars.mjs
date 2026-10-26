// วัดค่าที่ "ชนะจริง" ของทุกตัวแปร CSS (--*) บน :root ในสองโหมด จากเบราว์เซอร์จริง (F1.3) ไม่เดาจากลำดับบรรทัดในไฟล์ CSS
// ใช้: node tests/measure_root_vars.mjs > out.json   (ชั้นซ้อนทับหลายรอบใน app.css/design.css ทำให้อ่านจากไฟล์ตรงๆ ไม่ได้)
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--disable-gpu']});
const user=await makeTestUser('measure'); const out={};
for(const cs of ['light','dark']){
  const ctx=await openAsUser(b,user,{colorScheme:cs}); const p=await ctx.newPage();
  await p.goto(APP_ORIGIN+'/index.html'); await p.waitForTimeout(2600);
  /* ชื่อตัวแปรมาจากกฎ :root ในชีตจริงที่โหลดอยู่ แล้วขอค่าสุดท้ายด้วย getPropertyValue */
  out[cs]=await p.evaluate(()=>{ const names=new Set(); for(const sh of document.styleSheets){ let rules; try{rules=sh.cssRules}catch(e){continue}
      const walk=rs=>{ for(const r of rs){ if(r.style){ for(const n of r.style) if(n.startsWith('--')) names.add(n); } if(r.cssRules) walk(r.cssRules); } }; walk(rules); }
    const cs=getComputedStyle(document.documentElement), res={}; for(const n of [...names].sort()) res[n]=cs.getPropertyValue(n).trim(); return {theme:document.documentElement.getAttribute('data-theme'),vars:res}; });
  await ctx.close();
}
await b.close(); console.log(JSON.stringify(out,null,1));

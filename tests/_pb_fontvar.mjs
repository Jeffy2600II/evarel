import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
const DEMO='file:///tmp/evarel-repo/design/master-demo-v24.html';
async function variant(name,{freeze=false,reload=false,wait=2600}={}){
  const p=await b.newPage({viewport:{width:412,height:915}});
  if(freeze) await p.addInitScript(()=>{const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F; const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st));});
  await p.route(/fonts\.(googleapis|gstatic)/,async r=>{const u=r.request().url();
    if(/fonts\.googleapis\.com\/css/.test(u)){ const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8')+'\n'+fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8'); const blocks=(css.match(/@font-face\s*\{[^}]*\}/g)||[]).filter(x=>/font-family:\s*['"]?(Anuphan|Noto Sans Thai)['"]?/.test(x)); return r.fulfill({contentType:'text/css',body:blocks.join('\n').replace(/url\(\s*['"]?\.\.\/fonts\//g,'url(http://localhost:8779/fonts/')}); }
    return r.abort(); });
  await p.goto(DEMO); await p.waitForTimeout(800);
  if(reload){ await p.evaluate(()=>localStorage.clear()); await p.reload(); }
  await p.waitForTimeout(wait);
  const info=await p.evaluate(async()=>{ await document.fonts.ready; return {n:document.fonts.size, anu:[...document.fonts].filter(f=>f.family==='Anuphan').length, th:document.fonts.check('12px Anuphan','ทดสอบ')};});
  console.log(name, JSON.stringify(info));
  await p.close();
}
await variant('A พื้นฐาน',{});
await variant('B +freeze',{freeze:true});
await variant('C +reload',{reload:true});
await variant('D +freeze+reload',{freeze:true,reload:true});
await b.close();

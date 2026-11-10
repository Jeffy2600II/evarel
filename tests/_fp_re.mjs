import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
async function probe(name,url,routes){
  const p=await b.newPage({viewport:{width:412,height:915}});
  for(const r of routes) await p.route(...r);
  await p.goto(url); await p.waitForTimeout(2500);
  const info=await p.evaluate(async()=>{ await document.fonts.ready; return {anuphan:document.fonts.check('12px Anuphan'),noto:document.fonts.check('12px "Noto Sans Thai"'),loaded:[...document.fonts].map(f=>f.family+' '+f.status).slice(0,8)};});
  console.log(name, JSON.stringify(info));
  await p.close();
}
const mkRoute=()=>[['/fonts\\.(googleapis|gstatic)/',async r=>{const u=r.request().url();
  if(/fonts\.googleapis\.com\/css/.test(u)){ const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8')+'\n'+fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8'); const blocks=(css.match(/@font-face\s*\{[^}]*\}/g)||[]).filter(x=>/font-family:\s*['"]?(Anuphan|Noto Sans Thai)['"]?/.test(x)); return r.fulfill({contentType:'text/css',body:blocks.join('\n').replace(/url\(\s*['"]?\.\.\/fonts\//g,'url(file:///tmp/evarel-repo/app/web/fonts/')}); }
  return r.abort();}]];
await probe('DEMO','file:///tmp/evarel-repo/design/master-demo-v24.html',mkRoute());
await probe('APP','http://localhost:8779/index.html',[['/fonts\\.(googleapis|gstatic)/',r=>r.abort()]]);
await b.close();

import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:412,height:915}});
await p.route(/fonts\.(googleapis|gstatic)/,async r=>{const u=r.request().url();
  if(/fonts\.googleapis\.com\/css/.test(u)){ const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8')+'\n'+fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8'); const blocks=(css.match(/@font-face\s*\{[^}]*\}/g)||[]).filter(x=>/font-family:\s*['"]?(Anuphan|Noto Sans Thai)['"]?/.test(x)); const body=blocks.join('\n').replace(/url\(\s*['"]?\.\.\/fonts\//g,'url(http://localhost:8779/fonts/'); console.log('FULFILL blocks=',blocks.length,'len=',body.length); return r.fulfill({contentType:'text/css',body}); }
  console.log('ABORT',u.slice(0,60)); return r.abort(); });
await p.goto('file:///tmp/evarel-repo/design/master-demo-v24.html');
await p.waitForTimeout(1500);
const out=await p.evaluate(async()=>{
  const sheets=[...document.styleSheets].map(s=>s.href||'inline').filter(h=>h.includes('googleapis'));
  let fbody='(no-fetch)';
  try{ const resp=await fetch('https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&display=swap'); fbody=(await resp.text()).slice(0,150);}catch(e){ fbody='ERR:'+e.message.slice(0,80); }
  return JSON.stringify({googleSheets:sheets.length,fontsN:document.fonts.size,anu:[...document.fonts].filter(f=>f.family==='Anuphan').length,fbody});});
console.log('PAGE',out);
await b.close();

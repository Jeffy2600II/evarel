import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8')+'\n'+fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8');
const blocks=(css.match(/@font-face\s*\{[^}]*\}/g)||[]).filter(x=>/font-family:\s*['"]?(Anuphan|Noto Sans Thai)['"]?/.test(x));
const body=blocks.join('\n').replace(/url\(\s*['"]?\.\.\/fonts\//g,'url(http://localhost:8779/fonts/');
console.log('body bytes:',body.length);
const mkRoute=(acao)=>async r=>{const u=r.request().url();
  if(/fonts\.googleapis\.com\/css/.test(u)){ const h={'Content-Type':'text/css'}; if(acao) h['Access-Control-Allow-Origin']='*'; return r.fulfill({headers:h,body}); }
  return r.abort();};
async function grid(name,{route,acao,inject}){
  const p=await b.newPage({viewport:{width:412,height:915}});
  if(route) await p.route(/fonts\.(googleapis|gstatic)/,mkRoute(acao));
  await p.goto('file:///tmp/evarel-repo/design/master-demo-v24.html'); await p.waitForTimeout(1200);
  if(inject) await p.addStyleTag({content:body});
  await p.waitForTimeout(800);
  const r=await p.evaluate(async()=>{await document.fonts.ready;const anu=[...document.fonts].filter(f=>f.family==='Anuphan');return document.fonts.size+' แฟซ Anuphan='+anu.length+' โหลดแล้ว='+anu.filter(f=>f.status==='loaded').length;});
  console.log(name,r);
  await p.close();
}
await grid('1 route ธรรมดา (ไม่ฉีด)',{route:true});
await grid('2 route + ACAO (ไม่ฉีด)',{route:true,acao:true});
await grid('3 route ธรรมดา + ฉีด',{route:true,inject:true});
await grid('4 ไม่มี route (Google จริง)',{});
await b.close();

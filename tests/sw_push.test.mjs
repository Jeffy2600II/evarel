/* ตรวจ service worker จริงใน build จริง: รับ push แล้วส่งข้อความอะไรให้ระบบแจ้งเตือน (รวมข้อความ "เลยเวลามา X" เมื่อมาช้า)
   seam = push event เข้า SW -> showNotification ออก | ดักที่ showNotification ภายใน SW เพราะ headless shell ปฏิเสธสิทธิ์แจ้งเตือนจึงเห็นแถบจริงไม่ได้
   ข้อจำกัด: ยืนยันข้อความที่ส่งให้ระบบ ไม่ใช่สิ่งที่ Android วาดบนหน้าจอ (ต้องดูบนมือถือจริง) | ใช้เซิร์ฟเวอร์ HTTPS จริงเหมือน sw_upgrade.test.mjs
   ต้อง build ก่อน: npm run build:web:forge  ต้องมี openssl */
import { chromium } from 'playwright'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import https from 'node:https'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-push-'));
execFileSync('openssl', ['req','-x509','-newkey','rsa:2048','-nodes','-keyout',tmp+'/k.pem','-out',tmp+'/c.pem','-days','1','-subj','/CN=evarel-app-forge.nontakorn2600.workers.dev','-addext','subjectAltName=DNS:evarel-app-forge.nontakorn2600.workers.dev'],{stdio:'ignore'});
const TLS=tmp; const HOST='evarel-app-forge.nontakorn2600.workers.dev'; const NEW=process.env.SW_NEW_DIR||path.join(root,'build/web');
const mime={html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml',ico:'image/x-icon',txt:'text/plain'};
const srv=https.createServer({key:fs.readFileSync(TLS+'/k.pem'),cert:fs.readFileSync(TLS+'/c.pem')},(q,r)=>{let p=decodeURIComponent(new URL(q.url,'https://x').pathname); if(p.endsWith('/'))p+='index.html'; const f=NEW+p;
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('nf')} r.writeHead(200,{'content-type':mime[f.split('.').pop()]||'application/octet-stream','cache-control':'no-store'}); r.end(fs.readFileSync(f))});
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const PORT=srv.address().port;
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/'; const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:[`--host-resolver-rules=MAP ${HOST} 127.0.0.1:${PORT}`,'--ignore-certificate-errors']});
try{
  const ctx=await b.newContext({ignoreHTTPSErrors:true,serviceWorkers:'allow'});
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|evarel-api/,r=>r.abort());
  const p=await ctx.newPage(); await p.goto(`https://${HOST}/index.html`); await p.waitForTimeout(4500);
  // หา worker ของ SW ผ่าน Playwright (context.serviceWorkers) แล้วครอบ showNotification ในบริบทของ worker เอง
  let sw=ctx.serviceWorkers().find(w=>w.url().includes('/sw.js')); if(!sw) sw=await ctx.waitForEvent('serviceworker',{timeout:5000}).catch(()=>null);
  if(!sw) throw new Error('ไม่พบ worker ของ SW'); console.log('พบ worker:',sw.url().split('/').pop());
  await sw.evaluate(()=>{ self.__shown=[]; const orig=self.registration.showNotification.bind(self.registration);
    self.registration.showNotification=(title,opts)=>{ self.__shown.push({title,body:opts&&opts.body,tag:opts&&opts.tag}); return Promise.resolve(); }; });
  const cdp=await ctx.newCDPSession(p); const regs=[]; cdp.on('ServiceWorker.workerRegistrationUpdated',e=>regs.push(...(e.registrations||[])));
  await cdp.send('ServiceWorker.enable'); await p.waitForTimeout(800); const reg=regs.find(r=>r.scopeURL.includes(HOST)); if(!reg) throw new Error('ไม่พบ registration');
  const bkk=(ms)=>Math.floor((ms+7*3600e3)/60000);
  const cases=[['ตรงเวลา',{title:'Evarel',body:'วิ่งเช้า',tag:'a',atAbs:bkk(Date.now())},'วิ่งเช้า'],
    ['ช้า 3 นาที (ในหน้าต่างปกติ)',{title:'Evarel',body:'วิ่งเช้า',tag:'e',atAbs:bkk(Date.now()-3*60000)},'วิ่งเช้า'],
    ['ช้า 45 นาที',{title:'Evarel',body:'วิ่งเช้า',tag:'b',atAbs:bkk(Date.now()-45*60000)},'วิ่งเช้า (เลยเวลามา 45 นาที)'],
    ['ช้า 2 ชม.',{title:'Evarel',body:'ประชุมทีม',tag:'c',atAbs:bkk(Date.now()-120*60000)},'ประชุมทีม (เลยเวลามา 2 ชม.)'],
    ['ช้า 3 ชม. 20 นาที',{title:'Evarel',body:'นอน',tag:'f',atAbs:bkk(Date.now()-200*60000)},'นอน (เลยเวลามา 3 ชม. 20 นาที)'],
    ['push รุ่นเก่า ไม่มี atAbs',{title:'Evarel',body:'วิ่งเช้า',tag:'d'},'วิ่งเช้า']];
  let ok=0;
  for (const [name,payload,want] of cases){
    await sw.evaluate(()=>{self.__shown.length=0});
    await cdp.send('ServiceWorker.deliverPushMessage',{origin:`https://${HOST}`,registrationId:reg.registrationId,data:JSON.stringify(payload)});
    await p.waitForTimeout(600);
    const shown=await sw.evaluate(()=>self.__shown.map(x=>x.body));
    const pass=shown.length===1&&shown[0]===want; if(pass)ok++;
    console.log((pass?'PASS ':'FAIL ')+name.padEnd(30),JSON.stringify(shown),pass?'':'คาด '+JSON.stringify(want));
  }
  console.log(`\nผ่าน ${ok}/${cases.length}`); process.exitCode=ok===cases.length?0:1;
}catch(e){console.log('FAIL',String(e.message).slice(0,240)); process.exitCode=1}finally{await b.close();srv.close();fs.rmSync(tmp,{recursive:true,force:true})}

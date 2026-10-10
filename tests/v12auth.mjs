// ทดสอบ v12: ล็อกอิน + นำเข้า localStorage + ไม่ทำข้อมูลเดิมหาย | ใช้ Worker จริง + Supabase จริง + ผู้ใช้ทดสอบชั่วคราว
import { chromium } from 'playwright';
import fs from 'fs';
const U=process.argv[2]||'http://localhost:8777/index.html', EMAIL=process.env.T_EMAIL, PASS=process.env.T_PASS;
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const res=[];const ok=(n,c,v='')=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n,v)};
const ctx=await b.newContext({viewport:{width:412,height:915}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
// 1) เครื่องมีข้อมูลเดิมรูปแบบ evarel-demo-v3 (5 รายการ ครบ 4 ชนิด) ก่อนเปิดแอป
const LOCAL=[
 {id:1760100000001,type:'habit',title:'วิ่งเช้า',subject:'',time:'05:30',timeEnd:'06:00',track:'timer',target:30,unitName:'นาที',repeat:{unit:'day',every:1,days:[]},start:'2026-10-01',end:'',skip:{},rem:[{min:10}],log:{'2026-10-09':20}},
 {id:1760100000002,type:'task',title:'การบ้านฟิสิกส์',subject:'ฟิสิกส์',time:'18:00',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},start:'2026-10-12',end:'',skip:{},rem:[],log:{}},
 {id:1760100000003,type:'event',title:'ประชุมชมรม',subject:'',time:'15:00',timeEnd:'16:30',track:'check',target:1,unitName:'',repeat:{unit:'week',every:2,days:[1,3]},start:'2026-10-14',end:'2026-12-01',skip:{},rem:[{min:5}],log:{}},
 {id:1760100000004,type:'class',title:'เคมี',subject:'เคมี',time:'10:30',timeEnd:'11:20',track:'count',target:3,unitName:'ข้อ',repeat:{unit:'week',every:1,days:[1]},start:'2026-05-15',end:'',skip:{},rem:[],log:{'2026-10-06':2}},
 {id:1760100000005,type:'habit',title:'อ่านหนังสือ',subject:'',time:'21:00',timeEnd:'',track:'count',target:10,unitName:'หน้า',repeat:{unit:'day',every:1,days:[]},start:'2026-10-01',end:'',skip:{},rem:[],log:{'2026-10-10':4}}];
await p.goto(U.replace('index.html','robots.txt')).catch(()=>{});
await p.evaluate(l=>{localStorage.clear();localStorage.setItem('evarel-demo-v3',JSON.stringify({items:l}))},LOCAL);
const rawBefore=await p.evaluate(()=>localStorage.getItem('evarel-demo-v3'));
await p.goto(U);await p.waitForTimeout(1500);
// 2) ต้องเจอหน้าล็อกอิน ไม่ใช่แอปเลย
ok('login screen shown first',await p.locator('#ev-login').count()===1);
// 3) รหัสผิด -> ข้อความผิดพลาด ไม่เข้าแอป
await p.fill('#ev-login input[name=email]',EMAIL);await p.fill('#ev-login input[name=password]','wrong-pass-xyz');
await p.click('#ev-login button[type=submit]');await p.waitForTimeout(1500);
const err=await p.textContent('#ev-login-err');ok('wrong password shows error',/ไม่ถูกต้อง/.test(err||''),err);
ok('still on login after wrong password',await p.locator('#ev-login').count()===1);
// 4) รหัสถูก -> ถามนำเข้า (บัญชีว่าง + เครื่องมี 5 รายการ)
await p.fill('#ev-login input[name=password]',PASS);await p.click('#ev-login button[type=submit]');await p.waitForTimeout(2500);
await p.waitForSelector('[data-yes]',{timeout:15000}).catch(()=>{});const dlg=await p.locator('[data-yes]').locator('xpath=ancestor::div[@role="alertdialog"]').textContent().catch(e=>'ERR '+e.message.slice(0,60));
ok('import prompt shows local count (5)',/5 รายการ/.test(dlg||''),(dlg||'').slice(0,60));
await p.click('[data-yes]');await p.waitForFunction(()=>typeof UI!=='undefined'&&UI.loading===false&&S.items.length>0,null,{timeout:60000}).catch(()=>{});
// 5) หลังนำเข้า: แอปมี 5 รายการ + ที่เซิร์ฟเวอร์มี 5 + ฟิลด์ตรงทุกตัว
const nApp=await p.evaluate(()=>S.items.length);ok('app shows 5 items after import',nApp===5,String(nApp));
const tok=await p.evaluate(()=>JSON.parse(localStorage.getItem('evarel-session-v1')).access_token);
const srv=await p.evaluate(async t=>{const r=await fetch('https://evarel-api-test.nontakorn2600.workers.dev/api/items',{headers:{Authorization:'Bearer '+t}});return (await r.json()).items},tok);
ok('server has 5 items (count before=after)',srv.length===5,String(srv.length));
const canon=v=>Array.isArray(v)?v.map(canon):(v&&typeof v==='object')?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const m=new Map(srv.map(x=>[x.id,x]));let lossless=true;
for(const it of LOCAL){const g=m.get(it.id);if(!g||JSON.stringify(canon(it))!==JSON.stringify(canon(Object.fromEntries(Object.keys(it).map(k=>[k,g[k]]))))){lossless=false;console.log('  diff',it.id,JSON.stringify(Object.keys(it).filter(k=>JSON.stringify(it[k])!==JSON.stringify(g?g[k]:undefined)).map(k=>[k,it[k],g?g[k]:'<missing>'])))}}
ok('every field of every item has identical VALUE server vs local (key order ignored: jsonb)',lossless);
ok('server returns no extra/missing top-level fields',srv.every(x=>JSON.stringify(Object.keys(x).sort())===JSON.stringify([...Object.keys(LOCAL[0])].sort())));
// 6) ข้อมูลเดิมในเครื่องต้องไม่ถูกลบ/แก้
const rawAfter=await p.evaluate(()=>localStorage.getItem('evarel-demo-v3'));
ok('original localStorage data untouched',rawAfter===rawBefore);
let puts=0;p.on('request',q=>{if(q.method()==='PUT')puts++});
// 7) แก้ไขในแอป -> ขึ้นเซิร์ฟเวอร์ (เพิ่มงานใหม่ผ่าน Repo)
await p.evaluate(async()=>{const it={id:1760100000099,type:'task',title:'งานใหม่จาก v12',subject:'',time:'',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},start:'2026-10-20',end:'',skip:{},rem:[],log:{}};const prev=S.items.slice();S.items.push(it);await syncChanges(prev,S.items)});
await p.waitForTimeout(1500);
const srv2=await p.evaluate(async t=>{const r=await fetch('https://evarel-api-test.nontakorn2600.workers.dev/api/items',{headers:{Authorization:'Bearer '+t}});return (await r.json()).items},tok);
ok('one added item = exactly 1 PUT (no key-order churn)',puts===1,String(puts));
ok('new item saved to server (6)',srv2.length===6&&srv2.some(x=>x.id===1760100000099),String(srv2.length));
// 8) เปิดแอปใหม่ -> ไม่ต้องล็อกอินซ้ำ ไม่ถามนำเข้าซ้ำ ข้อมูลยังอยู่
const p2=await ctx.newPage();p2.on('pageerror',e=>errs.push(e.message));await p2.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p2.goto(U);await p2.waitForTimeout(3500);
ok('reopen: no login screen',await p2.locator('#ev-login').count()===0);
ok('reopen: no import prompt again',await p2.locator('[role=alertdialog]').count()===0||!/นำเข้า/.test(await p2.locator('[role=alertdialog]').first().textContent()));
ok('reopen: 6 items loaded from server',(await p2.evaluate(()=>S.items.length))===6);
// 9) ออกจากระบบ -> กลับหน้าล็อกอิน แต่ข้อมูลเครื่องเดิมยังอยู่
await p2.evaluate(()=>EvarelAuth.logout());await p2.waitForTimeout(1500);
ok('logout returns to login',await p2.locator('#ev-login').count()===1);
ok('after logout local data still intact',(await p2.evaluate(()=>localStorage.getItem('evarel-demo-v3')))===rawBefore);
ok('no JS page errors',errs.length===0,errs.slice(0,2).join(' | '));
await b.close();const f=res.filter(x=>!x).length;console.log(f?`\n${f} FAILED`:'\nALL PASS ('+res.length+')');process.exit(f?1:0);

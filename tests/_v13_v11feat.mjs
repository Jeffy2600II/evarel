import { chromium } from 'playwright';
import fs from 'fs';
const U=process.argv[2]||'http://localhost:8776/index.html';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const _np=b.newPage.bind(b);b.newPage=async(o)=>{const p=await _np(o);await p.addInitScript((SEED_ITEMS)=>{if(!localStorage.getItem('evarel-demo-session')){localStorage.setItem('evarel-demo-users',JSON.stringify([{id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}]));localStorage.setItem('evarel-demo-session','u_test');if(!localStorage.getItem('evarel-demo-v3:u_test'))localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items:SEED_ITEMS}))}},[
 {id:1760100000001,type:'habit',title:'วิ่งเช้า',subject:'',time:'05:30',timeEnd:'06:00',track:'timer',target:30,unitName:'นาที',repeat:{unit:'day',every:1,days:[]},start:'2026-10-01',end:'',skip:{},rem:[{min:10}],log:{'2026-10-09':20}},
 {id:1760100000002,type:'task',title:'การบ้านฟิสิกส์',subject:'ฟิสิกส์',time:'18:00',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},start:'2026-10-12',end:'',skip:{},rem:[],log:{}},
 {id:1760100000003,type:'event',title:'ประชุมชมรม',subject:'',time:'15:00',timeEnd:'16:30',track:'check',target:1,unitName:'',repeat:{unit:'week',every:2,days:[1,3]},start:'2026-10-14',end:'2026-12-01',skip:{},rem:[{min:5}],log:{}},
 {id:1760100000004,type:'class',title:'เคมี',subject:'เคมี',time:'10:30',timeEnd:'11:20',track:'count',target:3,unitName:'ข้อ',repeat:{unit:'week',every:1,days:[1]},start:'2026-05-15',end:'',skip:{},rem:[],log:{'2026-10-06':2}},
 {id:1760100000005,type:'habit',title:'อ่านหนังสือ',subject:'',time:'21:00',timeEnd:'',track:'count',target:10,unitName:'หน้า',repeat:{unit:'day',every:1,days:[]},start:'2026-10-01',end:'',skip:{},rem:[],log:{'2026-10-10':4}}]);return p};
const res=[];const ok=(n,c,v='')=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n,v)};
const p=await b.newPage({viewport:{width:412,height:915}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto(U);await p.waitForTimeout(1500);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(2200);
const n=()=>p.evaluate(()=>S.items.length);
const n0=await n();ok('seed loaded via Repo (async boot)',n0>0,String(n0));
// เพิ่มงานผ่านฟอร์ม v11 (sheet เปิดทันที, เลือกประเภท task)
await p.click('[data-act="add"]');await p.waitForTimeout(700);
const types=await p.evaluate(()=>[...document.querySelectorAll('#sheet [data-act="dtype"]')].map(e=>e.dataset.id));
ok('form has type chooser (dtype)',types.length>=3,types.join(','));
await p.click('#sheet [data-act="dtype"][data-id="task"]').catch(()=>{});await p.waitForTimeout(400);
const inp=await p.$('#sheet input[name="title"], #sheet input[type="text"], #sheet input');
await inp.fill('ทดสอบ v11');
const saveSel='#sheet [data-act="dv-save"], #sheet [data-act="save"], #sheet .ev-btn-primary';
const sb=await p.$(saveSel);await sb.click();await p.waitForTimeout(1000);
ok('add item via v11 form',(await n())===n0+1,`${n0}->${await n()}`);
// persist ผ่าน Repo(LocalAdapter)
await p.reload();await p.waitForTimeout(2200);ok('persist across reload',(await n())===n0+1);
// ปฏิทิน: แตะวัน, สลับ เดือน/สัปดาห์
await p.click('[data-tab="calendar"]');await p.waitForTimeout(1500);
const cells=await p.$$('.fc-daygrid-day');ok('month grid 35 cells',cells.length===35,String(cells.length));
const ttl=()=>p.evaluate(()=>document.getElementById('calTitle').textContent.trim());
const hdr0=await ttl();
await p.click('[data-act="cal-nav"][data-id="next"]');await p.waitForTimeout(900);
const hdr1=await ttl();
ok('calendar next month changes header',hdr0!==hdr1,`${hdr0} -> ${hdr1}`);
await p.click('[data-act="cal-nav"][data-id="prev"]');await p.waitForTimeout(700);
ok('calendar prev returns to same month',(await ttl())===hdr0,await ttl());
await p.click('[data-act="cal-view"][data-id="timeGridWeek"]');await p.waitForTimeout(1200);
ok('week view has 7 day columns (excl. time axis)',await p.evaluate(()=>document.querySelectorAll('.fc-timegrid-col[data-date]').length)===7,String(await p.evaluate(()=>document.querySelectorAll('.fc-timegrid-col[data-date]').length)));
const wkBtn=await p.$('[data-act="cal-view"][data-id="timeGridWeek"], #app [data-act="wk"]');
// รายละเอียดรายการ + แก้ย้อนหลัง
await p.click('[data-tab="all"]');await p.waitForTimeout(800);
const det=await p.$('[data-act="detail"]');ok('detail entry exists on All tab',!!det);
if(det){await det.click();await p.waitForTimeout(1200);
 ok('detail page opens (a layer)',await p.evaluate(()=>!document.getElementById('page').hidden));
 ok('detail has month calendar (FullCalendar)',await p.evaluate(()=>!!document.querySelector('#page .fc')));
 await p.goBack();await p.waitForTimeout(800);
 ok('Back closes detail, stays on All',await p.evaluate(()=>document.getElementById('page').dataset.open!=='true')&&await p.evaluate(()=>location.hash)==='#/all');}
// Repo error/retry: ทำให้ load ล้มแล้วกด retry
await p.evaluate(()=>{window.__orig=Repo.load;});
ok('no pageerrors',errs.length===0,errs.join('|'));
console.log(res.filter(Boolean).length+'/'+res.length);
await b.close();

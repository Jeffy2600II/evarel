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
let bad=0;
for(const w of [360,390,412,457]) for(const cs of ['light','dark']){
  const p=await b.newPage({viewport:{width:w,height:915},colorScheme:cs});await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U);await p.waitForTimeout(1800);const issues=[];
  for(const t of ['today','all','calendar','stats']){await p.click(`[data-tab="${t}"]`);await p.waitForTimeout(900);
    const o=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth}));if(o.sw>o.vw)issues.push(t+':'+o.sw);}
  await p.click('[data-tab="calendar"]');await p.waitForTimeout(500);await p.click('[data-act="cal-view"][data-id="timeGridWeek"]');await p.waitForTimeout(900);
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))issues.push('week-view');
  await p.click('[data-act="add"]');await p.waitForTimeout(700);if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))issues.push('form');
  const flag=issues.length||errs.length;if(flag)bad++;console.log(`${w} ${cs}:`,issues.length?issues.join(','):'no overflow','errs',errs.length);await p.close();
}
console.log('combos with problems:',bad);await b.close();

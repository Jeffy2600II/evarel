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
async function fresh(hash=''){const p=await b.newPage({viewport:{width:412,height:915}});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());await p.goto(U+hash);await p.waitForTimeout(1300);return p}
const H=p=>p.evaluate(()=>location.hash), T=p=>p.evaluate(()=>document.querySelector('nav [aria-current="page"]')?.textContent.trim());
let p=await fresh();
ok('1 initial hash normalised to #/today',await H(p)==='#/today',await H(p));
for(const [t,l] of [['all','รายการ'],['calendar','ปฏิทิน'],['stats','สถิติ']]){await p.click(`[data-tab="${t}"]`);await p.waitForTimeout(400);ok(`2 tab ${t}`,(await H(p))==='#/'+t&&(await T(p))===l,(await H(p))+' '+(await T(p)))}
ok('2b document.title',(await p.title())==='Evarel · สถิติ',await p.title());
await p.goBack();await p.waitForTimeout(500);ok('3 Back -> calendar',(await H(p))==='#/calendar'&&(await T(p))==='ปฏิทิน',(await H(p))+' '+(await T(p)));
await p.goBack();await p.waitForTimeout(500);ok('3b Back -> all',(await H(p))==='#/all'&&(await T(p))==='รายการ');
await p.goForward();await p.waitForTimeout(500);ok('3c Forward -> calendar',(await H(p))==='#/calendar');
// sheet/popover/layers
await p.click('[data-tab="today"]');await p.waitForTimeout(400);const hl0=await p.evaluate(()=>history.length);const h0=await H(p);
await p.click('[data-act="add"]');await p.waitForTimeout(800);
const popOpen='n/a (v11 opens sheet directly)';
const sheetOpen=await p.evaluate(()=>document.getElementById('sheet').dataset.open==='true');
ok('4 add -> sheet opens',sheetOpen,'pop '+popOpen);
await p.goBack();await p.waitForTimeout(700);
ok('4b Back closes sheet only (hash same, tab same)',!(await p.evaluate(()=>document.getElementById('sheet').dataset.open==='true'))&&(await H(p))===h0&&(await T(p))==='วันนี้',(await H(p)));
// sheet open + close with X : history length unchanged
await p.click('[data-act="add"]');await p.waitForTimeout(800);
await p.click('#sheet [data-act="close"]');await p.waitForTimeout(800);
const hl1=await p.evaluate(()=>history.length);
ok('5 open+close sheet leaves no extra history',hl1<=hl0+1,`len ${hl0}->${hl1}`);
// AI page
await p.click('[data-act="ai"]');await p.waitForTimeout(800);
ok('6 AI page opens',await p.evaluate(()=>!document.getElementById('page').hidden));
await p.goBack();await p.waitForTimeout(700);ok('6b Back closes AI -> same tab',await p.evaluate(()=>document.getElementById('page').hidden||document.getElementById('page').dataset.open==='false')&&(await T(p))==='วันนี้');
await p.click('[data-act="settings"]');await p.waitForTimeout(800);ok('7 settings opens',await p.evaluate(()=>!document.getElementById('page').hidden&&/ตั้งค่า/.test(document.getElementById('page').textContent)));
await p.goBack();await p.waitForTimeout(700);ok('7b Back closes settings',await p.evaluate(()=>document.getElementById('page').dataset.open!=='true'));
ok('8 no pageerrors',p.errs.length===0,p.errs.join('|'));
await p.close();
p=await fresh('#/calendar');ok('9 deep link #/calendar',(await T(p))==='ปฏิทิน',(await H(p))+' '+(await T(p)));
await p.reload();await p.waitForTimeout(1200);ok('9b reload keeps page',(await T(p))==='ปฏิทิน');await p.close();
p=await fresh('#/zzz');ok('10 unknown hash -> #/today',(await H(p))==='#/today',await H(p));await p.close();
p=await fresh('#/ai');ok('11 deep link #/ai opens AI',await p.evaluate(()=>!document.getElementById('page').hidden),await H(p));
ok('11b no errors',p.errs.length===0,p.errs.join('|'));await p.close();
p=await fresh('#/settings');ok('12 deep link #/settings opens settings',await p.evaluate(()=>!document.getElementById('page').hidden&&/ตั้งค่า/.test(document.getElementById('page').textContent)));await p.close();
console.log(res.filter(Boolean).length+'/'+res.length+' passed');
await b.close();

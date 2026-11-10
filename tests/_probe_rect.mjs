import { chromium } from 'playwright'; import fs from 'fs';
import { SEED_ITEMS } from './seed_items.mjs';
import { makeTestUser, openAsUser, seedItems } from './live_user.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const mode=process.argv[2];
let p;
if(mode==='app'){
  const user=await makeTestUser('rect'); user.session.user={...user.session.user,name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; await seedItems(user.session,SEED_ITEMS);
  const ctx=await openAsUser(b,user,{colorScheme:'light'}); p=await ctx.newPage();
  await p.goto('http://localhost:8779/index.html'); await p.waitForTimeout(2600);
  await p.evaluate(()=>{ if(window.ST?.USER){ window.ST.USER.id='u_test'; window.render?.(); } }); await p.waitForTimeout(400);
}else{
  p=await b.newPage({viewport:{width:412,height:915},colorScheme:'light',timezoneId:'Asia/Bangkok'});
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('/tmp/evarel-repo/app-v13/vendor/fullcalendar.min.js')}));
  await p.addInitScript(()=>{Math.random=()=>0.5; const D=Date, fixed=new D('2026-10-09T10:00:00+07:00').getTime(); class F extends D{constructor(...a){a.length?super(...a):super(fixed)} static now(){return fixed}} globalThis.Date=F;
    const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st))});
  await p.goto('file:///tmp/evarel-repo/design/master-demo-v24.html'); await p.waitForTimeout(800);
  await p.evaluate((items)=>{const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'}; localStorage.setItem('evarel-demo-users',JSON.stringify([u])); localStorage.setItem('evarel-demo-session','u_test'); localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items}))},SEED_ITEMS);
  await p.reload(); await p.waitForTimeout(2600);
}
await p.waitForTimeout(400);
const out=await p.evaluate(()=>{
  const nav=[...document.querySelectorAll('#nav li')].map(li=>{const b=li.getBoundingClientRect();const btn=li.querySelector('button');const bb=btn?btn.getBoundingClientRect():null;return {li:[Math.round(b.x*100)/100,Math.round(b.width*100)/100],btn:bb?[Math.round(bb.x*100)/100,Math.round(bb.y*100)/100,Math.round(bb.width*100)/100]:null}});
  const anc=[]; let q=document.querySelector('#nav .add');
  while(q&&anc.length<12){const c=getComputedStyle(q); anc.push([q.tagName+'.'+(q.className&&q.className.baseVal!==undefined?q.className.baseVal:q.className||'').toString().slice(0,24), c.transform, c.willChange, c.filter, c.contain||'', c.backfaceVisibility]); q=q.parentElement}
  const nb=document.querySelector('#nav .add');
  const ncs=nb?getComputedStyle(nb):null;
  const pills=document.querySelector('#nav .pill');
  const pcs=pills?getComputedStyle(pills):null;
  const card=document.querySelector('.ev-sum');
  const r=card?card.getBoundingClientRect():null; const cs=card?getComputedStyle(card):null;
  const ring=document.querySelector('.ev-ringbox'); const rr=ring?ring.getBoundingClientRect():null;
  const texts=card?[...card.children].map(c=>{const b=c.getBoundingClientRect();return [c.className.slice(0,20),Math.round(b.y*100)/100,Math.round(b.height*100)/100]}):[];
  const colEl=card?[...card.children].find(c=>c!==ring):null;
  const colHTML=colEl?colEl.innerHTML.slice(0,700):'';
  return {anc,navBtn:ncs?{tr:ncs.transform,wc:ncs.willChange,fl:ncs.filter,bs:ncs.boxShadow}:null,pill:pcs?{tr:pcs.transform,wc:pcs.willChange,bs:pcs.boxShadow}:null,nav,card:card?[[Math.round(r.x*100)/100,Math.round(r.y*100)/100,Math.round(r.width*100)/100,Math.round(r.height*100)/100],Math.round(r.x*100)/100,Math.round(r.y*100)/100,Math.round(r.width*100)/100,Math.round(r.height*100)/100]:null,colHTML:colEl?colEl.innerHTML.slice(0,200):''}});
console.log(mode,JSON.stringify(out));
await b.close();

import fs from 'fs';
const vals={}; for(let l of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){l=l.trim().replace(/^export /,'');const i=l.indexOf('=');if(i>0){let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}}
const K=vals.SUPABASE_SERVICE_KEY, SB='https://vdbmwmmsfrgpaauzspup.supabase.co', API='https://evarel-api-b-test.nontakorn2600.workers.dev';
const j=async(m,u,b,h={})=>{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...h},body:b?JSON.stringify(b):undefined});const t=await r.text();try{return JSON.parse(t)}catch{return t}};
const adm={apikey:K,Authorization:'Bearer '+K};
import { chromium } from 'playwright';
const em=`rt-${Math.random().toString(36).slice(2,7)}@example.com`, pw='Passw0rd!x1';
const u=await j('POST',SB+'/auth/v1/admin/users',{email:em,password:pw,email_confirm:true},adm);
const tk=await j('POST',SB+'/auth/v1/token?grant_type=password',{email:em,password:pw},{apikey:K});
// ต้องมี anon/publishable key สำหรับ realtime ฝั่งไคลเอนต์: ใช้โทเค็นผู้ใช้เป็น apikey ไม่ได้ ลองเช็กว่ามี key ไหน
console.log('มี SUPABASE_ANON_KEY ใน env:',!!vals.SUPABASE_ANON_KEY,'| PUBLISHABLE:',!!vals.SUPABASE_PUBLISHABLE_KEY);

const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/', exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe}), p=await (await b.newContext()).newPage(); await p.goto('about:blank');
await p.evaluate(({SB,K,uid,tok})=>{window.__ev=[];window.__st=[];const ws=new WebSocket(`${SB.replace('https','wss')}/realtime/v1/websocket?apikey=${K}&vsn=1.0.0`);window.__ws=ws;
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.event==='phx_reply')window.__st.push(m.payload?.status+':'+JSON.stringify(m.payload?.response||{}).slice(0,120));if(m.event==='postgres_changes')window.__ev.push(m.payload?.data?.type)};
 ws.onopen=()=>ws.send(JSON.stringify({topic:'realtime:rt-items',event:'phx_join',ref:'1',payload:{config:{postgres_changes:[{event:'*',schema:'public',table:'items',filter:`user_id=eq.${uid}`}]},access_token:tok}}))},{SB,K,uid:u.id,tok:tk.access_token});
await new Promise(r=>setTimeout(r,2500));
const put=await fetch(API+'/api/items/1',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tk.access_token},body:JSON.stringify({id:1,type:'task',title:'rt',subject:'',time:'',timeEnd:'',track:'check',target:1,unitName:'',repeat:{kind:'none'},start:'2026-10-10',end:'',log:{},skip:[],rem:[]})});
await new Promise(r=>setTimeout(r,3500));
console.log('PUT items:',put.status);
console.log('join ตอบ:',(await p.evaluate(()=>window.__st)).join(' | '));
console.log('เหตุการณ์ realtime ที่ได้รับ:',await p.evaluate(()=>window.__ev));
await b.close(); await j('DELETE',SB+'/auth/v1/admin/users/'+u.id,null,adm);

/* ===== MODULE: data/auth — จุดต่อระบบบัญชี: เปลี่ยน `Auth` ตัวเดียว (UI ไม่รู้ว่าล็อกอินทำงานอย่างไร) =====
   สัญญา adapter: session():User|null · signInGoogle() · signInEmail(email,pw) · signUp({name,email,password}) · sendReset(email) · signOut() · deleteAccount()
   error ต้องโยก code: invalid_credentials | email_taken | network | unknown — ของจริง: เก็บ session เป็น httpOnly cookie, แฮชรหัสผ่านฝั่ง Server (Argon2/bcrypt) */
const authErr=code=>Object.assign(new Error(code),{code});

/* ===== Supabase จริงผ่าน Worker (เปิดใช้เมื่อตั้ง window.EVAREL_API) — ไม่มีกุญแจ Supabase ในเบราว์เซอร์ ===== */
const SUPA_SESS='evarel-session-v2',nowS=()=>Math.floor(Date.now()/1000);
const supaLoad=()=>{try{return JSON.parse(localStorage.getItem(SUPA_SESS))}catch(err){return null}},supaSave=t=>localStorage.setItem(SUPA_SESS,JSON.stringify(t)),supaClear=()=>localStorage.removeItem(SUPA_SESS);
const SupaCore=api=>{
 const raw=async(path,{method='GET',body,token}={})=>{let r;try{r=await fetch(`${api}${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined})}catch(err){throw authErr('network')}
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(authErr(j.code||(r.status===401?'invalid_credentials':'unknown')),{status:r.status});return j};
 let refreshing=null;
 const token=async()=>{const s=supaLoad();if(!s)throw authErr('unverified');if(s.expires_at-nowS()>60)return s.access_token;
  refreshing=refreshing||raw('/auth/refresh',{method:'POST',body:{refresh_token:s.refresh_token}}).then(n=>{supaSave(n);return n}).catch(e=>{if(e.status===401||e.status===400)supaClear();throw e}).finally(()=>{refreshing=null});return (await refreshing).access_token};
 const userOf=s=>({id:s.user.id,name:s.user.name||(s.user.email||'').split('@')[0],email:s.user.email,provider:s.user.provider||'email'});
 return {raw,token,userOf}};
const SUPA_HOST='https://vdbmwmmsfrgpaauzspup.supabase.co';
const SupaAuth=api=>{const c=SupaCore(api);let pending=null;/* pending: ที่รอยืนยันรหัส 6 หลัก {email,type} */
 const take=s=>{supaSave({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at,user:s.user});return c.userOf(s)};
 return {
  async session(){const s=supaLoad();if(!s)return null;try{await c.token();return c.userOf(supaLoad())}catch(err){console.warn('session',err);return null}},
  /* Google: เบราว์เซอร์ไปหน้า Google ผ่าน Supabase แล้วกลับมาพร้อม token ใน URL hash (ดู takeOAuthReturn) */
  async signInGoogle(){location.assign(`${SUPA_HOST}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin+location.pathname)}`);return new Promise(()=>{})},
  async takeOAuthReturn(){const h=new URLSearchParams(location.hash.replace(/^#/,''));if(!h.get('access_token'))return null;
   history.replaceState(null,'',location.pathname+location.search);/* ล้าง token ออกจาก URL ทันที */
   const j=await c.raw('/auth/session',{method:'POST',body:{access_token:h.get('access_token'),refresh_token:h.get('refresh_token')||'',expires_at:+h.get('expires_at')||0}});return take(j)},
  async signInEmail(email,pw){return take(await c.raw('/auth/login',{method:'POST',body:{email,password:pw}}))},
  async signUp({name,email,password}){const j=await c.raw('/auth/signup',{method:'POST',body:{name,email,password}});if(j.status==='verify'){pending={email,type:'signup'};throw authErr('verify_needed')}return take(j)},
  async sendReset(email){await c.raw('/auth/forgot',{method:'POST',body:{email}});pending={email,type:'recovery'}},
  async verifyCode(email,code,type){return take(await c.raw('/auth/verify',{method:'POST',body:{email,code,type}}))},
  async resend(email,type){await c.raw('/auth/resend',{method:'POST',body:{email,type}})},
  async setPassword(password){await c.raw('/auth/password',{method:'POST',body:{password},token:await c.token()})},
  async signOut(){supaClear()},
  async deleteAccount(pw){await c.raw('/auth/account',{method:'DELETE',body:{password:pw},token:await c.token()});supaClear()}}};
const SupaAdapter=api=>{const c=SupaCore(api);const call=async(path,o={})=>{const t=await c.token();const r=await fetch(`${api}${path}`,{...o,headers:{'Content-Type':'application/json',Authorization:'Bearer '+t}});if(!r.ok)throw new Error(`${o.method||'GET'} ${path} ${r.status}`);return r};
 return {token:c.token,async load(){return {items:(await (await call('/items')).json()).items}},
  async apply({upserts,removes}){await Promise.all([...upserts.map(it=>call(`/items/${it.id}`,{method:'PUT',body:JSON.stringify(it)})),...removes.map(id=>call(`/items/${id}`,{method:'DELETE'}))])}}};
const SUPA_API=typeof window!=='undefined'&&window.EVAREL_API?String(window.EVAREL_API).replace(/\/+$/,'')+'/api':null;
if(!SUPA_API)throw new Error('EVAREL_API ไม่ถูกตั้งค่า: แอปทำงานได้เฉพาะเมื่อเชื่อม API จริง');
const Auth=SupaAuth(SUPA_API);ST.Repo=SupaAdapter(SUPA_API);
const initial=()=>((ST.USER?.name||ST.USER?.email||'?').trim()[0]||'?').toUpperCase();

const S={items:[]};
const UI={tab:'today',date:TODAY,auth:{status:'loading',screen:'welcome',email:'',cool:0},type:'all',period:'week',cal:null,lastW:{},calView:'dayGridMonth',calSel:TODAY,calDate:null,weekOff:0,weekDir:0,fdate:TODAY,error:null,loading:true,animate:true,pop:null,lastP:0};
const find=id=>S.items.find(x=>x.id==id);

/* moved by move_defs (evarel-ts-1f) */
const AI_LIVE=()=>!!SUPA_API;

Object.assign(window, { authErr, SUPA_SESS, nowS, supaLoad, supaSave, supaClear, SupaCore, SUPA_HOST, SupaAuth, SupaAdapter, SUPA_API, Auth, initial, S, UI, find, AI_LIVE });

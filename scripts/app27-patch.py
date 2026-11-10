import re
src = open('archive/design/Ordivel-v27.html', encoding='utf8').read()
out = src

API_BLOCK = r"""
/* ================= WIRING v27 -> backend จริง (เพิ่มโดย Zenith 10 พ.ย. 2026) =================
   เดโม v27 ออกแบบจุดต่อไว้แล้ว: Repo (items) · Auth (บัญชี) · PUSH · AiApi
   บล็อกนี้แทนที่ตัวจำลองใน localStorage ด้วย API จริง โดยไม่แตะ UI/หน้าตาของเดโมเลย */
const API=(window.EVAREL_API||'https://ordivel-api-forge.nontakorn2600.workers.dev/api').replace(/\/+$/,'');
const TOK_KEY='ordivel-token';
const Tok={get(){try{return JSON.parse(LS.getItem(TOK_KEY)||'null')}catch(e){return null}},
  set(v){LS.setItem(TOK_KEY,JSON.stringify(v))},clear(){LS.removeItem(TOK_KEY)}};
async function apiFetch(path,opt={}){
  const doCall=t=>{const h={'Content-Type':'application/json',...(opt.headers||{})};if(t)h.Authorization='Bearer '+t;
    return fetch(API+path,{...opt,headers:h})};
  let t=Tok.get();let r=await doCall(t&&t.access_token);
  if(r.status===401&&t&&t.refresh_token){
    const rr=await fetch(API+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:t.refresh_token})});
    if(rr.ok){const fresh=await rr.json();Tok.set(fresh);r=await doCall(fresh.access_token)}
  }
  return r;
}
"""

REPO_OLD = "const Repo=LocalAdapter;/* เมื่อมี backend: const Repo=HttpAdapter('/api'); */"
REPO_NEW = r"""/* Repo = API จริง (สัญญาเดียวกับ HttpAdapter ของเดโม: GET /items · PUT/DELETE /items/:id) */
const Repo={async load(){const r=await apiFetch('/items');if(!r.ok)throw new Error('load '+r.status);const j=await r.json();return {items:Array.isArray(j.items)?j.items:[]}},
 async apply({upserts,removes}){const jobs=[...upserts.map(it=>apiFetch('/items/'+encodeURIComponent(it.id),{method:'PUT',body:JSON.stringify(it)})),
  ...removes.map(id=>apiFetch('/items/'+encodeURIComponent(id),{method:'DELETE'}))];
  const res=await Promise.all(jobs);const bad=res.find(r=>!r.ok);if(bad)throw new Error('save '+bad.status)}};
/* ===== ซิงก์ข้ามอุปกรณ์ + ตรวจรุ่นใหม่ ===== */
let liveBusy=false,liveTimer=null,liveBc=null;
const sigOf=items=>JSON.stringify((items||[]).map(i=>[i.id,i.title,i.type,i.time,i.timeEnd,i.track,i.target,i.log,i.skip]).sort());
async function liveRefresh(){
  if(liveBusy||!USER||document.hidden||UI.form||UI.detail)return;
  const ae=document.activeElement; if(ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName))return;
  liveBusy=true;
  try{const r=await Repo.load();if(sigOf(r.items)!==sigOf(S.items)){S.items=r.items;render()}}catch(err){console.warn('live',err)}
  finally{liveBusy=false}}
function liveStart(){clearInterval(liveTimer);liveTimer=setInterval(liveRefresh,30000);
  addEventListener('visibilitychange',()=>{if(!document.hidden)liveRefresh()});
  addEventListener('online',()=>liveRefresh());
  try{liveBc=new BroadcastChannel('ordivel-items');liveBc.onmessage=()=>liveRefresh()}catch(err){}}
function liveNotify(){try{liveBc&&liveBc.postMessage('changed')}catch(err){}}
let APP_VER='';
async function checkUpdate(){try{const r=await fetch('./release.json',{cache:'no-store'});if(!r.ok)return;const j=await r.json();const v=j&&j.version;
  if(!v)return;if(!APP_VER){APP_VER=v;return}if(v!==APP_VER){APP_VER=v;toast('มีเวอร์ชันใหม่แล้ว ปิด-เปิดแอปอีกครั้งเพื่ออัปเดต')}}catch(err){}}
setInterval(checkUpdate,900000);
"""

AI_OLD = "const AiApi=MockAi;/* backend จริง: const AiApi=HttpAi('/api'); */"
AI_NEW = "/* AiApi = ของจริงผ่าน Worker (/api/ai/quota, /api/ai/chat) — ตัวจำลองใน localStorage ถูกถอดออก */\nconst AiApi={\n async usage(){const r=await apiFetch('/ai/quota');if(!r.ok)return {unknown:true};const j=await r.json().catch(()=>({}));return (j&&j.calls&&j.tokens)?j:{unknown:true}},\n async chat(text){const r=await apiFetch('/ai/chat',{method:'POST',body:JSON.stringify({message:text})});\n   if(r.status===429){const j=await r.json().catch(()=>({}));throw limitErr(j.reason||'calls',(j.quota&&j.quota.resetAt)||nextBkkMidnightISO())}\n   if(!r.ok)throw Object.assign(new Error('chat_failed'),{code:'network'});\n   return r.json()},\n async setSim(){return {}} /* ปุ่มจำลองในเดโม: ไม่มีของจริงให้ตั้งค่าแล้ว */\n};"
AUTH_OLD = "const Auth=MockAuth;/* backend จริง: const Auth=HttpAuth('/api'); แล้วให้ปุ่ม Google เรียก Google Identity Services เพื่อได้ idToken ส่งให้ Server ตรวจสอบ */"
AUTH_NEW = r"""/* Auth = บัญชีจริงผ่าน Worker (/api/auth/*) · เก็บ token ใน localStorage · ต่ออายุอัตโนมัติเมื่อ 401 */
const RealAuth={
 async session(){const t=Tok.get();if(!t)return null;
   const exp=Number(t.expires_at||0)*1000;
   if(exp&&Date.now()>exp-60000&&t.refresh_token){const r=await fetch(API+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:t.refresh_token})});
     if(r.ok){const fresh=await r.json();Tok.set(fresh);return fresh.user||t.user}Tok.clear();return null}
   return t.user||null},
 async signInEmail(email,password){const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   const j=await r.json().catch(()=>({}));
   if(j.status==='verify')return {pending:true,email:j.email||email};
   if(!r.ok)throw authErr(j.code||'unknown');
   Tok.set(j);return j.user},
 async signUp({name,email,password}){const r=await fetch(API+'/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw authErr(j.code||'unknown');
   if(j.access_token){Tok.set(j);return j.user}
   return {pending:true,email:j.email||email}},
 async verifyCode(email,code,type){const r=await fetch(API+'/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,code,type:type==='recovery'?'recovery':'signup'})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw authErr(j.code||'code_invalid');
   if(j.access_token){Tok.set(j);return j.user}
   return {verified:true,access_token:j.access_token,reset_token:j.reset_token}},
 async resend(email,type){await fetch(API+'/auth/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,type})});return {}},
 async sendReset(email){await fetch(API+'/auth/forgot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});return {pending:true,email}},
 async resetPassword(email,code,password){const r=await apiFetch('/auth/password',{method:'POST',body:JSON.stringify({email,code,password})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw authErr(j.code||'unknown');return j},
 async signOut(){Tok.clear()},
 async deleteAccount(){const r=await apiFetch('/auth/account',{method:'DELETE'});if(!r.ok)throw authErr('unknown');Tok.clear()},
 async signInGoogle(){throw authErr('google_off')}
};
const Auth=RealAuth;
 const SUPA_HOST='https://vdbmwmmsfrgpaauzspup.supabase.co';
 RealAuth.signInGoogle=()=>{location.assign(`${SUPA_HOST}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin+location.pathname)}`);return new Promise(()=>{})};
 RealAuth.takeOAuthReturn=async()=>{
   const h=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
   if(!h.get('access_token'))return null;
   const tok=Object.fromEntries(h);
   const ex=Number(tok.expires_at)||(Math.floor(Date.now()/1000)+(Number(tok.expires_in)||0));
   history.replaceState(null,'',location.pathname+location.search);
   const r=await fetch(API+'/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({access_token:String(tok.access_token),refresh_token:String(tok.refresh_token||''),expires_at:ex})});
   if(!r.ok)throw authErr('oauth_failed');
   const j=await r.json();Tok.set(j);return j.user};
"""

PUSH_HOOK = r"""
/* ปุ่ม/การลงทะเบียนเครื่อง: ใช้ endpoint จริงของ Worker (กุญแจ VAPID -> สมัคร -> บันทึก) */
async function registerPushReal(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window))return 'unsupported';
  if(Notification.permission==='denied')return 'denied';
  if(Notification.permission!=='granted'){const p=await Notification.requestPermission();if(p!=='granted')return 'not-asked'}
  const t=Tok.get();if(!t)return 'auth';
  const kr=await fetch(API+'/push/key');if(!kr.ok)return 'no-key';
  const {publicKey}=await kr.json();
  const b64=publicKey.replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(b64+'='.repeat((4-b64.length%4)%4));
  const u8=new Uint8Array([...raw].map(c=>c.charCodeAt(0)));
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(sub&&sub.options.applicationServerKey){const have=new Uint8Array(sub.options.applicationServerKey);
    const same=have.length===u8.length&&have.every((v,i)=>v===u8[i]);if(!same){await sub.unsubscribe();sub=null}}
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8});
  const sr=await apiFetch('/push/subscribe',{method:'POST',body:JSON.stringify(sub.toJSON())});
  if(sr.status===403)return 'limit';
  if(!sr.ok)return 'server';
  return 'ok';
}
const registerPush=()=>registerPushReal();
"""

def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit('ไม่พบจุดต่อ: '+label)
    return text.replace(old, new, 1)

out = must_replace(out, REPO_OLD, REPO_NEW, 'Repo')
out = must_replace(out, AI_OLD, AI_NEW, 'AiApi')
out = must_replace(out, AUTH_OLD, AUTH_NEW, 'Auth')
if 'async function registerPush(){' in out:
    out = out.replace('async function registerPush(){','async function registerPushMock(){',1)
    out = out.replace('return \'ok\';\n}', 'return \'ok\';\n}\nconst registerPush=()=>registerPushReal();',1)
out = out.replace('if(USER){', 'if(USER){liveStart();', 1)
out = out.replace('USER=await Auth.session()', 'USER=(Auth.takeOAuthReturn?await Auth.takeOAuthReturn().catch(()=>null):null)||await Auth.session()', 1)
out = out.replace('</body>', '<script>'+'''
/* PWA: ลงทะเบียน service worker ของบิลด์ (จำเป็นต่อ Web Push + แคช) */
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
  addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{})});
}
'''+'</script></body>',1)
out = out.replace('<meta name=viewport', '<link rel="manifest" href="manifest.webmanifest">\n<meta name=viewport', 1)
out = out.replace('<title>Ordivel v26</title>','<title>Ordivel v27</title>',1)
# แทรกบล็อก API ก่อนบรรทัด Repo (หลัง patch แล้วต้องหาใหม่)
anchor = '/* Repo = API จริง'
i = out.find(anchor)
out = out[:i] + API_BLOCK + '\n' + out[i:]
# แทรกฟังก์ชันลงทะเบียนเครื่องจริงไว้ก่อนสิ้นสุดสคริปต์แรก
j = out.find('window.__ordivel') 
out = out.replace('const PUSH_KEY=\'evarel-push-sub\';', 'const PUSH_KEY=\'evarel-push-sub-v2\';'+PUSH_HOOK, 1)

out = out.replace('async function enterApp(user){USER=user;', 'async function enterApp(user){USER=user;liveStart();', 1)
out = out.replace('if(bad)throw new Error(\'save \'+bad.status)}};', 'if(bad)throw new Error(\'save \'+bad.status);liveNotify()}};', 1)
out = out.replace('const LocalAdapter={ async load(){try{const r=LS.getItem(uk(STORE_KEY)),s=r?JSON.parse(r):{items:[]};if(!Array.isArray(s.items))throw new Error(\'bad shape\');return s}catch(err){console.warn(\'โหลดข้อมูลไม่สำเร็จ\',err);return {items:[]}}}, async apply(changes,full){LS.setItem(uk(STORE_KEY),JSON.stringify(full))}};', '', 1)


# --- แก้ 2: ถอด LocalAdapter (เก็บข้อมูลลงเครื่อง) ด้วย regex และต่อความจำ AI ---
out = re.sub(r'const LocalAdapter=\{[\s\S]*?\}\};', '', out, count=1)
MEM = r"""/* ความจำ AI: เก็บข้อเท็จจริงฝั่งเซิร์ฟเวอร์ (คืนชีพความสามารถของระบบเดิม) */
const aiMemory=async fact=>{try{const r=await apiFetch('/ai/memory',{method:'POST',body:JSON.stringify({op:'save',fact})});return r.ok}catch(err){return false}};"""
out = out.replace("const AiApi={", MEM + "\nconst AiApi={", 1)
out = out.replace("async setSim(){return {}} /* ปุ่มจำลองในเดโม: ไม่มีของจริงให้ตั้งค่าแล้ว */",
                  "async setSim(){return {}}, memory:aiMemory", 1)
# คำสั่งลัด: พิมพ์ "จำ ..." ในช่องถาม AI = บันทึกความจำ
out = out.replace("async function aiSend(text){text=text.trim();if(!text||AI.busy)return;",
  "async function aiSend(text){text=text.trim();if(!text||AI.busy)return;\n if(/^\\/?(จำ|remember)\\s+/i.test(text)){const fact=text.replace(/^\\/?(จำ|remember)\\s+/i,'').trim();await aiMemory(fact);toast('จำไว้แล้ว');return}", 1)


# ================= ระยะ "ทำเป็นของจริง" (Master สั่ง 10 พ.ย. 2026): ตัดของที่เป็นของเดโมออกจากแอปจริง =================
import re as _re


def _drop_declarator(src, name):
    """ถอดตัวแปรตัวเดียวออกจากประกาศที่คั่นด้วยจุลภาค (const A=1,B=2,C=3;) โดยไม่พา B/C หายไปด้วย
       คืน (ข้อความใหม่, ถอดได้หรือไม่)"""
    import re as _r
    m = _r.search(r'(?:const|let|var)\s+' + _re.escape(name) + r'\s*=', src)
    if not m: return src, False
    # หาเริ่มstatement: ถอยไปจนชน ; หรือจุดขึ้นบรรทัดใหม่ที่ไม่ใช่การต่อเนื่อง
    start = m.start()
    while start > 0 and src[start-1] not in ';\n': start -= 1
    # หาจุดจบ statement: ; ตัวแรกที่ระดับลึก 0
    i = m.end(); d = 0
    while i < len(src):
        c = src[i]
        if c in '([{': d += 1
        elif c in ')]}': d -= 1
        elif c == ';' and d == 0: break
        i += 1
    stmt = src[start:i+1]
    head = _r.match(r'\s*(?:const|let|var)\s+', stmt).group(0)
    body = stmt[len(head):].rstrip(';')
    # แยก declarator ที่ระดับลึก 0
    parts, cur, d = [], '', 0
    for c in body:
        if c in '([{': d += 1
        elif c in ')]}': d -= 1
        if c == ',' and d == 0:
            parts.append(cur); cur = ''
        else:
            cur += c
    parts.append(cur)
    keep = [p2 for p2 in parts if not _r.match(r'\s*' + _re.escape(name) + r'\s*=', p2)]
    if len(keep) == len(parts): return src, False
    new = (head + ', '.join(p2.lstrip() for p2 in keep) + ';') if keep else ''
    return src[:start] + new + src[i+1:], True

def _span(src, name):
    """ช่วงของประกาศ top-level หนึ่งชื่อ (รองรับ const/let/var และ function ที่มีปีกกาในพารามิเตอร์)"""
    m = _re.search(r'(?:const|let|var)\s+' + _re.escape(name) + r'\s*=', src)
    if m:
        i, j = m.start(), m.end()
    else:
        fn = _re.search(r'(?:async\s+)?function\s+' + _re.escape(name) + r'\s*\(', src)
        if not fn: return None
        i = fn.start()
        k = src.index('(', fn.start()); d = 0; j = None
        for t in range(k, len(src)):
            if src[t] == '(': d += 1
            elif src[t] == ')':
                d -= 1
                if d == 0: j = t + 1; break
        if j is None: return None
    while j < len(src) and src[j] in ' \t\r\n': j += 1
    if j < len(src) and src[j] == '{':
        d = 0
        for k in range(j, len(src)):
            if src[k] == '{': d += 1
            elif src[k] == '}':
                d -= 1
                if d == 0:
                    return (i, k + 2 if src[k+1:k+2] == ';' else k + 1)
        return None
    d = 0
    for k in range(j, len(src)):
        c = src[k]
        if c in '([{': d += 1
        elif c in ')]}': d -= 1
        elif c == ';' and d == 0: return (i, k + 1)
    return None

# 1) ปิดธงเดโมและถอน UI ที่เป็นของเดโม (ทำก่อน เพื่อให้ตัวนับการอ้างอิงไม่เห็นมัน)
out = out.replace('const DEMO=Auth===MockAuth;', 'const DEMO=false; /* แอปจริง: ไม่มีโหมดเดโม */', 1)

def _drop_tpl(src, start_pat):
    i = src.find(start_pat)
    if i < 0: return src
    j = src.find("`:''}", i)
    if j < 0: return src
    return src[:i] + src[j+5:]

out = _drop_tpl(out, '${DEMO?`<section class="ev-card"><b>จำลองสถานะ')
out = out.replace('<button class="ev-btn-ghost ev-btn-block" data-act="seed-demo">ลองด้วยข้อมูลตัวอย่าง</button>', '')
out = _re.sub(r'<button[^>]*data-act="reset-ask"[^>]*>[^<]*</button>', '', out)
# เก็บซากเครื่องหมายจากการถอดประกาศที่อยู่ในชุดเดียว (const A=...,B=...;)
out = _re.sub(r'const\s*;', '', out)
out = _re.sub(r',\s*;', ';', out)
out = _re.sub(r'(?m)^\s*,\s*', '', out)
out = out.replace("""${DEMO?'<button type="button" class="ev-btn-ghost ev-btn-sm" data-act="ai-demo-reset">รีเซ็ต</button>':""", '')
out = out.replace("""${DEMO?'<button class="ev-btn-primary ev-btn-sm" data-act="ai-demo-reset">รีเซ็ตเดโม</button>':''}""", '')
out = out.replace('const demoCodeNote=()=>DEMO&&UI.auth.demoCode?', 'const demoCodeNote=()=>false?')

# 1.5) ถอนตัวจัดการปุ่มที่เป็นของเดโม (ตัวเรียกของโค้ดจำลอง)
def _drop_entry(src, key):
    i = src.find("'" + key + "':")
    if i < 0: return src
    j = i + len(key) + 3
    d = 0
    for k in range(j, len(src)):
        c = src[k]
        if c in '([{': d += 1
        elif c in ')]}': d -= 1
        elif c == ',' and d == 0:
            return src[:i] + src[k+2:]
    return src

for _k in ['ai-demo-reset', 'sim-set', 'ai-demo-restart', 'seed-demo', 'reset-ask']:
    out = _drop_entry(out, _k)

# 1.6) ถอนแบนเนอร์โชว์รหัสทดสอบและธงเดโมที่หมดหน้าที่
_i = out.find('const demoCodeNote=()=>')
if _i >= 0:
    _j = out.find("'';", _i)          # ประกาศนี้เป็นบรรทัดเดียว ปิดท้ายด้วย :'';
    if _j > 0:
        out = out[:_i] + out[_j+3:]
out = out.replace('${demoCodeNote()}', '')
out = out.replace('const DEMO=false; /* แอปจริง: ไม่มีโหมดเดโม */', '')
out = out.replace(' (Play CDN ใช้เฉพาะเดโม)', '')
out = out.replace('จำลองสถานะ (เฉพาะเดโม)', '')
out = out.replace(",USAGE_KEY='evarel-demo-usage',AI_REPLY_MS=750", '')

# 2) ถอนโค้ดจำลองที่ไม่ถูกอ้างถึงแล้ว (ตัวนับอ้างอิงเป็นตัวตัดสิน ไม่ใช่ความหวัง)
DEMO_ONLY = ['USERS_KEY','SESSION_KEY','AUTH_DELAY_MS','readUsers','writeUsers','pubUser','DEMO_GOOGLE',
             'newId','CODE_TTL_MS','CODE_MAX_TRIES','PENDING','hashPw','issueCode','genCode','MockAuth',
             'MockAi','SIM_PRESETS','freshUsage','mockUsage','saveMockUsage','usageView','bkkDay','USAGE_KEY','AI_REPLY_MS','seed','HttpAuth','HttpAi','REM_PRESETS','STORE_KEY','USAGE_LIMITS','aiReply','rate','registerPushMock']
removed, kept = [], []
for _pass in range(8):
    gone_now = []
    for nm in DEMO_ONLY:
        if nm in removed: continue
        rest_try, ok = _drop_declarator(out, nm)
        if ok:
            if not _re.search(r'\b' + _re.escape(nm) + r'\b', rest_try):
                out = rest_try; gone_now.append(nm)
            continue
        sp = _span(out, nm)
        if not sp: continue
        rest = out[:sp[0]] + out[sp[1]:]
        if not _re.search(r'\b' + _re.escape(nm) + r'\b', rest):
            out = rest; gone_now.append(nm)
    removed += gone_now
    if not gone_now: break
# 1.7) เก็บซากที่ค้างจากการตัด (ถ้ามี) — ตรวจด้วย node --check ภายหลัง
_orphan = ' return {resetAt:nextBkkMidnightISO()'
_oi = out.find(_orphan)
if _oi > 0:
    _oj = out.find('\nconst ', _oi)
    if _oj > 0: out = out[:_oi] + '\n' + out[_oj:]

kept = [nm for nm in DEMO_ONLY if nm not in removed and _re.search(r'\b' + _re.escape(nm) + r'\b', out)]
print('ตัดโค้ดจำลองออก:', len(removed), 'ตัว | ยังถูกอ้างถึง:', kept)
# เก็บซากหลังถอด (ทำหลังสุดเสมอ ไม่งั้นซากยังไม่เกิด)
out = _re.sub(r'(?m)^\s*,\s*(?=[A-Za-z_$][\w$]*\s*=)', 'const ', out)
out = _re.sub(r'const\s*;', '', out)
out = _re.sub(r',\s*;', ';', out)

# 1.85) ข้อความที่ยังเป็นของเดโมแต่ผู้ใช้เห็นบนหน้าเว็บจริง -> เปลี่ยนเป็นความจริงของระบบจริง
REAL_TEXT = [
  # หน้าแรก (ตั้งค่า) เคยบอกว่าข้อมูลอยู่แต่ในเครื่อง ซึ่งผิดแล้ว: ข้อมูลซิงก์กับบัญชีผ่าน API
  ('ข้อมูลเก็บในเครื่องนี้เท่านั้น ล้างข้อมูลเบราว์เซอร์แล้วจะหาย',
   'ข้อมูลซิงก์กับบัญชีของคุณ เปิดเครื่องไหนก็เห็นรายการเดียวกัน'),
  # เดโมบอกว่า Push ยังไม่ทำงานจริง ซึ่งไม่จริงแล้ว
  (' · เดโมยังไม่ส่ง Push จริง ต้องเชื่อม Worker', ''),
  # การ์ดเกี่ยวกับ: เลขรุ่นต้องเป็นรุ่นบิลด์จริง ไม่ใช่ v27 ของเดโม
  ('<div style="font-size:20px;font-weight:700;letter-spacing:-.01em">v27</div><p class="ev-sub">เดโม v27 · ฟอร์มแยกการ์ด · แจ้งเตือนสองแบบ · สถิติรายวัน · ธีมสว่างนุ่ม</p>',
   '<div style="font-size:20px;font-weight:700;letter-spacing:-.01em">${window.__EV_VERSION__||""}</div><p class="ev-sub">Ordivel · รายการและปฏิทินซิงก์กับบัญชี · แจ้งเตือนตามเวลาที่ตั้ง</p>'),
  # ชื่อหน้าบนแท็บ/ตอนติดตั้ง ต้องเป็นชื่อผลิตภัณฑ์ ไม่ใช่เลขรุ่นของเดโม
  ('<title>Ordivel v27</title>', '<title>Ordivel</title>'),
  # เอกสารกฎหมายที่เป็นข้อความตัวอย่างของเดโม
  ('เอกสารตัวอย่างสำหรับเดโม ใส่ข้อความจริงก่อนเปิดใช้งาน',
   'ฉบับเต็มจะประกาศก่อนเปิดใช้งานทั่วไป ตอนนี้ใช้เพื่อทดสอบระบบ'),
]
for a, b in REAL_TEXT:
    out = out.replace(a, b)
# ร่องรอยรหัสยืนยันแบบเดโม (ของจริงส่งทางอีเมล ไม่มีรหัสบนจอ)
out = _re.sub(r"UI\.auth\.demoCode\s*=\s*r\?\.demoCode\s*\|\|\s*'';", '', out)
out = _re.sub(r"UI\.auth\.demoCode\s*=\s*r\?\.demoCode\s*\|\|\s*'';?", '', out)
out = _re.sub(r"demoCode:r\.demoCode\s*\|\|\s*'',?", '', out)
out = _re.sub(r"const n=\$\('demoCode'\);if\(n\)n\.textContent=UI\.auth\.demoCode;", '', out)

# 1.87) ถอดกล่อง "ข้อมูลของคุณ" (ส่งออก/นำเข้าไฟล์) ออกจากหน้าตั้งค่า: ผู้ใช้จริงไม่ต้องจัดการไฟล์เอง ข้อมูลอยู่กับบัญชีแล้ว
out = _re.sub(r'<h2 class="ev-group">ข้อมูล</h2><section class="ev-card"><b>ข้อมูลของคุณ</b>.*?</section>', '', out, flags=_re.S)
out = _re.sub(r'<input type="file" id="importFile"[^>]*hidden>', '', out)
out = _re.sub(r"\n?\s*export:\(\)=>\{exportData\(\);return NR\},import:\(\)=>\{\$\('importFile'\)\.click\(\);return NR\},", '', out)

# 1.875) เก็บโค้ดตายที่ผูกกับกล่องข้อมูล (ฟังก์ชันส่งออก/นำเข้า + ตัวดักไฟล์)
out = _re.sub(r"function exportData\(\)\{[\s\S]*?\nfunction importData\(file\)\{[\s\S]*?fr\.readAsText\(file\)\}\n", '', out)
out = _re.sub(r"if\(e\.target\.id==='importFile'&&e\.target\.files\[0\]\)\{importData\(e\.target\.files\[0\]\);e\.target\.value=''\}", '', out)

# 1.88) ข้อความที่ผู้ใช้เห็นทั้งแอป: อ่านจาก scripts/app27-copy.json (เขียนจากมุมมองผู้ใช้จริง)
import json as _json, os as _os
COPY_MAP = _os.path.join(_os.path.dirname(__file__), 'app27-copy.json')
_copy_hit = _copy_miss = 0
if _os.path.exists(COPY_MAP):
    # คู่ที่อ้างคำเดิมซ้ำ: ตัวหลังสุดชนะ (ให้แก้คำแปลซ้ำได้โดยไม่ต้องลบของเก่า)
    _pairs = {}
    for _o, _n in _json.load(open(COPY_MAP, encoding='utf8'))['pairs']:
        _pairs[_o] = _n
    for _old, _new in _pairs.items():
        if _old == _new:
            continue
        if _old in out:
            out = out.replace(_old, _new); _copy_hit += 1
        else:
            _copy_miss += 1
            print('  ! คำเดิมไม่พบ:', _old[:70])
    print(f'ข้อความผู้ใช้ที่เขียนใหม่: {_copy_hit} จุด | ไม่พบคำเดิม: {_copy_miss}')

# 1.89) กล่องแจ้งเวอร์ชันใหม่ (คืนมาแบบผู้ใช้กดอัปเดตเองได้) — ต้องมีตัวช่วยเปิดจากตัวตรวจรุ่นเดิมด้วย
UPDATE_UI = """
<style>#evUpd{position:fixed;left:12px;right:12px;bottom:calc(12px + var(--kb,0px));z-index:9999;display:none;gap:10px;align-items:center;
padding:12px 14px;border-radius:16px;background:var(--c-surface,#fff);box-shadow:0 8px 30px rgba(0,0,0,.18);border:1px solid var(--c-line,#e6e6ea);
font-family:inherit}#evUpd[data-open="true"]{display:flex}#evUpd .t{flex:1;min-width:0}#evUpd b{display:block;font-size:15px;color:var(--c-text,#111)}
#evUpd span{display:block;font-size:13px;color:var(--c-muted,#666);margin-top:2px}#evUpd button{border:0;border-radius:12px;padding:9px 14px;font-size:14px;font-weight:600;font-family:inherit}
#evUpd .go{background:var(--c-accent,#181142);color:#fff}#evUpd .later{background:transparent;color:var(--c-muted,#666)}</style>
<div id="evUpd" role="status" aria-live="polite"><div class="t"><b>มีเวอร์ชันใหม่</b><span>อัปเดตเพื่อใช้งานเวอร์ชันล่าสุด</span></div>
<button class="later" type="button" data-ev="later">ภายหลัง</button><button class="go" type="button" data-ev="go">อัปเดตเลย</button></div>
<script>(function(){var box=document.getElementById('evUpd');if(!box)return;
function show(){try{if(sessionStorage.getItem('ev_upd_later')==='1')return}catch(e){}box.dataset.open='true'}
window.__evShowUpdate=show;
async function apply(){box.dataset.open='false';
 try{var r=await navigator.serviceWorker.getRegistration();if(r&&r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'});}catch(e){}
 try{var ks=await caches.keys();await Promise.all(ks.map(function(k){return caches.delete(k)}));}catch(e){}
 setTimeout(function(){location.reload()},350);}
box.addEventListener('click',function(e){var a=e.target.closest('[data-ev]');if(!a)return;
 if(a.dataset.ev==='go')apply();else{try{sessionStorage.setItem('ev_upd_later','1')}catch(err){}box.dataset.open='false'}});
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistration().then(function(r){if(!r)return;
  if(r.waiting)show();r.addEventListener('updatefound',function(){var w=r.installing;if(!w)return;
   w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)show()})})}).catch(function(){})}
})();</script>
"""
if 'id="evUpd"' not in out:
    out = out.replace('</body>', UPDATE_UI + '</body>', 1) if '</body>' in out else out + UPDATE_UI
# ตัวตรวจรุ่นเดิมเคยขึ้นแค่ข้อความลอย ๆ: ให้เรียกกล่องนี้แทน
out = out.replace("toast('มีรุ่นใหม่แล้ว กำลังเปิดให้')", "window.__evShowUpdate?window.__evShowUpdate():toast('มีเวอร์ชันใหม่ พร้อมอัปเดต')")

# 1.9) อัปเดตตัวเองได้: รุ่นใหม่ต้องเข้าเครื่องเอง ไม่ค้างรอ "ปิดทุกแท็บ"
UPDATE_JS = """
<script>(function(){if(!('serviceWorker' in navigator))return;var K='__ev_upd';function reloadOnce(){try{var t=+sessionStorage.getItem(K)||0;if(Date.now()-t<15000)return;sessionStorage.setItem(K,String(Date.now()));}catch(e){}location.reload();}
navigator.serviceWorker.addEventListener('controllerchange',reloadOnce);
function check(){navigator.serviceWorker.getRegistration().then(function(r){if(!r)return;if(r.update)r.update();if(r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'});}).catch(function(){});}
window.addEventListener('load',check);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')check();});
setInterval(check,60000);})();</script>
"""
if 'SKIP_WAITING' not in out:
    out = out.replace('</body>', UPDATE_JS + '</body>', 1) if '</body>' in out else out + UPDATE_JS

open('web/app27/index.html','w',encoding='utf8').write(out)
print('สร้าง web/app27/index.html:', len(out), 'ตัวอักษร')

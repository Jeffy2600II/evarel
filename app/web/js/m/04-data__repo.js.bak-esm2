/* ===== MODULE: data/repo — จุดต่อ backend: เปลี่ยน `Repo` ตัวเดียว (UI ไม่รู้ว่าข้อมูลมาจากไหน) =====
   สัญญา adapter: load():Promise<{items}> · apply({upserts:Item[],removes:id[]},fullState):Promise<void> (โยน error เมื่อบันทึกไม่สำเร็จ) */
const uk=k=>`${k}:${ST.USER?.id||'anon'}`;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const LocalAdapter={
 async load(){try{const r=localStorage.getItem(uk(STORE_KEY)),s=r?JSON.parse(r):{items:[]};if(!Array.isArray(s.items))throw new Error('bad shape');return s}catch(err){console.warn('โหลดข้อมูลไม่สำเร็จ',err);return {items:[]}}},
 async apply(changes,full){localStorage.setItem(uk(STORE_KEY),JSON.stringify(full))}};
const HttpAdapter=base=>{const call=(url,o)=>fetch(url,{credentials:'include',headers:{'Content-Type':'application/json'},...o}).then(r=>{if(!r.ok)throw new Error(`${o?.method||'GET'} ${url} ${r.status}`);return r});
 return {async load(){return {items:(await (await call(`${base}/items`)).json()).items}},
  async apply({upserts,removes}){await Promise.all([...upserts.map(it=>call(`${base}/items/${it.id}`,{method:'PUT',body:JSON.stringify(it)})),...removes.map(id=>call(`${base}/items/${id}`,{method:'DELETE'}))])}}};
ST.Repo=LocalAdapter;/* เมื่อมี backend: ตั้ง window.EVAREL_API แล้ว Repo จะเป็น SupaAdapter (ดูท้ายโมดูล auth) */
function diffItems(prev,next){const m=new Map(prev.map(x=>[x.id,JSON.stringify(x)])),ids=new Set(next.map(x=>x.id));return {upserts:next.filter(x=>m.get(x.id)!==JSON.stringify(x)),removes:prev.filter(x=>!ids.has(x.id)).map(x=>x.id)}}
async function syncChanges(prev,next){const ch=diffItems(prev,next);if(!ch.upserts.length&&!ch.removes.length)return;await ST.Repo.apply(ch,{items:next})}

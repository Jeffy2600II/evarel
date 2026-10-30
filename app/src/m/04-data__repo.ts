import { diffItems as diffItemsOf } from './core/repo.js';
/* ===== MODULE: data/repo — จุดต่อ backend: เปลี่ยน `Repo` ตัวเดียว (UI ไม่รู้ว่าข้อมูลมาจากไหน) =====
   สัญญา adapter (ตัวจริงคือ SupaAdapter ใน data/auth): load():Promise<{items}> · apply({upserts:Item[],removes:id[]},fullState):Promise<void> (โยน error เมื่อบันทึกไม่สำเร็จ) */
export const uk=k=>`${k}:${ST.USER?.id||'anon'}`;
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
export const diffItems=diffItemsOf;
export async function syncChanges(prev,next){const ch=diffItems(prev,next);if(!ch.upserts.length&&!ch.removes.length)return;await ST.Repo.apply(ch,{items:next})}

Object.assign(window, { uk, wait, diffItems, syncChanges });

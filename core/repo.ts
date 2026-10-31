/* ชั้นฐาน (ES module จริง): เทียบรายการเดิมกับใหม่ได้ upserts/removes เป็นฟังก์ชันบริสุทธิ์ ไม่แตะ state กลาง
   เทียบด้วย JSON.stringify ดังนั้นลำดับคีย์ในรายการมีผล (คีย์สลับ = ถือว่าต่าง) ต้องคงพฤติกรรมนี้ไว้ตรงตัว
   ตรรกะชุดเดียว: โมดูลเดิม 04-data__repo ห่อเรียกที่นี่ */
export function diffItems<T extends { id: string }>(prev: T[], next: T[]): { upserts: T[]; removes: string[] }{const m=new Map(prev.map(x=>[x.id,JSON.stringify(x)])),ids=new Set(next.map(x=>x.id));return {upserts:next.filter(x=>m.get(x.id)!==JSON.stringify(x)),removes:prev.filter(x=>!ids.has(x.id)).map(x=>x.id)}}

/* วางแผนนำเข้าข้อมูลเก่า: คืนรายการที่จะ upsert (ฟังก์ชันบริสุทธิ์ ไม่แตะเครือข่ายหรือ state กลาง)
   พฤติกรรมเดิมต้องคงตรงตัว: mode 'append' เท่านั้นที่เลี่ยง id ชนกับของบนเซิร์ฟเวอร์ (ชน = ให้เลขใหม่ต่อจากเลขสูงสุด) mode อื่นเก็บ id เดิมทุกตัว
   ใช้ Number(id)||0 และ Math.max(0,...) ตามเดิม (id ที่ไม่ใช่ตัวเลขนับเป็น 0) | สำเนาลึกด้วย JSON เหมือนเดิม (undefined ถูกทิ้ง) */
export function planImport<T extends { id: unknown }>(list: T[], serverItems: Array<{ id: unknown }>, mode: string): T[]{
 let nextId=Math.max(0,...serverItems.map(x=>Number(x.id)||0))+1;const taken=new Set(serverItems.map(x=>Number(x.id)));
 return list.map(it=>{const c=JSON.parse(JSON.stringify(it));
  if(mode==='append'&&taken.has(Number(c.id))){c.id=nextId++}else if(mode==='append'){taken.add(Number(c.id))}
  return c})}

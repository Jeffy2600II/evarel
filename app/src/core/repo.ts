/* ชั้นฐาน (ES module จริง): เทียบรายการเดิมกับใหม่ได้ upserts/removes เป็นฟังก์ชันบริสุทธิ์ ไม่แตะ state กลาง
   เทียบด้วย JSON.stringify ดังนั้นลำดับคีย์ในรายการมีผล (คีย์สลับ = ถือว่าต่าง) ต้องคงพฤติกรรมนี้ไว้ตรงตัว
   ตรรกะชุดเดียว: โมดูลเดิม 04-data__repo ห่อเรียกที่นี่ */
export function diffItems<T extends { id: string }>(prev: T[], next: T[]): { upserts: T[]; removes: string[] }{const m=new Map(prev.map(x=>[x.id,JSON.stringify(x)])),ids=new Set(next.map(x=>x.id));return {upserts:next.filter(x=>m.get(x.id)!==JSON.stringify(x)),removes:prev.filter(x=>!ids.has(x.id)).map(x=>x.id)}}

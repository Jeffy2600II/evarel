// store กลางที่ React subscribe ได้ (S4 s4f-store-react) | สัญญาตรงกับ useSyncExternalStore: subscribe(fn)->unsubscribe, getSnapshot()->ค่าที่เทียบด้วย === ได้
// ไม่ถือข้อมูลเอง: ข้อมูลจริงยังอยู่ที่ S.items / UI เดิม (ถูกแก้ทั้งแบบทับทั้งก้อนและแบบ in-place จึงดักการเขียนไม่ได้) store นี้ถือเพียง "เลขรอบ" ที่เพิ่มทุกครั้งที่ render() จบ
// ทุกการเปลี่ยนต้องจบที่ render() อยู่แล้ว (ตรวจแล้ว 18 ต.ค. 2026: commit/ai-live/timer/calendar) จึงแจ้งที่จุดเดียวนั้น ไม่มีทางพลาด in-place
// ไม่มีผู้ฟัง = เพิ่มเลขรอบอย่างเดียว ไม่แตะ DOM จึงไม่กระทบประตูภาพ 0 พิกเซล
const MAX_DEPTH = 3;
export function createStore() {
  let version = 0, depth = 0;
  const subs = new Set();
  return {
    getSnapshot: () => version,
    subscribe(fn) { subs.add(fn); return () => { subs.delete(fn); }; },
    notify() {
      version++;
      if (depth >= MAX_DEPTH) return; // ผู้ฟังสั่ง notify ซ้อนได้ไม่เกินสามชั้น กันวนไม่รู้จบ
      depth++;
      try { for (const fn of [...subs]) { try { fn(); } catch (e) { console.warn('store listener', e); } } }
      finally { depth--; }
    },
  };
}

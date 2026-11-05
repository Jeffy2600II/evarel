// preload: ฉีดเซสชันของผู้ใช้ทดสอบจริงเข้าทุกหน้า/คอนเท็กซ์ (ชุดเดิมไม่ต้องแก้) — ฉีดซ้ำทุกครั้งที่โหลดหน้า
// เพื่อให้รอดหลังชุดเดิมเรียก localStorage.clear() แล้ว reload (ผู้ใช้จริงที่ล็อกอินแล้วย่อมมีเซสชันอยู่)
import { chromium } from 'playwright';
const sess = process.env.T_SESS;
const init = s => { try { if (!localStorage.getItem('evarel-session-v1')) localStorage.setItem('evarel-session-v1', s); } catch (e) {} };
const L = chromium.launch.bind(chromium);
chromium.launch = async (...a) => {
  const b = await L(...a);
  const np = b.newPage.bind(b), nc = b.newContext.bind(b);
  b.newPage = async (...x) => { const p = await np(...x); await p.addInitScript(init, sess); return p; };
  b.newContext = async (...x) => { const c = await nc(...x); await c.addInitScript(init, sess); return c; };
  return b;
};

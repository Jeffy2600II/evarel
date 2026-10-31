/**
 * ถาดข้อมูลของหน้าจับเวลา (focus) F3.3-g17
 * กลุ่ม B (ไม่ผูกตัวนับเวลา): icon (ตัวผลิต SVG) find (ค้นรายการจริง) dayLab (ชั้น m อ่าน TODAY เอง) | ไม่มีใน core/ ในรูปที่ใช้ได้ตรง จึงผ่านถาด
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05 อนุญาตเฉพาะไฟล์ .tray) | อ่านตอนเรียก ไม่ใช่ตอน import (ไฟล์หน้าถูกโหลดก่อนชั้น m ตั้ง window ครบไหมไม่แน่)
 * คืนค่าอ้างอิงเดิมของชั้น m (ไม่คัดลอก): find อ่าน S.items ของจริงทุกครั้ง ห้ามเก็บผลไว้เพราะรายการเปลี่ยนได้ระหว่างจับเวลา
 * ทำไมไม่ใช้ takeDetail: มี core 14 ชื่อและ seg UI ที่โฟกัสไม่ใช้ ถ้านำมาใช้ focus.js จะบวมตาม (เป้าคือลดขนาด)
 */
import { tray, T } from '../tray.js';

const focusFns = tray('focus', { icon: T.func, find: T.func, dayLab: T.func });

/** อ่าน icon find dayLab จากชั้น m หนึ่งครั้งต่อการเรียก ตรวจรูปที่ถาด แล้วคืนค่าอ้างอิงเดิม | ห้ามเก็บผลข้ามการเรียก */
export function takeFocusFns(src = (typeof window !== 'undefined' ? window : {})) {
  return focusFns.take({ icon: src.icon, find: src.find, dayLab: src.dayLab });
}

const focusLive = tray('focus', { ST: T.any, UI: T.any, tmMs: T.func });

/**
 * F3.3-g18: สภาพจับเวลาสดของชั้น m (ST.TM, UI.fdate, tmMs) | อ่านสดทุกครั้งที่เรียก ห้ามเก็บผลข้ามการเรียก
 * เหตุผล: ST.TM ถูกกำหนดใหม่ได้ 5 จุดในชั้น m (จบ ยกเลิก ออกจากระบบ นำเข้า เริ่ม) และ UI.fdate ถูกกำหนดใหม่ 2 จุด (เปลี่ยนวัน) tmMs อ่าน Date.now ตอนเรียก
 * จึงคืน getter ที่อ่านจาก ST/UI ของจริงทุกครั้ง (ไม่คัดลอกค่า) และ tmMs ของชั้น m ตัวเดียว (ไม่คัดลอกสูตร) | ถ้า ST ยังไม่มี ถาดตรวจพบและโยนข้อผิดพลาดชัดเจน
 */
export function takeFocusLive(src = (typeof window !== 'undefined' ? window : {})) {
  const g = focusLive.take({ ST: src.ST, UI: src.UI, tmMs: src.tmMs });
  return { tm: () => g.ST.TM, fdate: () => g.UI.fdate, tmMs: g.tmMs };
}

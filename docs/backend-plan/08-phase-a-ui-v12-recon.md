# 08 | เฟส A: นำ UI v12 ใส่แอป | ผลสำรวจโค้ดจริง (10 ต.ค. 2026) | สถานะ: สำรวจเสร็จ ยังไม่ลงมือแก้

## ผล diff โมดูล (เดโม design/master-demo-v12.html เทียบ app-v12/js/app.js)
- เหมือนกันทุกไบต์ 11 โมดูล: core/dates, core/store, services/schedule, services/stats, core/undo, ui/layers, ui/popover, ui/form, services/calendar, views/detail
- ใหม่ 2: `data/auth` (MockAuth/HttpAuth), `views/auth` (welcome/login/signup/forgot/sent + splash)
- เปลี่ยน 8: core/constants (ไอคอน), data/repo, ui/primitives (header), views (today ตอนว่าง = "ยินดีต้อนรับ"), core/timer + views/ai (คีย์ localStorage แยกผู้ใช้ด้วย uk()), views/settings (การ์ดโปรไฟล์/บัญชี), actions, render (boot ผ่าน Auth.session -> loadApp)
- การเปลี่ยนที่ "ไม่ใช่บัญชี" มีน้อย: ไอคอน, header, หน้า today ตอนไม่มีรายการ

## ข้อสรุปวิธีทำ
เอา**โค้ดเดโมเป็นฐาน** (ภาพที่ Master อนุมัติคือโค้ดนี้) แล้วเสียบของจริงแทนสองจุดเท่านั้น:
1. `Repo` -> HttpAdapter เดิมของ app-v12 (`http-adapter.js` ผ่านทดสอบแล้ว ไม่แก้)
2. `Auth` -> MockAuth ไปก่อน (ตามข้อ 5) แล้วเฟส B ค่อยเปลี่ยนเป็น SupabaseAuth ที่ `auth.js` เดิมมีส่วนล็อกอิน/รีเฟรช/นำเข้าอยู่

## สิ่งที่ต้องเก็บจาก app-v12 เดิม (ห้ามหาย)
- `index.html`: โครงเดโมมี `#auth` เพิ่ม ต้องใช้ของเดโม + คง manifest/icons/โหลด vendor/fullcalendar, http-adapter, route.js, boot.js
- `route.js` (hash route + back): ต้องหลบหน้า auth (ไม่ตั้ง route ตอนยังไม่ล็อกอิน)
- `sw.js` evarel-v21-auth: precache ต้องเพิ่มไฟล์ใหม่ถ้าแยกไฟล์ + คงการไม่เก็บ response ที่ redirect
- ด่านล็อกอินเดิม `EvarelGate` ใน auth.js: เดโมแทนด้วย Auth.session()+views/auth ต้องย้ายตรรกะ "นำเข้า localStorage ครั้งเดียว" ไปไว้หลังล็อกอินสำเร็จ (ตรวจแล้ว v12auth.mjs ครอบคลุมทดสอบ)

## ความเสี่ยงที่ต้องทดสอบก่อนส่งมอบ
- คีย์ localStorage เปลี่ยนเป็น `key:userId` (uk()) ข้อมูลทดสอบเก่า evarel-demo-v3 ต้องไม่หาย (นำเข้าจากคีย์เดิม)
- ภาพ 0 พิกเซลต้องเทียบ 3 กลุ่ม: หน้าแอปหลัก (เดิม 10 ภาพ), หน้า auth (welcome/login/signup/forgot/sent ทั้งสว่าง/มืด) , หน้าตั้งค่าใหม่
- รันชุดเดิม route 22 / ฟีเจอร์ 13 / ovf / PWA ออฟไลน์ + v12auth.mjs ต้องปรับให้เจอหน้า auth ใหม่

## Gate (ไม่ผ่านต้องย้อนกลับ ใช้ app-v11 เป็น rollback)
ภาพตรงเดโม 0 พิกเซล + ชุดเดิมผ่านครบ + เปิดซ้ำ/ออฟไลน์ผ่าน + ข้อมูลเดิมนำเข้าครบ

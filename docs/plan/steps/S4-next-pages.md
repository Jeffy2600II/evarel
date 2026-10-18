# S4 ขั้นถัดไป: ให้ Next สร้างหน้าจริง (next-pages)

กลับไปที่ [แผนหลัก](../MASTER-PLAN.md) | ขั้นที่ทำถึง: s4f-base-esm, s4f-store-react, s4f-route-today-calendar, s4f-typecheck-zero, s4f-route-ai, s4f-shell-layers-auth (เสร็จ 19 ต.ค. 2026)

## สถานะปัจจุบันเมื่อเริ่มขั้นนี้

- พื้นผิวทั้งหมดเป็น React แล้ว (16 component: today, calendar, all, stats, ai, settings, nav, sheet, dialog, confirm, form, detail, auth, quota, aiShell, focus, itemRow) ผ่าน parity test ทุกไบต์และประตู 9 ชุด errs 0
- เครื่องยนต์ (26 โมดูล js/m) เป็น ES module + shim window (Object.assign) — โหลดผ่าน script tag ใน index.html ตามลำดับ
- web-shell (Next 16.4 static export) เป็นตัวปล่อยไฟล์ผ่านตรงทุกไบต์ (S3): ห้ามมี page ใน src/app เพราะจะเขียนทับ index.html ของแอป (มีตัวตรวจใน build-web.mjs)
- ประตู 9 ชุดวิ่งที่ app/web (พอร์ต 8779) — นี่คือความจริงที่ต้องรักษาไว้จนกว่าของใหม่พิสูจน์ตัวเองแล้ว

## เป้าหมาย (เกณฑ์ goal)

1. ทุก route (วันนี้ รายการ ปฏิทิน สถิติ ผู้ช่วย AI ตั้งค่า) สร้างจากส่วนประกอบ React ของ Next เอง
2. ไม่มีโมดูลแอปแบบ window เดิมหรือ index.html เดิมเหลือในเส้นทางที่เสิร์ฟ
3. ประตู 9 ชุด + sw_upgrade จากรุ่นเก่า + fn_equiv ผ่านหลังเสร็จ

## กลไกร่วมอยู่ (บรรจุใน build ขนาน — แก้ปัญหา "ยังไม่ได้ออกแบบ" ของสเปกเดิม)

**หลักการ: ของเดิมกับของใหม่อยู่ร่วมกันที่ระดับ build pipeline ไม่ใช่ระดับ runtime**

- เส้นทางเสิร์ฟเดิม (app/web → 8779 → ประตู 9 ชุด) ไม่แตะเลยจนกว่าของใหม่ผ่าน parity ครบ
- ของใหม่คือ build ขนาน: `scripts/build-next.mjs` สร้าง `build/web-next` จาก Next จริง (src/app มี page.tsx + บันเดิลเครื่องยนต์) โดยไม่แตะ build/web เดิม
- ตัวชี้ขาดคือ parity รูป: เอาฉากเดียวกับประตูภาพ (26 ฉาก เทียบเดโม) รันบน build/web-next จน ALL PASS — ค่อยอนุญาตให้สลับเส้นทางเสิร์ฟ
- สลับเป็นขั้นสุดท้าย: build-web.mjs เปลี่ยนโหมดจากปล่อยผ่านเป็น Next build, ลบ js/m ออกจากผลลัพธ์, ประตูชี้ที่เส้นทางใหม่

## สถาปัตยกรรมของของใหม่

```
web-shell/src/
  app/layout.tsx   — <html> ใหม่แทน index.html: head (meta/fonts/CSS/manifest/EVAREL_API/SW) + body containers ตาม index.html เดิมเป๊ะ
  app/page.tsx     — หน้าเดียวของแอป (SPA hash route: #/today ฯลฯ) เรนเดอร์ containers ทั้งหมด + <AppBoot/>
  lib/boot.ts      — side-effect imports เครื่องยนต์ทั้งหมดตามลำดับเดิม: react/runtime → react pages → m/00..25 → route.js
                     (โมดูลยังคุยกันผ่าน window ภายในบันเดิล — สิ่งที่เปลี่ยนคือไม่ถูกเสิร์ฟเป็นไฟล์แยกอีกต่อไป)
```

- **ลำดับบูตเท่าเดิม** = ลำดับ import (บันเดลรักษาลำดับ side-effect)
- **พื้นผิวอยู่ในบันเดิลเหมือนกัน**: react/*.jsx โหลดผ่าน runtime เดิม (สร้าง root ผ่าน createRoot) — Next เห็นเป็น side effect ของ boot
- **EVAREL_API** ฉีดตอน build ผ่าน env (NEXT_PUBLIC_EVAREL_API) แทนการแก้ index.html หลัง build
- **service worker**: เจนใหม่จากรายการไฟล์จริงของ build/web-next (สแกน out/ ตอน build) — เลี่ยง drift รายการแคช
- **hash route คงอยู่**: เส้นทาง #/today ยังทำงานเหมือนเดิมในหน้าเดียวที่ Next สร้าง — เป้าหมาย "ทุก route สร้างจาก React" สำเร็จเพราะทุก route เรนเดอร์ผ่าน EvarelComponents ทั้งหมดแล้ว

## ลำดับไบต์

- ไบต์ N1 (โครง): layout.tsx + page.tsx + lib/boot.ts + scripts/build-next.mjs + build/web-next บูตได้จริงบนเบราว์เซอร์ (เปิดหน้า เห็นแอปวิ่ง pageerror 0) — ประตู 9 ชุดของเส้นทางเดิมไม่ขยับ
- ไบต์ N2 (parity รูป): ฉาก 26 บน build/web-next เทียบเดโมจน ALL PASS (แก้ที่แหล่งเดียวกันกับเส้นทางเดิม — ไฟล์เดียวกันสองบิลด์)
- ไบต์ N3 (ออฟไลน์+SW): sw เจนใหม่ + ออฟไลน์ 8 บนเส้นทางใหม่ + sw_upgrade จากรุ่นเก่าผ่าน
- ไบต์ N4 (สลับ): build-web เปลี่ยนโหมด, ประตู 9 ชุดชี้เส้นทางใหม่, ลบ js/m ออกจากเส้นทางเสิร์ฟ, fn_equiv, push develop

## ข้อจำกัดที่รู้ล่วงหน้า

- Turbopack/webpack อาจตัด side-effect import ที่ดูเหมือน pure — ต้องพิสูจน์ด้วยบูตจริง ไม่เชื่อเอกสาร
- ประตู console/ts1c เทียบ snapshot ของเส้นทางเดิม — ตอนสลับต้องเจน snapshot ใหม่ของเส้นทางใหม่
- fn_equiv เป็น known issue มาแต่ไหน (โหลด ES module ใน browser context พัง) — ขั้นนี้พิสูจน์บนบันเดิลเดียวที่แก้ปัญหานั้นเอง (บันเดิลไม่ต้องโหลดแยก)

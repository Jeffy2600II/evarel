# แผนการย้าย Evarel สู่ TypeScript และ Next.js (Static Export)

## 1. หลักการสำคัญและสถาปัตยกรรมระบบ (Core Principles & Standards)
* **บริบทเดิม**: `app.js` มี 19 `MODULE:` markers, 176 top-level names, 10 reassigned globals (`sheetMode`, `drag`, `popBtn`, `D`, `TM`, `focusId`, `CH`, `DETAIL`, `DV`, `swipeX`), 366 template literals
* **ข้อผิดพลาดในอดีต**: การให้ LLM เขียนรีโฟรคเตอร์ล้มเหลว (0/58 ฟังก์ชันตรงกัน) ดังนั้นการย้ายโค้ด *ต้อง* ทำด้วย **Mechanical Script** ตัดข้อความระดับ Top-level Statement เท่านั้น ห้ามพิมพ์ใหม่ด้วยมือหรือ LLM
* **Next.js 15 Baseline**: Static Export (`output: 'export'`) Blank Page First Load JS อยู่ที่ ~102kB
* **โครงสร้างโฟลเดอร์มาตรฐาน (System Module Standard)**:
  ใช้ `systems/<name>/{index.ts, types.ts, service.ts, view.ts, manifest.json}`
  *เปรียบเทียบกับ `assets/js` ของ fanhoard (ดีกว่า 3 ข้อ)*:
  1. **Domain Isolation**: แยกโค้ดตามขอบเขตหน้าที่ (Co-location) ป้องกันไฟล์โตเกินไปแบบ Flat List และจัดการขอบเขตได้ชัดเจน
  2. **Encapsulated State & Bus**: ใช้ `ST` state object จัดการ 10 reassigned globals และ Event Bus แก้ Circular Dependency โดยไม่รั่วไหลเข้า Global Scope
  3. **Strict Boundaries & Manifest**: มี `manifest.json` และ `index.ts` กำหนด Public API ชัดเจน รองรับการเปลี่ยนผ่านเป็น React ทีละโมดูลอย่างปลอดภัย

---

## 2. ขั้นตอนการดำเนินงาน 3 ระยะ (3-Stage Execution Plan)

### Stage 1: JS -> TS Modules (แยกโมดูลตามโครงสร้าง System)

#### Sub-phase 1.1: Mechanical Cut & State Centralization (แบ่งเป็น 4 ชั้น แต่ละชั้นผ่าน 3 ประตูก่อนไปชั้นถัดไป)
* **Scope**: ตัด `app.js` (19 MODULEs, 176 top-level names) ด้วยสคริปต์ที่ตัด "ข้อความต้นฉบับ" ตามขอบเขต statement ระดับบนสุด โดยสคริปต์เพิ่มได้เฉพาะ `export`/`import` และการเขียนซ้ำตัวแปร 10 ตัว (`sheetMode,drag,popBtn,D,TM,focusId,CH,DETAIL,DV,swipeX`) เป็น `ST.x`; ใช้ Event Bus (`core/bus`) ตัดวงจร import
* **ชั้น**: 1.1a `core` (constants, dates, store, state, bus, undo, timer) → 1.1b `services` (schedule, stats, calendar, repo) → 1.1c `ui` (primitives, layers, popover, form) → 1.1d `views` + `actions` + `main`
* **หลักฐานบังคับทุกชั้น (ไม่ใช่คำบอกเล่าของ worker)**: เปรียบเทียบเนื้อฟังก์ชันกับต้นฉบับหลังย้อนการเขียนซ้ำเชิงกลไก = ตรงกัน 100% (รอบก่อนใช้วิธีนี้ผ่าน 58/58) และ storage key ทั้ง 4 ต้องไม่เปลี่ยน (ไม่เช่นนั้นข้อมูลผู้ใช้หาย)
* **Mechanical vs Manual**:
  * *Mechanical*: สคริปต์ตัด/ย้าย ห้าม retype และห้ามให้ LLM พิมพ์โค้ดซ้ำ
  * *Manual*: เขียน `types.ts` (ชนิดข้อมูล) และ `ST` object ตามรายการตัวแปร 10 ตัว
* **3 Gates** (coordinator เป็นผู้รัน ไม่ใช่ worker):
  1. *Pixel Parity Gate*: ต่าง 0 พิกเซลเทียบกับ `design/master-demo-v11.html` ผ่าน `v11parity.mjs` (10 หน้า สว่าง/มืด)
  2. *Tests Gate*: Route 22 + Feature 13 ผ่านทั้งหมด
  3. *Offline Gate*: ออฟไลน์โหลดได้ครบ รวม FullCalendar vendor
* **Rollback Step**: ใช้ `app-v11/` ต้นฉบับ (ไม่แก้ไฟล์เดิมจนกว่า Gate ผ่าน; สร้างสำเนา `app-ts/` คู่ขนาน)
* **SW Cache/Precache List Changes**: เพิ่มไฟล์โมดูลลง `CORE` ทีละชั้น + เพิ่ม `VERSION`

#### Sub-phase 1.2: Route & Boot Integration
* **Scope**: แปลง `js/route.js` และ `js/boot.js` เป็น `systems/router/` และ `systems/boot/` ในรูปแบบ TS
* **Mechanical vs Manual**:
  * *Mechanical*: Script สกัด Event Listener / Hash Handler จาก `route.js`
  * *Manual*: เชื่อมต่อ Lifecycle Boot กับ TS System Modules
* **3 Gates**:
  1. *Pixel Parity Gate*: ต่าง 0 พิกเซลเทียบกับ `design/master-demo-v11.html` ผ่าน `v11parity.mjs`
  2. *Tests Gate*: ผ่าน Route 22 + Feature 13 tests ทั้งหมด
  3. *Offline Gate*: ทดสอบ Offline Mode โหลดได้สมบูรณ์รวมถึง FullCalendar vendor
* **Rollback Step**: สลับการเรียกใช้กลับไปที่ `js/route.js` และ `js/boot.js` เดิม
* **SW Cache/Precache List Changes**: เพิ่มไฟล์ `systems/router/*` และ `systems/boot/*` ลงใน `CORE` (ยังเป็นไฟล์แยก ไม่รวม bundle) + เพิ่ม `VERSION`

---

### Stage 2: Next.js 15 Static Export Wrapper

#### Sub-phase 2.1: Next.js Setup & Template-String Wrapper
* **Scope**: ตั้งค่า Next.js 15 Static Export (`output: 'export'`) นำเสนอเพจผ่าน Client Component Wrapper ที่เรนเดอร์ 366 Template Literals ผ่าน DOM Container
* **Mechanical vs Manual**:
  * *Mechanical*: สคริปต์ย้าย assets, static files และตั้งค่า Next.js build config
  * *Manual*: สร้าง Root `app/page.tsx` ห่อหุ้ม Template-String Renderer
* **3 Gates**:
  1. *Pixel Parity Gate*: ต่าง 0 พิกเซลเทียบกับ `design/master-demo-v11.html` ผ่าน `v11parity.mjs`
  2. *Tests Gate*: ผ่าน Route 22 + Feature 13 tests บน Next.js static output
  3. *Offline Gate*: ทดสอบ static export ในสภาวะ Offline พร้อม Vendor FullCalendar
* **Rollback Step**: เปลี่ยน Build Target หรือกลับไปรันผ่าน Static HTTP Server เดิม (`app-v11/`)
* **SW Cache/Precache List Changes**: ปรับ SW Precache List ให้ครอบคลุม Next.js Static Export build artifacts (`_next/static/...`)

#### Sub-phase 2.2: PWA & Service Worker Integration in Next.js
* **Scope**: ย้าย `sw.js` และ Web Manifest มาอยู่ใน Next.js `public/` folder พร้อมตั้งค่า Service Worker Registration
* **Mechanical vs Manual**:
  * *Mechanical*: สคริปต์คัดลอก `sw.js`, `manifest.webmanifest`, และ `vendor/fullcalendar.min.js`
  * *Manual*: ตั้งค่า Registrator ใน Next.js Entry Layout
* **3 Gates**:
  1. *Pixel Parity Gate*: ต่าง 0 พิกเซลเทียบกับ `design/master-demo-v11.html` ผ่าน `v11parity.mjs`
  2. *Tests Gate*: ผ่าน Route 22 + Feature 13 tests บน Next.js build
  3. *Offline Gate*: ทดสอบ Offline First SW Caching พร้อม FullCalendar vendor บน Next.js
* **Rollback Step**: ถอยกลับไปใช้ `sw.js` ตัวเดิมของ `app-v11/`
* **SW Cache/Precache List Changes**: เปลี่ยน Precache List ใน `sw.js` เป็นรายการไฟล์ static ของ Next.js export (`./`, `./_next/static/...`, `./vendor/fullcalendar.min.js`)

---

### Stage 3: Page-by-Page React Conversion

#### Sub-phase 3.1 (แบ่งเป็น 3.1a today · 3.1b all · 3.1c calendar · 3.1d stats): แปลงทีละแท็บเป็น React
* **ข้อเท็จจริงที่ต้องยอมรับ**: การแปลง template string (ที่มี `${}` ซ้อนและอ้างตัวแปรนอกขอบเขต) เป็น JSX **ไม่ใช่การตัดข้อความ จึงทำเชิงกลไกทั้งหมดไม่ได้** — เป็นงานเขียนด้วยคนทีละหน้า โดย Pixel Parity Gate เป็นตาข่ายนิรภัยที่ตรวจว่าผลเหมือนเดิม
* **Scope ต่อเฟสย่อย**: 1 แท็บ = 1 งานของ worker (implement) + 1 งานตรวจ (coordinator รัน Gate); ห้ามรวมหลายแท็บในงานเดียว
* **Mechanical vs Manual**: *Mechanical* เฉพาะการย้ายไฟล์/สร้างโครง · *Manual* เขียน component ผูก state กับ `ST` และ service
* **3 Gates**:
  1. *Pixel Parity Gate*: 0 พิกเซลทั้งแท็บนั้นและแท็บอื่นที่ยังไม่แปลง (กันผลกระทบข้าม)
  2. *Tests Gate*: Route 22 + Feature 13 ผ่านทั้งหมด
  3. *Offline Gate*: ออฟไลน์ผ่าน รวม FullCalendar (3.1c)
* **Rollback Step**: สลับแท็บนั้นกลับไปใช้ template-string renderer เดิม (ทั้งสองมีอยู่คู่กันจนกว่าจะผ่าน Gate)
* **SW Cache/Precache List Changes**: อัปเดต precache ตาม chunk hash ใหม่ของ Next.js build + เพิ่ม `VERSION`

#### Sub-phase 3.2: Full-Page Layers, Dialogs & Actions Conversion
* **Scope**: เปลี่ยน Layers/Full-pages (`ai`, `settings`) และ Sheet/Dialogs ให้เป็น React Components สมบูรณ์
* **Mechanical vs Manual**:
  * *Mechanical*: สคริปต์แปลง event handlers & dynamic classes เป็น React JSX
  * *Manual*: จัดการ React Portal สำหรับ Layers/Dialogs และปรับแต่ง Animation
* **3 Gates**:
  1. *Pixel Parity Gate*: ต่าง 0 พิกเซลเทียบกับ `design/master-demo-v11.html` ผ่าน `v11parity.mjs`
  2. *Tests Gate*: ผ่าน Route 22 + Feature 13 tests สมบูรณ์ครบทุกกรณี
  3. *Offline Gate*: ทดสอบ Offline Mode ครบถ้วนทุก Feature รวมถึง FullCalendar
* **Rollback Step**: สลับ Layer/Dialog นั้นกลับเป็น Template-String/DOM manipulation
* **SW Cache/Precache List Changes**: อัปเดต Precache List ใน SW ให้ตรงกับ Final Build Output ของ Next.js 15

---

## ข้อจำกัดที่ต้องรู้ก่อนลงมือ
1. **Gate ไม่ใช่คำของ worker**: ผู้รัน Pixel/Route/Feature/Offline คือ coordinator (รอบก่อน worker ที่ทำ verify หมดเวลาหรือรายงานผลที่ภายหลังพบว่าผิด)
2. **Next.js เพิ่มขนาด**: หน้าเปล่า First Load JS 102 kB (วัดจริง) ต้องวัดซ้ำกับแอปจริงและยืนยันว่าแคช service worker ชดเชยได้
3. **ลำดับเฟสของ Master**: ฐานข้อมูล+ล็อกอิน มาก่อนไฟล์นี้ — Stage 1 ต้องเริ่มจากโค้ดที่ผ่าน Repo adapter เดิม ไม่ใช่เขียน data layer ใหม่

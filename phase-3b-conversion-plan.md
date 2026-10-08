# เฟส 3B: แผนแปลงเดโมของ Master เป็นแอปจริง

> ต้นแบบ: `design/master-demo-v2.html` (ไฟล์เดียว 361 บรรทัด ใช้ localStorage)
> เป้า: ได้แอปจริง (Cloudflare Pages + Worker + Supabase) โดยหน้าตาเหมือนเดโมทุกพิกเซล และ Master เปลี่ยนดีไซน์ได้ที่ `tokens.css` ไฟล์เดียว

## 1. สิ่งที่เดโมทำถูกแล้ว (เก็บไว้ทั้งหมด)

1. **Token ชุดเดียว** (สี ระยะ 8px มุมโค้ง เงา ฟอนต์ IBM Plex Sans Thai) อยู่บนสุดของ CSS รองรับโหมดมืดอัตโนมัติ
2. **คลาสบอกหน้าที่** (`ev-card`, `ev-btn-primary`, `ev-chip`) ตรงกับสัญญาความยืดหยุ่นข้อ 3
3. **สถานะผ่าน data-attribute** (`data-state`, `data-tone`, `aria-pressed`) ไม่ฝังสไตล์ใน JS
4. **แยกชั้นชัด**: Data → Service → Feature(views) → UI primitives
5. **จัดการเหตุการณ์ผ่าน `data-act`** จุดเดียว (event delegation) ง่ายต่อการเพิ่มฟีเจอร์
6. **มี skeleton / empty state / a11y** (aria-label, role) ครบ
7. **AI ใช้การ์ดยืนยันก่อนเพิ่ม** ตรงแนวคิดกัน AI ทำผิด

## 2. จุดที่ต่างจากแผนเดิมของผม (ใช้ของ Master เป็นหลัก)

| เรื่อง | แผนเดิมของผม (เฟส 1) | เดโมของ Master | ตัดสินใจ |
|---|---|---|---|
| โมเดลข้อมูล | 7 ตาราง (tasks, routines, schedule...) | **1 ตาราง `items`** 4 ชนิด + กฎซ้ำ + log | ใช้ของ Master (ยืดหยุ่นกว่า เพิ่มชนิดใหม่ไม่ต้องสร้างตาราง) |
| นำทาง | 5 แท็บ + FAB | **4 แท็บ** (วันนี้/รายการ/ตารางเรียน/สถิติ) + FAB | ใช้ของ Master |
| AI/ตั้งค่า/เพิ่ม | หน้าแยก | **Bottom sheet** | ใช้ของ Master |
| การนอน | หน้าแยก | ยังไม่มี (เป็น habit "นอนก่อน 22:00") | ใช้ habit ได้เลย ไม่ต้องหน้าแยก |
| งาน | หน้าแยก | รวมอยู่ใน "รายการ" + กรองตามชนิด | ใช้ของ Master |

## 3. ช่องว่างระหว่างเดโมกับของจริง (ต้องทำ)

1. **เก็บข้อมูลจริง**: ตอนนี้ localStorage ต้องย้ายไป Supabase (ข้อมูลหาย ถ้าล้างแคช)
2. **AI จริง**: ตอนนี้ mock ด้วย string match ต้องต่อ Groq function calling
3. **แจ้งเตือนจริง**: ตอนนี้แค่ขอสิทธิ์ ต้องมี Cron ฝั่ง Worker ส่ง Web Push ตามเวลา `time` + `rem` ของแต่ละ item
4. **PWA**: ต้องมี manifest + service worker + ไอคอน ให้ติดตั้งลงมือถือได้
5. **ล็อกอิน**: บัญชีเดียวของ Master (Supabase Auth)
6. **เขตเวลา**: เดโมใช้เวลาเครื่อง ต้องล็อก Asia/Bangkok ฝั่ง Worker
7. **บั๊ก/ข้อควรระวังที่เห็นในเดโม** (ดูหัวข้อ 4)

## 4. จุดที่ต้องระวังในโค้ดเดโม (รายงานตามจริง)

1. `ev-chip[data-state="late|soon"]` ใช้สีฮาร์ดโค้ด (#FDECEC, #FFF3E0) ไม่ผ่าน token และไม่ปรับตามโหมดมืด ควรย้ายเป็น `--c-danger-soft`, `--c-warn-soft`
2. `ev-card[data-tone="accent"]` มี `#7A5CFF` ฮาร์ดโค้ดในกราเดียนต์ ควรเป็น `--c-accent-2`
3. สีเงา FAB `rgba(75,47,245,.35)` ผูกกับสีเน้นเดิม ถ้าเปลี่ยน `--c-accent` เงาไม่เปลี่ยนตาม
4. หลายจุดมี `style="..."` แทรกใน HTML (เช่นในแถวรายการ ปุ่มลบ) ขัดกับกฎ "ไม่ฝังสไตล์ใน JS" ควรเป็นคลาสหรือ data-attribute
5. ข้อความที่ผู้ใช้พิมพ์ (ชื่อรายการ) ถูกใส่เข้า `innerHTML` ตรงๆ ในหลายที่ มีความเสี่ยง XSS ต้องใช้ฟังก์ชัน escape กลาง
6. `ev-sub`/`ev-chip` ขนาด 12px อาจเล็กไปสำหรับ a11y ควรทดสอบบน Android จริง
7. `id: Date.now()` ใช้เป็นรหัส ตอนต่อ Supabase ต้องเปลี่ยนเป็น uuid จากฐานข้อมูล
8. ไม่มีการจัดการ "เลยกำหนด" ของ task ชัดเจน (chip late/soon มีสไตล์แต่ยังไม่พบจุดที่ใช้)

## 5. โครงโฟลเดอร์เป้าหมาย (แยกจากไฟล์เดียว)

```
app/
  index.html            # โครง + ลิงก์ CSS/JS เท่านั้น
  manifest.webmanifest
  sw.js                 # service worker (แคช + รับ push)
  styles/
    tokens.css          # ค่าดีไซน์ทั้งหมด (Master แก้ที่นี่ที่เดียว)
    components.css      # .ev-* ทุกตัว อ้างจาก tokens เท่านั้น
    layout.css
  js/
    store.js            # Data layer: โหลด/บันทึก (ตอนนี้ Supabase)
    recurrence.js       # occursOn, streak, rate (ตรรกะล้วน ทดสอบได้)
    views/              # today.js all.js schedule.js stats.js
    sheets/             # add.js ai.js settings.js
    ui.js               # icon, empty, skeleton, escape
    main.js             # render + event delegation (data-act)
worker/
  src/index.js          # API: /items /log /ai /push
  src/cron.js           # ตัวส่งแจ้งเตือนตามเวลา
```

## 6. ลำดับงาน (ทำทีละก้าว ทดสอบทีละก้าว)

| ขั้น | งาน | เกณฑ์ผ่าน |
|---|---|---|
| A | แยกไฟล์ + ย้ายเดโมเป็นโครงข้างบน หน้าตาเหมือนเดิม 100% ยังใช้ localStorage | เปิดแล้วเหมือนเดโม ทุกปุ่มทำงาน |
| B | แก้ข้อควรระวังข้อ 1-5 (token สี, escape, ลบ inline style) | ไม่มีสีฮาร์ดโค้ด ไม่มี inline style |
| C | PWA: manifest + sw + ไอคอน | ติดตั้งลงหน้าจอหลัก Android ได้ |
| D | Supabase: ตาราง `items`, `item_logs` + Auth + sync | รีเฟรช/ล้างแคชแล้วข้อมูลยังอยู่ |
| E | AI จริง: Groq function calling (add/update/delete/log) + การ์ดยืนยัน | พิมพ์ "เพิ่มงาน..." ได้ item จริงในฐานข้อมูล |
| F | แจ้งเตือนจริง: Cron Worker + Web Push ตาม `time`/`rem` + สรุปเช้า | เด้งตรงเวลาบนเครื่องจริง |

## 7. โครงตารางฐานข้อมูลใหม่ (แทน 7 ตารางเดิม)

- `items`: id(uuid), user_id, type, title, subject, start, end, time, time_end, rem(int[]), repeat(jsonb), track, target, unit_name, created_at
- `item_logs`: item_id, date, value (คีย์รวม item_id+date) แทน `log` ในเดโม
- `push_subscriptions`: ใช้ตารางเดิมจาก PoC
- Time-series (Tiger Cloud): ใช้เมื่อสถิติหนักขึ้นจริง เฟสแรกใช้ `item_logs` ใน Supabase ก่อน (ฟรีเทียร์พอ)

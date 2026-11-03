# Ordivel — Brand Assets (ชุดล็อโก้ทางการ)

แหล่งที่มา: `ordivel-1-ordinal-full.zip` (ชุดเต็มแบบ **1-ordinal** จาก LOGO FAMILY v11 · PREMIUM FINISH ที่นักออกแบบส่งมอบ — ปรับปรุงชุดล่าสุด โครงสัญลักษณ์เดิม 100% อัปเกรดผิว/วัสดุ/ขอบ)
SHA-256 ของ zip ต้นฉบับ: `ca421f121d4f4d6936d395e532c7adafa355c085059d3cdfa7e447c261ae7f8e`

## กติกาเหล็ก (จากนักออกแบบ — ห้ามละเมิด)

1. **ไฟล์ทุกไฟล์ในโฟลเดอร์นี้ + ไฟล์ zip คือต้นฉบับ ห้ามแก้ไขเด็ดขาด** — ห้ามย่อ ห้าม recolor ห้าม crop ห้าม outline ใหม่ ถ้าจะใช้ ให้ดึงไฟล์ไปใช้ตรง ๆ
2. **สัญลักษณ์ = สัญลักษณ์ ชื่อ = ชื่อ** — ทุกล็อกอัพสะกดคำว่า Ordivel ครบทุกตัวอักษร ห้ามใช้สัญลักษณ์แทนตัว O
3. DNA ของสัญลักษณ์: ตัว O = วงวันของคุณ · จุด "รายการถัดไป" (ลูกปัดมุก) ที่ 25° · ช่องเปล่าที่ 162.5° · สองตำแหน่งห่างกัน 137.5° (มุมทอง)

## โครงสร้าง

```
brand/
  ordivel-1-ordinal-full.zip   ← ต้นฉบับสำรอง (ห้ามแก้)
  1-ordinal/                   ← แตกไฟล์ตรงจาก zip (ห้ามแก้)
    README.txt                 ← โน้ตของนักออกแบบ (กฎการใช้ชุดนี้)
    favicon.ico                ← 16+32+48 ในไฟล์เดียว
    site.webmanifest           ← เว็บมานิเฟสต์ของชุดฟาวิคอน (จากนักออกแบบ)
    svg/                       ← เวกเตอร์ต้นฉบับ (mark/appicon/circle/lockup/wordmark + favicon + mask-icon + construction + detail-zoom)
    png/                       ← PNG ขนาดใช้งานจริง (1024 box + favicon 16/32/48/64/128/256 + apple-touch-icon-180 + icon-192/512 + favicon-preview)
```

## ตำแหน่งที่แอปใช้ (สำเนา byte-exact ผ่าน `cmp` ทุกไฟล์ — ไม่มีการแก้ไข)

| ไฟล์ในแอป (web/classic/icons/) | ที่มาจาก brand/1-ordinal/ | ใช้ที่ไหน |
| --- | --- | --- |
| `favicon.ico` | `favicon.ico` | ลิงก์ฟาวิคอนใน head (index.html + layout.tsx) |
| `favicon.svg` | `svg/favicon.svg` | ลิงก์ฟาวิคอน SVG (เบราว์เซอร์ยุคใหม่ เลือกใช้ก่อน PNG) |
| `favicon-16/32/48/64/128/256.png` | `png/favicon-*.png` | ลิงก์ฟาวิคอน PNG + ไอคอน/ป้ายของ Web Push |
| `apple-touch-icon-180.png` | `png/apple-touch-icon-180.png` | apple-touch-icon (ขนาดมาตรฐาน iOS 180×180) |
| `appicon-violet-1024.png` | `png/appicon-violet-1024.png` | manifest `purpose: any` |
| `circle-violet-1024.png` | `png/circle-violet-1024.png` | manifest `purpose: maskable` |
| `mark-gradient.svg` | `svg/mark-gradient.svg` | สัญลักษณ์หน้า auth (EV_MARK) + สแปลชบูต (#ev-boot) |

## วิธีใช้งานในโค้ด

- ห้ามเขียน SVG ของสัญลักษณ์ขึ้นใหม่เอง และห้าม inline สำเนาที่แก้ไข — ให้อ้างผ่านไฟล์ใน `icons/` (ซึ่ง build คัดลอกจากที่นี่เป็นสำเนาตรง)
- ถ้าต้องการขนาด/แบบอื่น ๆ (lockup, wordmark, night/paper) ให้คัดลอกไฟล์ต้นฉบับออกมาใช้ตรง ๆ เหมือนตารางข้างบน แล้วเพิ่มแถวในตารางนี้
- อัปเดตครั้งใหญ่ครั้งต่อไปที่แตะโลโก้: ยืนยันด้วย `cmp` กับไฟล์ใน `brand/1-ordinal/` ก่อนคอมมิตเสมอ

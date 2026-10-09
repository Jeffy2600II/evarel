# Evarel System Logic Document (เอกสารตรรกะระบบ Evarel)

เอกสารฉบับนี้รวบรวมตรรกะระบบ (System Logic), โครงสร้างข้อมูล (Data Model), กฎโดเมน (Domain Rules), สถาปัตยกรรม (Architecture), และแนวทางการพัฒนาต่อสำหรับปัญญาประดิษฐ์ (AI Agent) และวิศวกรซอฟต์แวร์ เพื่อความเข้าใจที่ตรงกันและป้องกันการพังทลายของพฤติกรรมเดิม (Regression)

---

## 1. Product Purpose & Constraints (วัตถุประสงค์และข้อจำกัดของผลิตภัณฑ์)

- **วัตถุประสงค์หลัก**: Evarel เป็น Progressive Web App (PWA) สำหรับการติดตามชีวิตประจำวัน สร้างนิสัย (Habit), จัดการงาน (Task), บันทึกกิจกรรม (Event), และตารางเรียน (Class) ในแอปเดียว ออกแบบเน้นความเร็ว โหลดทันที (Instant Load) และทำงานออฟไลน์ได้ 100% (Local-First)
- **ข้อจำกัดสถาปัตยกรรมต้นทุนศูนย์ (Zero-Cost Stack Constraints)**:
  - **Client-side PWA**: ทำงานบน Android PWA / Browser เป็นหลัก ประมวลผลและเก็บข้อมูลใน `localStorage`
  - **Hosting & Compute**: Cloudflare Pages / Workers (Free tier)
  - **Database & Storage (Planned)**: Supabase PostgreSQL (Free tier) + Tiger Cloud (D1/vector/cron)
  - **LLM / AI Model**: Groq / OpenRouter API (ใช้ Free quota/low-cost)
  - **Long-term Memory (Under Consideration)**: memorylake.ai สำหรับจัดเก็บความจำระยะยาวของ AI
- **กำหนดเวลาส่งมอบ (Deadline)**: 2 พฤศจิกายน 2026 (2 Nov 2026)
- **ดีไซน์มาตรฐานหลัก (Canonical Design)**: ต้นแบบการออกแบบอ้างอิงจาก `design/master-demo-v2.html` และ `styles/tokens.css` **ห้ามปรับเปลี่ยนหน้าตา โทนสี หรือ Layout โดยเด็ดขาด** เว้นแต่ได้รับคำสั่งโดยตรงจาก Master

---

## 2. Data Model (โครงสร้างข้อมูล)

Evarel ใช้โครงสร้างข้อมูลแบบ Single Store โดยเก็บรายการทั้งหมดไว้ในอาร์เรย์ `items` เดียวกัน ภายใต้ LocalStorage key `evarel-demo-v2` (`STORE_KEY`)

### 2.1 Item Types (4 ประเภทรายการ)
1. `habit` (นิสัย): รายการที่ทำซ้ำสม่ำเสมอ รองรับการติดตาม 3 โหมด (check, count, timer)
2. `task` (งาน): รายการที่ต้องทำ มีวันกำหนดส่ง (`start`) รองรับการติ๊กเสร็จ (`check`)
3. `event` (กิจกรรม): นัดหมายหรือกิจกรรมที่มีเวลาเริ่มต้น-สิ้นสุด
4. `class` (วิชาเรียน): ตารางเรียนประจำสัปดาห์ ผูกกับวันในสัปดาห์ (`days`)

### 2.2 Table of Fields & Data Types

| Field Name | Type | Allowed Values / Format | Description & Rules |
|---|---|---|---|
| `id` | `number` | Unix timestamp (e.g. `Date.now()`) | ID ประจำรายการ ใช้เป็น Key ในการอ้างอิง |
| `type` | `string` | `'habit'` \| `'task'` \| `'event'` \| `'class'` | ประเภทของรายการ |
| `title` | `string` | ข้อความ (Non-empty) | ชื่อรายการ (ตัด whitespace ด้วย `.trim()`) |
| `subject` | `string` | ข้อความ (Optional) | ชื่อวิชาหรือหมวดหมู่ (ใช้ใน class/task) |
| `start` | `string` | `'YYYY-MM-DD'` | วันเริ่มต้น หรือวันกำหนดส่งงาน |
| `end` | `string` | `'YYYY-MM-DD'` \| `''` | วันสิ้นสุดการทำซ้ำ (ถ้ามี) |
| `time` | `string` | `'HH:mm'` \| `''` | เวลาเริ่มต้น (e.g. `'09:00'`) |
| `timeEnd` | `string` | `'HH:mm'` \| `''` | เวลาสิ้นสุด (e.g. `'10:00'`) |
| `track` | `string` | `'check'` \| `'count'` \| `'timer'` \| `'none'` | โหมดการบันทึก (habit=check/count/timer, task=check, event/class=none) |
| `target` | `number` | `integer >= 1` (default `1`) | เป้าหมายต่อวัน (สำหรับ count = จำนวนแก้ว/ครั้ง, timer = จำนวนนาที) |
| `unitName` | `string` | ข้อความ (e.g. `'แก้ว'`, `'นาที'`) | หน่วยวัดสำหรับโหมด count/timer |
| `repeat` | `object` | `{ unit, every, days }` | กฎการทำซ้ำ (ดูหัวข้อ 2.3) |
| `reminders` | `array` | Array of Reminder Objects | รายการการแจ้งเตือน (สูงสุด 8 รายการ) |
| `log` | `object` | `{ [dateStr]: number }` | ประวัติการทำ (`dateStr` = `'YYYY-MM-DD'`, value = จำนวนที่บันทึก) |
| `skips` | `object` | `{ [dateStr]: boolean }` | ประวัติการข้าม (`dateStr` = `'YYYY-MM-DD'`, value = `true`) |

### 2.3 Repeat Rules Structure (`{ unit, every, days }`)
- `unit`: `'none'` (ครั้งเดียว), `'day'` (ทุกวัน), `'week'` (ทุกสัปดาห์), `'month'` (ทุกเดือน), `'year'` (ทุกปี)
- `every`: `integer >= 1` (ความถี่ เช่น ทุกๆ 2 วัน หรือ ทุกๆ 1 สัปดาห์)
- `days`: `Array<number>` (วันในสัปดาห์ 0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์) ใช้เมื่อ `unit === 'week'` หรือประเภท `'class'`

### 2.4 Log vs Skips
- `log`: เก็บบันทึกความก้าวหน้า เช่น `log['2026-10-09'] = 8`
- `skips`: เก็บสถานะข้าม เช่น `skips['2026-10-09'] = true` การข้ามจะไม่นับว่าทำเสร็จ แต่จะไม่ทำให้ Streak ขาด

### 2.5 Reminders Kinds & Validation Limits
การตั้งเตือนถูกคัดกรองและจัดระเบียบผ่านฟังก์ชัน `cleanReminders(list)` โดยจำกัดสูงสุด **8 รายการต่อ item (`MAX_REMINDERS = 8`)**:
1. `at`: เตือน ณ เวลาที่กำหนด เช่น `{ k: 'at', t: '09:00' }` (`HHMM` regex validation)
2. `before`: เตือนล่วงหน้า M นาที ก่อนเวลา `time` ของรายการ เช่น `{ k: 'before', m: 30 }` (`0 <= m <= 10080` นาที หรือไม่เกิน 7 วัน)
3. `day`: เตือนก่อนวันเริ่ม D วัน ณ เวลา T เช่น `{ k: 'day', d: 1, t: '18:00' }` (`1 <= d <= 30` วัน, `HHMM` regex)

### 2.6 LocalStorage Keys & Normalization Rules
- **Storage Keys**:
  - Main Store: `evarel-demo-v2` (`STORE_KEY`)
  - Active Timer: `evarel-timer-v1` (`TIMER_KEY`)
  - AI Chats: `evarel-chats-v1` (`CHAT_KEY`)
- **Normalization (`normalize(state)`)**:
  เมื่อโหลดข้อมูลจาก `localStorage` หรือนำเข้า JSON ระบบจะผ่าน `normalize()` เพื่อเติมค่าเริ่มต้นและซ่อมแซมโครงสร้าง:
  - แปลง `items` ให้อยู่ในอาร์เรย์เสมอ
  - เติมฟิลด์พื้นฐานที่ขาดด้วย `mkBase()`
  - ย้ายข้อมูลแจ้งเตือนรูปแบบเก่า (`it.rem`) เข้าสู่ `reminders` ด้วย `cleanReminders()`
  - ตรวจสอบ `repeat.every >= 1` และ `target >= 1`

---

## 3. Domain Logic ("If User Does X, System Does Y" Tables)

### 3.1 OccursOn Rules (กฎการเกิดขึ้นของรายการบนวันที่กำหนด)
ฟังก์ชัน `occursOn(it, ds)` คืนค่า `true` เมื่อรายการ `it` เกิดขึ้นในวันที่ `ds` (`'YYYY-MM-DD'`):

| Repeat Unit | Conditions for `occursOn(it, ds) == true` |
|---|---|
| All | `ds >= it.start` และ (ถ้ามี `it.end`) `ds <= it.end` |
| `'none'` | `ds === it.start` |
| `'day'` | `(ds - start_date_in_days) % repeat.every === 0` |
| `'week'` | `repeat.days.includes(day_of_week)` และ `weeks_diff % repeat.every === 0` |
| `'month'` | `day_of_month === start_day_of_month` และ `months_diff % repeat.every === 0` |

### 3.2 Done, Target, & Track Modes

| Track Mode | Target Value | Completion Condition (`isDone(it, ds)`) | Action on Click / Increment |
|---|---|---|---|
| `check` | `1` | `val(it, ds) >= 1` | `check`: สลับระหว่าง `0` และ `1` |
| `count` | `it.target` (e.g. 8 แก้ว) | `val(it, ds) >= it.target` | `inc`/`dec`: เพิ่ม/ลดครั้งละ `1` |
| `timer` | `it.target` (นาที) | `val(it, ds) >= it.target` | `tstart`/`tpause`/`tresume`/`tstop`: จับเวลาสะสมนาที |

### 3.3 Streak & Rate Calculations
- **Streak Calculation (`streak(it)`)**:
  - ย้อนดูย้อนหลังสูงสุด 365 วัน (`STREAK_LOOKBACK = 365`) ตั้งแต่วันนี้
  - ข้ามวันที่ `occursOn == false` หรือถูกข้าม (`skipped == true`)
  - ถ้านับพบ `isDone == true` จะบวกค่าเพิ่ม หากพบวันก่อนหน้าที่ต้องทำแต่ทำไม่เสร็จ จะหยุดคำนวณทันที
- **Rate Calculation (`rate(it)`)**:
  - คำนวณช่วง 30 วันล่าสุด (`STAT_DAYS = 30`) โดยนับเฉพาะวันที่ `ds >= it.start` และ `occursOn == true` และไม่ถูกข้าม
  - สูตร: `Rate (%) = Math.round(100 * count_done / count_total_expected)`

### 3.4 Overdue (งานเลยกำหนด)
- งานประเภท `task` ที่ `start < TODAY` และยังทำไม่เสร็จ (`val(it, start) < 1`) จะถูกจัดอยู่ในสถานะ Overdue และแสดงปุ่ม "ติ๊กย้อนหลัง" (`checkdue`)

### 3.5 Skip / Unskip Logic
- **Skip (`m-skip`)**: ตั้งค่า `it.skips[ds] = true`
- **Unskip (`m-unskip`)**: ลบ `it.skips[ds]` ออก
- การข้ามจะไม่ถูกนับเป็นความล้มเหลว และไม่ทำให้ Streak ขาด

### 3.6 Undo Service (ระบบยกเลิกการกระทำ)
- **พารามิเตอร์**: สแต็คเก็บประวัติสูงสุด **20 รายการ (`MAX_UNDO = 20`)**, ระยะเวลาแสดง Toast ยกเลิก **5 วินาที (`UNDO_MS = 5000`)**
- **การทำงาน**:
```
  [User Action] ---> pushUndo({ label, restore }) ---> Show Toast (5s)
                           |
                     (Click "เลิกทำ")
                           |
                           v
                       doUndo() ---> Execution of restore() ---> Re-render UI
```

### 3.7 Timer Service (ระบบจับเวลา)
- **การจัดเก็บข้อมูล**: ใช้ `TIMER_KEY = 'evarel-timer-v1'` เก็บใน `localStorage` โครงสร้าง: `{ id, date, startedAt, acc }`
- **ความทนทาน (Durability)**: ใช้ timestamp (`startedAt = Date.now()`) บันทึกเวลาเริ่มต้นจริง จึงสามารถรอดจากการปิดหน้าจอ Refresh หรือเปิดแอปใหม่ได้
- **กฎ Single Active Timer**: จับเวลาได้ทีละรายการเท่านั้น หากสั่ง `tstart` รายการใหม่ขณะมี Timer เดิมทำงานอยู่ ระบบจะเรียก `commitTimer()` เพื่อปิดและบันทึกเวลาของรายการเดิมก่อนทันที
- **การบันทึก (`commitTimer`)**: คำนวณเวลารวมเป็นนาทีเต็ม หากน้อยกว่า 1 นาทีจะไม่บันทึก และการปรับเปลี่ยนเวลาแบบแมนนวลจะทำครั้งละ 5 นาที (`TIMER_STEP = 5`)

### 3.8 Reminder Computation (`remindersFor(ds, { includeDone })`)
ฟังก์ชันประมวลผลการแจ้งเตือนสำหรับวันที่ `ds`:
- ตรวจสอบรายการทั้งหมดในระบบที่เกิดขึ้นในวัน `ds` และไม่ถูกข้าม
- สำหรับการแจ้งเตือนชนิด `at`: คำนวณเวลา `HH:mm`
- สำหรับชนิด `before`: คำนวณ `toMin(it.time) - r.m`
- สำหรับชนิด `day`: ตรวจสอบวันส่งย้อนหลัง `d` วัน และใช้วันเวลา `t` ที่กำหนด
- เรียงลำดับตามเวลาแจ้งเตือน (`at`) จากเช้าไปเย็น

### 3.9 AI Mock Flow & Intent Parsing
- **การตรวจจับเจตนา (Intent Parsing)**:
  - รับข้อความเช่น "เพิ่มงาน การบ้านอังกฤษ พรุ่งนี้" หรือ "เพิ่มงาน ซักผ้า วันศุกร์"
  - แยกข้อความวันที่ "วันนี้", "พรุ่งนี้", "มะรืนนี้", "วัน(อาทิตย์-เสาร์)" แปลงเป็น YYYY-MM-DD
  - คืนค่าเป็นการ์ดยืนยัน (`kind: 'confirm-task'`) พร้อมปุ่ม "เพิ่มงาน" (`ai-ok`) และ "ยกเลิก" (`ai-no`)
- **Chat Store (`ChatStore`)**:
  - เก็บประวัติใน `CHAT_KEY = 'evarel-chats-v1'` สูงสุด 200 แชท (`MAX_CHATS = 200`) และ 400 ข้อความต่อแชท (`MAX_MSGS = 400`)
- **Memory Provider Seam**:
  - วางโครงสร้าง `MemoryProvider` ลอยไว้ (`{ ready: false, recall(), remember() }`) เพื่อรอเชื่อมต่อกับ MemoryLake.ai ในอนาคต

### 3.10 Backup & Restore Rules
- **การส่งออก (`export`)**: สร้างไฟล์ JSON โครงสร้าง `{ app: 'evarel', version: 1, exportedAt: ISOString, data: S }`
- **การนำเข้า (`import`)**:
  - ตรวจสอบขนาดไฟล์ไม่เกิน 5MB (`5e6` bytes)
  - ตรวจสอบโครงสร้าง `j.app === 'evarel'` และ `Array.isArray(j.data.items)`
  - ใช้ `normalize()` กับข้อมูลที่นำเข้า แล้วบันทึกลง `localStorage` พร้อมสร้าง Undo Action ให้ยกเลิกการนำเข้าได้

### 3.11 Service Worker Cache Strategy
- **VERSION**: `evarel-v13` (อัปเดตแคชทุกครั้งที่มีการเปลี่ยนเวอร์ชัน)
- **ยุทธศาสตร์ (Strategy)**: Stale-While-Revalidate
```
  [Fetch Request] ---> Cache Match? ---> (YES) ---> Return Cached Response Immediately
                             |
                             +--------------------> (Background Network Fetch)
                                                          |
                                                    Compare Text Body
                                                          |
                                            Changed? ---> Post Message: 'update-ready'
```

### 3.12 Notifications State Machine

```
  [Notification Check]
          |
  +-------+-------+--------------------+
  |               |                    |
[Not Supported] [Permission: default] [Permission: granted] / [denied]
  |               |                    |
  v               v                    v
Toast: "ไม่รองรับ" Show "อนุญาต" Button   Show Status Chip / Guide to Settings
```

---

## 4. Screens & navigation

### 4.1 Routes (hash routing)
เลือกใช้ **hash route** เพราะ Cloudflare Pages/Workers static hosting ไม่ต้องตั้ง rewrite ฝั่งเซิร์ฟเวอร์ และเปิด `index.html` ตรงๆ ได้

| Route | หน้า | หมายเหตุ |
|---|---|---|
| `#/today` | วันนี้ | หน้าเริ่มต้น; hash ที่ไม่รู้จักหรือว่าง จะถูก `replaceState` เป็น `#/today` |
| `#/all` | รายการ | แยกตามประเภท |
| `#/schedule` | ตารางเรียน | แสดงครั้งถัดไปของแต่ละวันในสัปดาห์ |
| `#/stats` | สถิติ | Rate / Streak / Overdue |
| `#/ai` | ผู้ช่วย AI | เต็มจอ; ออกจาก route นี้จะปิดชั้น AI |
| `#/settings` | ตั้งค่า | เป็นหน้าเต็ม (เดิมเป็น bottom sheet) |

- รายการ route อยู่ที่ `ROUTES` และชื่อหน้าอยู่ที่ `PAGE_TITLES` ใน `js/router.js`; `document.title` เปลี่ยนตามหน้า, แถบนำทางล่างเป็นลิงก์ `<a href="#/x" data-tab="x">` และ `aria-current` ตาม route
- ฟอร์มเพิ่ม/แก้ไข ยังเป็น **bottom sheet** ซ้อนบนหน้าปัจจุบัน ไม่มี URL ของตัวเอง (ตัดสินใจโดย Master)
- ฟังก์ชันหลัก: `parseHash()` อ่าน hash, `navigate(route)` เปลี่ยน hash, `handleRoute()` ปิด/เปิดชั้น AI แล้วเรียก `render` ผ่าน bus, `navBack()` ย้อนกลับ

### 4.2 ปุ่มย้อนกลับ (Android Back / `history.back()`)
ชั้นซ้อน (layer) ได้แก่ `sheet`, `menu` (เมนูสามจุด), `focus` (หน้าจับเวลา) แต่ละชั้นเมื่อเปิดจะเรียก `pushLayerState(layer)` ซึ่ง push ประวัติ 1 รายการ (ถ้ามีชั้นเปิดอยู่แล้วจะ `replaceState` แทน ไม่ push เพิ่ม)

```
กดย้อนกลับ
  |-- มีชั้นเปิดอยู่ (sheet/menu/focus)?  -> ปิดชั้นนั้น, route ไม่เปลี่ยน
  |-- ไม่มี -> ย้อนไปหน้าก่อนหน้า (history.back)
  '-- ไม่มีหน้าก่อนหน้าในแอป -> replaceState เป็น #/today (ไม่ออกจากแอป)
```

กติกาที่ต้องรักษา (เคยพังจริงและแก้แล้ว):
1. ปิดชั้นด้วยปุ่ม UI จะเรียก `history.back()` **เฉพาะเมื่อ `history.state.layer` ตรงกับชั้นนั้น** (กันถอยซ้ำ)
2. เมื่อชั้นหนึ่ง "ส่งต่อ" ให้ชั้นใหม่ (เมนู -> ฟอร์มแก้ไข / จับเวลา / หน้า AI) ต้องปิดเมนูแบบเงียบ `closeMenu(true)` ห้ามเรียก `history.back()` เพราะ `popstate` จะมาถึง **หลัง** ชั้นใหม่เปิดแล้วและปิดชั้นใหม่ทิ้ง
3. การ์ดยืนยันของ AI (`ai-ok`) ต้อง `history.replaceState` กลับเป็นหน้าเดิมก่อน `closeAI()` ไม่เช่นนั้นปิดฟอร์มแล้วหน้า `#/ai` เด้งกลับมาเอง
4. `Escape` ปิดชั้นบนสุดตามลำดับ เมนู -> AI (หรือลิ้นชักก่อน) -> จับเวลา -> sheet และบนหน้า `#/settings` จะเรียก `navBack()`

### 4.3 ACTIONS Dictionary (ดรรชนีการกระทำทั้งหมดในระบบ)

| Action Name | Description & Behavior |
|---|---|
| `check` | ติ๊กทำแล้ว/ยกเลิก รายการแบบ `check` ในวันที่เลือก (ห้ามติ๊กล่วงหน้า) |
| `checkdue` | ติ๊กทำแล้วสำหรับงานที่เลยกำหนด (`task overdue`) |
| `export` | ดาวน์โหลดไฟล์สำรองข้อมูล JSON (`evarel-backup-YYYY-MM-DD.json`) |
| `import` | เปิดหน้าต่างเลือกไฟล์ JSON เพื่อนำเข้าข้อมูล |
| `inc` / `dec` | เพิ่ม / ลด ค่าบันทึกในรายการแบบ `count` ครั้งละ 1 |
| `tstart` | เริ่มจับเวลาสำหรับรายการ `timer` (หากมีตัวเดิมจะสั่ง `commitTimer` ก่อน) |
| `tpause` | หยุดจับเวลาชั่วคราว สะสมเวลาไว้ใน `TIMER.acc` |
| `tresume` | จับเวลาต่อจากเวลาที่หยุดไว้ |
| `tstop` | จบการจับเวลา บันทึกนาทีลงใน log ผ่าน `commitTimer()` |
| `tdec` | ลดเวลาสะสมลงครั้งละ 5 นาที (`TIMER_STEP = 5`) |
| `undo` | เรียกฟังก์ชัน `doUndo()` ย้อนกลับการกระทำล่าสุด |
| `menu` | เปิด Dropdown เมนูสามจุดสำหรับรายการที่เลือก |
| `m-edit` | เปิดฟอร์มแก้ไขรายการ (`openEdit`) |
| `m-timeropen` | เปิดหน้าจับเวลา Focus Mode |
| `m-reset` | ล้างบันทึกประวัติการทำของวันที่เลือก |
| `m-skip` | ทำเครื่องหมาย "ข้าม" สำหรับรายการในวันที่เลือก |
| `m-unskip` | ยกเลิกการข้ามรายการ |
| `m-dup` | ทำสำเนา (Duplicate) รายการ |
| `m-del` | ลบรายการออก (ผ่าน `ACTIONS.del`) |
| `timeropen` | เปิดหน้า Focus Mode เต็มจอ |
| `focusclose` | ปิดหน้า Focus Mode |
| `tcancel` | ยกเลิกการจับเวลารอบปัจจุบันโดยไม่บันทึกลงประวัติ |
| `radd` | เพิ่มรายการแจ้งเตือนชนิด `at` ลงในแบบร่างฟอร์ม |
| `rrem` | ลบรายการแจ้งเตือนตามดรรชนีที่เลือก |
| `rmode` | เปลี่ยนโหมดการตั้งแจ้งเตือนในฟอร์ม |
| `rcustom` | เพิ่มรายการแจ้งเตือนชนิด `before` (กำหนดนาทีล่วงหน้า) |
| `rday` | เพิ่มรายการแจ้งเตือนชนิด `day` (กำหนดวันล่วงหน้า) |
| `rquick` | สลับตั้งเตือนด่วน (0, 5, 10, 30 นาที) |
| `date` / `type` / `cday` | เปลี่ยนวันที่เลือก / ประเภทที่เลือก / วันตารางเรียนที่เลือก ใน UI |
| `del` | ลบรายการออกจากสโตร์พร้อมเปิดสิทธิ์ Undo |
| `ai` / `close` / `settings` | เปิด AI / ปิด Sheet / เปิดตั้งค่า |
| `notify` | ขอสิทธิ์การแจ้งเตือนจากเบราว์เซอร์ (`Notification.requestPermission()`) |
| `aiclose` / `aidrawer` / `ainew` / `aiopen` | จัดการหน้าและลิ้นชักแชท AI |
| `ai-sugg` / `ai-ok` / `ai-no` | โต้ตอบกับการ์ดและข้อความแนะนำของ AI |
| `aimenu` / `cm-pin` / `cm-rename` / `cm-del` | เมนูจัดการแชท AI (ปักหมุด, เปลี่ยนชื่อ, ลบแชท) |
| `dtype` / `dunit` / `dend` / `dtrack` / `dday` | อัปเดตค่าต่างๆ ในแบบร่างฟอร์ม (`D`) |
| `aidrawer-close` | ปิดลิ้นชักประวัติแชท AI (กดที่ฉากหลังของลิ้นชัก) |
| `restore` | นำข้อมูลที่เพิ่งนำเข้ากลับไปเป็นก่อนนำเข้า (ปุ่ม "ย้อนกลับ" หลังนำเข้าไฟล์สำรอง) |

> ตรวจเทียบกับโค้ดจริงแล้ว: `ACTIONS` ใน `js/actions.js` มี 55 key ทั้งหมดอยู่ในตารางนี้ ("action" ของ `cday`, `date`, `type` ฯลฯ คือ key ที่ผูกกับ `data-act`)

---

## 5. Architecture

### 5.1 โครงสร้างโมดูล (ES Modules, `app/js/`)
`index.html` โหลดเพียง `<script type="module" src="js/main.js">`; ES module ไม่ทำงานบน `file://` ต้องเสิร์ฟผ่าน HTTP (ทดสอบด้วย `python3 -m http.server`)

| ชั้น | ไฟล์ | หน้าที่ |
|---|---|---|
| core | `constants`, `dates`, `seed`, `store`, `timer`, `undo`, `dom`, `history`, `state`, `state-ui`, `bus` | ค่าคงที่ วันที่ ข้อมูลตั้งต้น โหลด/บันทึก (`normalize`) จับเวลา undo/toast ตัวจับ DOM `pushLayerState`/`syncLayer` |
| services | `schedule`, `reminders`, `chat-store` | ตรรกะล้วน (`occursOn`, `streak`, `rate`, `remindersFor`) และที่เก็บแชท (`ChatStore`) |
| ui | `primitives`, `sheet`, `form`, `menu`, `focus` | ส่วนประกอบหน้าจอและชั้นซ้อน |
| views | `views` (today/all/schedule/stats), `ai` (หน้า AI + `AIClient` + `MemoryProvider`), `settings` | หน้าจอ; seam ของ AI/ความจำอยู่ใน `views/ai.js` ไม่ได้แยกไฟล์ |
| root | `router.js`, `actions.js`, `main.js` | เส้นทาง, ตารางการกระทำ, จุดเริ่มต้น |

- **`core/state.js` -> `ST`**: ตัวแปรที่ถูกกำหนดค่าใหม่ 10 ตัวของโค้ดเดิม (`S`, `TIMER`, `TICK`, `MENU_FOR`, `MENU_BTN`, `FOCUS_ID`, `FOCUS_RET`, `WAKE`, `D`, `updateShown`) ถูกย้ายมาเป็นคุณสมบัติของ object เดียว เพราะ `import` ของ ES module เป็นแบบอ่านอย่างเดียว อ่าน/เขียนผ่าน `ST.S`, `ST.D` ฯลฯ
- **`core/bus.js`**: `register(name, fn)` / `call(name, ...args)` ใช้กับการเรียก "ขึ้นบน" ที่จะทำให้ import วนกันเท่านั้น ตอนนี้มีจุดเดียวคือ `render` (ลงทะเบียนใน `main.js` ทันทีหลังนิยาม `render`, ก่อนโค้ดที่รันตอนโหลด)
- **ไม่มี import วนกัน** (ตรวจแล้ว 0 cycle) หากเพิ่มโมดูลใหม่ ให้ย้ายของที่ใช้ร่วมกันลงชั้นล่าง (core) แทนการ import ย้อนขึ้นบน
- **`main.js`** เป็นที่เดียวที่มีโค้ดรันตอนโหลด (`addEventListener`, ตั้งค่า element ของลิ้นชัก/แถบจับเวลา, `ensureTick()`, `handleRoute()`) และท้ายไฟล์มีบล็อก `test-hooks` ที่เปิดทุกชื่อที่ export ให้เป็น `window` global เพื่อให้สคริปต์ทดสอบใน `/tmp/shot` เรียกฟังก์ชันภายในได้เหมือนสมัยไฟล์เดียว (ไม่มีผลต่อการทำงานของแอป)
- **Service worker** (`sw.js`): `CORE` ต้องมีทุกไฟล์ใน `js/` (ปัจจุบัน 25 ไฟล์ รวมทั้งหมด 32 รายการพร้อม index/css/ไอคอน) ถ้าเพิ่ม/ลบไฟล์ต้องแก้รายการนี้และเพิ่ม `VERSION` ไม่เช่นนั้นใช้ออฟไลน์ไม่ได้

### 5.2 Extension Points & Seams (จุดต่อขยายระบบ)
1. `ChatStore` (`services/chat-store.js`): ประวัติแชท ตอนนี้ใช้ `localStorage` (`evarel-chats-v1`) สลับไป Supabase ได้โดยคงชื่อเมธอด
2. `MemoryProvider` (`views/ai.js`): ความจำระยะยาว ตอนนี้เป็น mock (`ready: false`, `recall()` คืน `[]`) รอต่อ MemoryLake.ai
3. `AIClient` (`views/ai.js`): เรียกโมเดล ตอนนี้เป็น mock แบบกฎ รอสลับเป็น Worker `/api/ai/chat`

### 5.3 Backend ที่มีอยู่แล้วแต่ยังไม่ต่อกับแอปหลัก
- **Worker PoC** (`poc/worker.js`, deploy จริงที่ `/tmp/evarel-deploy/worker.js` ที่ `evarel-poc.nontakorn2600.workers.dev`) มี 4 endpoint: `GET /api/push/key`, `POST /api/push/subscribe`, `POST /api/push/send`, `POST /api/ai/chat` (Groq)
- **Schema PoC** (`poc/schema.sql`) มี 8 ตาราง: `tasks`, `routine_defs`, `schedules`, `class_periods`, `sleep_logs`, `routine_events`, `push_subscriptions`, `settings` **เป็นโมเดลเดิมก่อนเปลี่ยนมาใช้ "ตาราง items ตารางเดียว 4 ชนิด"** ตามเดโมของ Master จึงไม่ตรงกับ data model ในหัวข้อ 2 ต้องออกแบบ schema ใหม่ก่อนทำ sync
- **ไม่มี Cron Trigger** ใน PoC (ทดสอบ push ครั้งเดียวด้วยปุ่ม); cron 6 แบบอยู่ในแผนเฟส 5 (`poc/SPEC-POC.md`)

### 5.4 สิ่งที่ยังไม่ได้ต่อ (รายงานตามจริง)
- **Local-first 100%**: ข้อมูลอยู่ใน `localStorage` ไม่มีล็อกอินและไม่ sync ข้ามเครื่อง
- **แอปหลักไม่เรียก `/api` เลย** (ไม่มี `fetch` ในโค้ดแอป) AI จึงเป็น mock ฝั่ง client
- **Web Push** ผ่านการทดสอบบน Android ใน PoC แล้ว แต่ยังไม่ได้เชื่อมกับแอปหลัก

---

## 6. Edge Cases, Known Limitations, & Tested Behaviours

### 6.1 Edge Cases & Limitations
- **Cross-Midnight Reminders**: การตั้งเตือนล่วงหน้าข้ามเที่ยงคืนไปวันก่อนหน้ายังไม่รองรับในเวอร์ชันนี้ (จำกัดอยู่ในกรอบ 00:00 - 23:59 ของวัน)
- **Future Actions**: ห้ามผู้ใช้ติ๊กทำแล้ว หรือจับเวลาล่วงหน้าสำหรับวันในอนาคต (`ds > TODAY`) ระบบจะแสดง Toast เตือน
- **Timer Sub-minute**: การจับเวลาที่หยุดก่อนครบ 1 นาที จะถูกยกเลิกโดยไม่บันทึกลง log
- **Single Timer Constraint**: การสั่งจับเวลารายการใหม่จะสั่งคอมมิตและจบตัวจับเวลาเก่าโดยอัตโนมัติ

### 6.2 Test Scripts Inventory (`/tmp/shot/*.mjs`)

| Script Name | Target & Scope Covered |
|---|---|
| `baseline.mjs` | สแนปชอตโครงสร้างและข้อความ UI หน้าจอต่างๆ เพื่อใช้เปรียบเทียบ Diff |
| `t3d2.mjs` | ทดสอบตรรกะการทำซ้ำและบันทึกประวัติ 3 วัน |
| `focus.mjs` | ทดสอบหน้าจับเวลา Focus Mode และการทำงานของ Timer Service |
| `edge.mjs` | ทดสอบกรณีขอบเขต เช่น วันที่ในอนาคต, การใส่ค่าผิดประเภท |
| `ai.mjs` / `ai2.mjs` | ทดสอบระบบ AI Chat, การแยกข้อความสั่งเพิ่มงาน, การตอบสนองของการ์ด |
| `xss2.mjs` | ทดสอบความปลอดภัยจากการโจมตีประเภท XSS ในฟิลด์ข้อความต่างๆ |
| `startwarn.mjs` | ทดสอบคำเตือนกรณีวันเริ่มและวันสิ้นสุดของรายการ |
| `form2.mjs` | ทดสอบการป้อนข้อมูลและการตรวจสอบความถูกต้องในฟอร์ม (Validation) |
| `rep.mjs` | ทดสอบกฎการทำซ้ำ (Repeat rules) ทั้งวัน สัปดาห์ และเดือน |
| `rem3.mjs` | ทดสอบการคำนวณการแจ้งเตือน (`remindersFor`) และชนิดเตือนต่างๆ |
| `backup1.mjs` | ทดสอบการส่งออกและนำเข้าไฟล์สำรองข้อมูล JSON และการตรวจ validation |
| `sched2.mjs` | ทดสอบการคำนวณตารางเรียนและตารางกิจกรรมประจำสัปดาห์ |
| `uiverify.mjs` | ทดสอบการวัดระยะและพิกัด UI ตามข้อกำหนดการแก้ไข UI ในเบราว์เซอร์จริง |
| `pwa.mjs` | ทดสอบ Service Worker, การแคชไฟล์ และการทำงานแบบออฟไลน์ |

---

## 7. Glossary of Thai UI Vocabulary & Copywriting Rules

เพื่อความเป็นเอกภาพและมาตรฐานเดียวกันของอินเทอร์เฟซภาษาไทย ห้ามใช้คำศัพท์อื่นนอกเหนือจากตารางนี้:

| English Term | Canonical Thai Term | Usage Context & Example |
|---|---|---|
| Habit | **นิสัย** | ใช้เรียกรายการประเภทนิสัย ("สร้างนิสัยใหม่") |
| Task | **งาน** | ใช้เรียกรายการประเภทงานที่มีวันส่ง ("เพิ่มงาน") |
| Event | **กิจกรรม** | ใช้เรียกรายการประเภทนัดหมาย/กิจกรรม |
| Class | **วิชาเรียน** | ใช้เรียกรายการประเภทตารางเรียน |
| Today / Tomorrow / Yesterday | **วันนี้** / **พรุ่งนี้** / **เมื่อวาน** | ใช้แสดงวันที่ใน UI (`niceDate`) |
| Repeat | **การทำซ้ำ** | ตัวเลือกความถี่ในฟอร์ม |
| Reminder | **การแจ้งเตือน** | หัวข้อการตั้งเวลาเตือน |
| Lead Time / Before | **เตือนล่วงหน้า** | การตั้งเตือนก่อนเวลา |
| Start Time | **เวลาเริ่ม** | เวลาเริ่มต้นของกิจกรรมหรือวิชาเรียน |
| Backup | **สำรองข้อมูล** | ปุ่มส่งออกไฟล์ JSON ในตั้งค่า |
| Restore | **นำกลับมา** | ปุ่มนำเข้าไฟล์ JSON ในตั้งค่า |
| Undo | **เลิกทำ** | ปุ่มย้อนกลับการกระทำใน Toast |
| Skip | **ข้าม** | เมนูข้ามการทำวันนี้ |
| Unskip | **ยกเลิกการข้าม** | เมนูยกเลิกสถานะข้าม |

### Copywriting Rules (กฎการเขียนข้อความ)
1. ใช้ภาษาไทยที่เป็นกันเอง สั้น กระชับ อ่านง่าย (e.g. "ใส่ชื่อก่อนนะ", "ยังไม่ถึงวันนี้ ติ๊กล่วงหน้าไม่ได้")
2. ใช้เครื่องหมายอัญประกาศโค้ง `“...”` เมื่ออ้างอิงชื่อรายการในข้อความแจ้งเตือน หรือ Toast
3. ทับศัพท์คำทางเทคนิคเป็นภาษาอังกฤษเฉพาะเมื่อจำเป็นและเป็นสากล (e.g. JSON, PWA, Service Worker, AI)

---

## 8. 'How to Change X Safely' Checklist & Verification Recipe

เมื่อต้องแก้ไขโค้ดหรือปรับปรุงระบบ ให้ปฏิบัติตามขั้นตอนอย่างเคร่งครัดเพื่อป้องกัน Regression:

### 8.1 Checklist ก่อนการแก้ไข
- [ ] อ่านข้อกำหนดและโค้ดที่เกี่ยวข้องอย่างละเอียดก่อนแตะไฟล์
- [ ] ตรวจสอบว่ามีสแนปชอต baseline เดิมอยู่ใน `/tmp/shot/` หรือไม่
- [ ] ห้ามเปลี่ยนชื่อฟังก์ชัน หรือ Data Attribute (`data-act`, `data-id`) ที่ใช้อ้างอิงใน ACTIONS
- [ ] ตรวจสอบว่าไม่กระทบต่อ Design Tokens ใน `styles/tokens.css`

### 8.2 Verification Recipe (สูตรการตรวจสอบด้วย Playwright เบราว์เซอร์จริง)
1. **พิสูจน์สคริปต์วัดค่าบนสภาวะ BEFORE ก่อนเสมอ**:
   - **บทเรียนสำคัญ**: สคริปต์วัดค่าที่ไม่ถูกทดสอบกับสภาวะ BEFORE แล้วรายงานผล 0px ไม่ใช่หลักฐานว่าโค้ดถูกต้อง สคริปต์วัดค่าต้องถูกรันบน BEFORE สภาพเดิมเพื่อยืนยันว่าตรวจจับความผิดปกติ (Non-zero diff) ได้จริงก่อนนำไปใช้วัดสภาวะ AFTER!
2. **รันการทดสอบด้วย Playwright (Chromium Headless Shell)**:
   ```bash
   CH=~/.cache/ms-playwright/chromium_headless_shell-1243/*/chrome-headless-shell
   node /tmp/shot/uiverify.mjs
   ```
3. **พารามิเตอร์การจำลองอุปกรณ์**:
   - Viewport: `412 x 915` (ขนาดมาตรฐานหน้าจอ Android)
   - Device Scale Factor: `2`
   - Timezone: `Asia/Bangkok`
   - Route Abort Fonts: Abort web fonts เพื่อผลการวัด Y-coordinate ที่เสถียร
4. **ตรวจวิเคราะห์ความเสี่ยง Regression**:
   - รันสคริปต์ทดสอบย่อยทั้งหมดใน `/tmp/shot/*.mjs` ต้องผ่าน 100% โดยไม่มี crash, TimeoutError, หรือ PAGEERROR
   - เปรียบเทียบผลลัพธ์ JSON baseline ก่อนและหลังแก้ไขเพื่อยืนยันว่ามีเฉพาะส่วนที่ตั้งใจเปลี่ยนเท่านั้น


### บทเรียนความกว้างจอ (v15)
- `.ev-main` เป็น CSS grid: ต้องกำหนด `grid-template-columns:minmax(0,1fr)` เสมอ ถ้าไม่กำหนด คอลัมน์ (auto) จะขยายตามเนื้อหาที่ยาวที่สุดและดันการ์ดให้กว้างเกินจอ (เห็นที่ 360-412px: ขอบขวาชิดจอ ปุ่ม ⋮ ติดขอบ)
- ตรวจด้วย `getBoundingClientRect` ที่ 360/390/412/457/480px ทั้งโหมดสว่าง-มืด ทุกแท็บ: `scrollWidth` ต้องเท่า `clientWidth` และขอบซ้าย-ขวาของการ์ดต้องเท่ากัน
- ระวังเซิร์ฟเวอร์ทดสอบเก่าค้างพอร์ตเดิม ทำให้วัดไฟล์เก่า: ใช้พอร์ตใหม่ทุกครั้งและเช็กว่าไฟล์ที่เสิร์ฟมีโค้ดใหม่จริง

### บทเรียนไอคอนกึ่งกลาง (v16)
- `<button>` มี padding เริ่มต้น `1px 6px` ต้องล้างเป็น `padding:0` ในปุ่มกลมที่มีไอคอน ไม่งั้นไอคอนเยื้อง (ติ๊กถูกใน `.ev-check` เยื้อง 6px)
- `.ev-mini` ต้องเป็น grid/place-items:center ไม่งั้น SVG นั่งบน baseline (play เยื้องขึ้น 2px)
- วัดกึ่งกลางจริงด้วย bounding box ของ path (getBoundingClientRect ของ path) เทียบกึ่งกลางปุ่ม ไม่ใช่อ่านตัวเลข path: ดาว spark เดิมกรอบจริง y 3..19 (กลาง 11) จึงขยับเป็น y 4..20
- สามเหลี่ยม play ต้องให้ศูนย์ถ่วงอยู่กลาง (x≈12) ไม่ใช่กรอบ
- แถวเตือน "กี่วันก่อนวันส่ง เวลา" มี 4 ชิ้น ต้องใช้ grid 2 แถว (`data-layout=days`) ช่องเลข 88px ช่องเวลา 152px; ตรวจว่าตัวอักษรไม่ถูกบีบด้วยการนับพิกเซลหมึกในช่อง ไม่ใช่ดูแค่ความกว้างกล่อง
- อย่าตั้ง `.ev-icon{display:block}` ทั้งระบบ: ทำให้ไอคอน inline ในบรรทัดข้อความกลายเป็นบล็อกและแถวสูงขึ้น (เทียบภาพก่อน/หลังจับได้)


---
## (ประวัติ) 9 ต.ค. ค่ำ: v7 (app-v7/) — ถูกแทนที่ด้วย v11 แล้ว ดูหัวข้อ "สถานะปัจจุบัน v11" ท้ายไฟล์

**เอกสารส่วนอื่นด้านบนอธิบายแอปเดิม (`app/`, 25 โมดูล, storage key `evarel-demo-v2`) ซึ่งยังเก็บไว้เป็นข้อมูลอ้างอิง/ย้อนกลับ แต่ไม่ได้ถูก deploy แล้ว**

| หัวข้อ | `app/` (เดิม) | `app-v7/` (ใช้งานจริงตอนนี้) |
|---|---|---|
| ดีไซน์ | master-demo-v2 | **design/master-demo-v7.html (canonical)** |
| โครงโค้ด | 25 ES modules | `js/app.js` (JS ของ v7 ทั้งก้อน ไม่แก้ตรรกะ) + `route.js` + `boot.js` |
| storage key | evarel-demo-v2 | `evarel-demo-v3`, `evarel-timer-v3`, `evarel-theme-v3` (+ chats key ใน v7) |
| ข้อมูลผู้ใช้ | - | **เริ่มใหม่** (Master สั่ง ไม่แปลงข้อมูลเดิม) |
| route | router.js (ES module) | `route.js` ครอบ v7: `#/today #/all #/schedule #/stats` (แท็บ push history), `#/ai` `#/settings` (deep link เปิดผ่าน ACTIONS ของ v7) |
| เลเยอร์/Back | history.js | **ของ v7**: sheet/dialog/page ผลัก `history.pushState({ev:n})` เอง, popstate ปิดชั้นบนสุด; route.js ไม่แตะ state นี้ |
| SW | evarel-v16 | `sw.js` evarel-v17 (CORE 9 ไฟล์) + `boot.js` ลงทะเบียน + แจ้งอัปเดตผ่าน toast ของ v7 |
| Push | sw.js มี handler | handler ยังอยู่ใน sw.js; **settings ของ v7 ยังไม่เชื่อม Push จริง** (v7 บันทึกค่าแต่ไม่เด้ง) |

### ข้อเท็จจริงของ v7 ที่ต้องรู้ก่อนแก้
- v7 เป็นสคริปต์ปกติ (ไม่ใช่ ES module): ฟังก์ชัน/ตัวแปรเป็น global (`UI`, `S`, `ACTIONS`, `LAYERS`, `render`, `toast`, `TABS`) — route.js/boot.js พึ่งสิ่งเหล่านี้ ต้องโหลดหลัง app.js
- v7 ผู้ออกแบบแบ่งโค้ดเป็นหัวข้อ `MODULE:` 15 ส่วนไว้แล้ว (เตรียมแยกไฟล์) — ยังไม่ได้แยก เพื่อรักษา "เหมือน v7 ทุกพิกเซล"
- ติ๊กรายการ (`check`) ใน v7 เป็นแบบเงียบ (`commit('',fn,true)`) ไม่มี toast ย้อนกลับ; รายการที่เสร็จหายจากหน้าวันนี้; การลบมี dialog ยืนยัน + toast ย้อนกลับ
- ฟอร์มเพิ่ม/แก้ไขเป็น 2 ขั้น (เลือกประเภท → กรอกเท่าที่จำเป็น ตัวเลือกขั้นสูงพับเก็บ)
- การทดสอบหลักที่ใช้ยืนยัน: เทียบภาพกับ v7 ต้นฉบับ (diff 0 พิกเซลทุกแท็บ สว่าง/มืด; หน้าเพิ่มต่างเฉพาะเคอร์เซอร์กะพริบ), route 22 ข้อ, PWA ออฟไลน์, ล้นจอ 360/390/412/457
- ข้อควรระวังการวัด: สคริปต์ทดสอบต้องพิสูจน์กับ v7 ต้นฉบับก่อนเสมอ (ผลของ v7 คือความจริง ไม่ใช่การเดา)


---
## สถานะปัจจุบัน (10 ต.ค. 2026): แอปที่ deploy คือ v11 (app-v11/)

**canonical design = `design/master-demo-v11.html`** (แทน v7) | sw.js `evarel-v18` | ข้อมูลเริ่มใหม่เหมือนเดิม (storage key `evarel-demo-v3`, `evarel-timer-v3`, `evarel-theme-v3`, `evarel-chats-v3`)

### ต่างจาก v7 อย่างไร (วัดจากโค้ดจริง)
| หัวข้อ | v7 | v11 |
|---|---|---|
| แท็บ | วันนี้ รายการ **ตารางเรียน** สถิติ (`schedule`) | วันนี้ รายการ **ปฏิทิน** สถิติ (`calendar`) → route `#/calendar` |
| ปุ่ม "+" | เปิดเมนูเลือกประเภท (`#pop`) | เปิดฟอร์มทันที เลือกประเภทในฟอร์ม (`dtype`) |
| ปฏิทิน | ไม่มี | **FullCalendar 6.1.19** เดือน/สัปดาห์ (`services/calendar`) |
| รายละเอียดรายการ | ไม่มี | `detail` = หน้าเต็ม ปฏิทินรายเดือน + แก้สถานะย้อนหลัง (`views/detail`) |
| ชั้นข้อมูล | อ่านเขียน localStorage ตรง | **`Repo`** (LocalAdapter / HttpAdapter) + `syncChanges` diff upserts/removes — จุดต่อ backend เปลี่ยนที่เดียว |
| boot | sync | **async** `boot()` โหลดผ่าน Repo + มี error state + ปุ่ม `retry` |
| สถิติ | ในไฟล์ views | แยก `services/stats` |
| ขนาด | JS 53,864 / CSS 28,158 | JS 74,326 / CSS 37,034 |

### สิ่งที่ผมเพิ่มเหนือ v11 (ไม่แก้ตรรกะ v11)
- `vendor/fullcalendar.min.js` (283,987 ไบต์, MIT) **เก็บในแอปเอง** แทน CDN jsdelivr เพื่อให้ปฏิทินใช้ออฟไลน์ได้ (v11 ต้นฉบับพึ่ง CDN)
- `js/route.js` (hash route `#/today #/all #/calendar #/stats` + deep link `#/ai` `#/settings`), `js/boot.js` (ลงทะเบียน SW + toast แจ้งอัปเดต), `sw.js` (CORE 10 ไฟล์)
- ลำดับโหลด: fullcalendar → app.js → route.js → boot.js

### จุดต่อ backend (พร้อมแล้ว)
`const Repo=LocalAdapter;` → เปลี่ยนเป็น `HttpAdapter('/api')` สัญญา: `load():Promise<{items}>` · `apply({upserts,removes},full):Promise<void>` (โยน error = UI แสดง error). Endpoint ที่ HttpAdapter คาด: `GET /items`, `PUT /items/:id`, `DELETE /items/:id` (ยังไม่มีฝั่ง Worker)

### ผลตรวจ (เบราว์เซอร์จริง 412x915)
เทียบภาพกับ v11 ต้นฉบับ 10 หน้า (4 แท็บ+ฟอร์ม × สว่าง/มืด) = 0 พิกเซล | route 22/22 | ฟีเจอร์ v11 13/13 | ออฟไลน์รวมปฏิทิน (บล็อก CDN) ผ่าน | ไม่ล้นจอ 360/390/412/457 × สว่าง/มืด

### บทเรียนการวัด
- ปฏิทิน FullCalendar: `.fc-timegrid-col` รวม **แกนเวลา** (8 = 7 วัน + 1 แกน) นับวันจริงด้วย `[data-date]`
- ความต่างหน้า "สถิติ" ที่เจอครั้งหนึ่งเป็น noise ของ `countUp` — พิสูจน์โดยถ่าย v11 ต้นฉบับเทียบตัวเอง
- ปุ่มเลื่อนปฏิทินหลัก = `cal-nav` (`prev|next|today`); `cal-prev/cal-next` เป็นของปฏิทินในหน้า detail

# ชุดอัปเดต Evarel — ปรับแอปจริง (app/web) ให้ตรง demo 24 (design/Evarel v24.html)

วิธีใช้: วางไฟล์ตามพาธใน zip ทับตำแหน่งเดียวกันในที่เก็บ (สาขา develop) — จบ ไม่ต้องทำอะไรเพิ่ม
- โค้ดต่อ API จริงอยู่แล้ว (ไม่แตะ data adapter: 05-data__auth / SupaAdapter เดิมทั้งหมด)
- ไฟล์ใน `app/web/` คือผล build ล่าสุด (คอมไพล์แล้ว ใช้ได้ทันที) ส่วน `app/src/` คือซอร์สที่ตรงกัน — ถ้าจะ build ซ้ำใช้ `npm run build:ts && npm run build:react && npm run build:css` (ได้ผลเหมือนไฟล์ที่แนบมาทุกไบต์)
- ผ่าน typecheck ที่ baseline เดิม (error ชนิด 1024 จุด ไม่ส่งผลอนรัน), `npm run check:react` ตรงทุกไฟล์ (17), และเทียบภาพกับเดโมแล้วตรงกัน 0.00% ทุกหน้า (ยกเว้นหน้าตั้งค่า ตรงกันเฉพาะส่วนที่ไม่ใช่ของเดโม — ดูข้อ 6)

## สิ่งที่แก้ (อ้างอิงพฤติกรรมจริงของ design/Evarel v24.html ทุกข้อ)

1. **ฟอนต์ (จุดที่ทำให้ทั้งเว็บต่างจากเดโมมากที่สุด)** — แอปอ้างชื่อ 'Anuphan' ใน `--font` มาตลอดแต่ไม่มี @font-face เลย จึงตกไปใช้ฟอนต์ระบบทั้งหน้า
   - `app/web/styles/extra.css`: เพิ่ม @font-face ของ Anuphan (thai+latin, variable wght 100–700) และ Noto Sans Thai (thai+latin, wght 100–900) — unicode-range คัดจาก Google Fonts css2 ตรงเป๊ะแบบเดโม
   - `app/web/fonts/*.woff2`: เปลี่ยนเป็นไฟล์ variable ตัวเดียวกับที่ Google เสิร์ฟให้เดโม (Anuphan v6 / Noto Sans Thai v29) เพื่อให้เรนเดอร์เหมือนกันทุกอักขระและใช้ออฟไลน์ได้ (SW precache พาธเดิม ไม่ต้องแก้ sw.js)

2. **v21 เติมสถานะว่างของเวลา "ไม่ระบุเวลา"** — แอปพอร์ตมาไม่ครบ 4 จุด
   - `app/src/m/12-ui__primitives.ts` + `app/src/react/item-row.jsx`: แถวรายการในหน้าวันนี้/วาระ — เดิม `timeText(it)` ขาด fallback ตอนรายการไม่มีเวลา
   - `app/src/m/20-services__calendar.ts` + `app/src/react/detail.jsx`: แถว "ครั้งถัดไป" ในหน้ารายละเอียด — เดิมไม่มี " · " คั่นและไม่มีข้อความแสดงเวลาเมื่อไม่ได้ตั้ง

3. **v18/v24 โฟกัสของชั้นลอย 60ms (pushLayer)** — เดิมแอปตัดออกเพราะเข้าใจว่าเดโมไม่มี (จริง ๆ เดโมมี): sheet โฟกัสตัวเอง (tabIndex=-1 + outline 0 กันเปิดคีย์บอร์ดเอง) ชั้นอื่นโฟกัสองค์ประกอบแรกที่ใช้งานได้ — คืนตามเดโม (`app/src/m/09-ui__layers.ts`)

4. **v24 หน้าเต็มจอ (openPage)** — เพิ่ม `data-enter` (อนิเมชั่น pgIn ตาม CSS ของเดโม, ปิดเองตาม html[data-settled]), ตั้ง `data-page` ตามชื่อหน้า (detail/settings/ai/focus), และ**ปัดจากขอบซ้ายเพื่อปิดหน้า** (EDGE_BACK_PX=24 ผ่านเอนจิน attachGesture ตัวเดียวกับเดโม, ยกเว้นหน้า AI ตามเดโม, ปิดพร้อมเอฟเฟกต์ data-exit) — `app/src/m/09-ui__layers.ts` + ผู้เรียกทั้งสี่ (15-core__timer, 17-views__ai, 19-views__settings, 20-services__calendar)

5. **v19 bottom sheet ปรับความสูงนุ่ม + เนื้อหาเข้าเป็นจังหวะ** — พอร์ต sheetStage()/sheetResize() และเดินสายใน renderForm ด้วยกุญแจขั้นตอน (`D.step+':'+D.type`): เปลี่ยนขั้นฟอร์ม = ความสูง transition .34s (data-resize) + ฟิลด์เข้าเป็นจังหวะ (data-stage, sheetIn เช่นเดโม) — `app/src/m/14-ui__form.ts`

6. **v22/v23 อนิเมชั่นเข้าเฉพาะ node ที่เพิ่มใหม่ (.ev-in)** — เดโมทำผ่าน onNodeAdded ของ morphdom; แอปได้ node ใหม่จาก React/innerHTML จึงใช้ MutationObserver แทนด้วยกฎเดียวกันทุกข้อ (ตัด svg/ตัวเล็ก/ปุ่ม/ชิป, ของใน .ev-in ไม่ซ้ำ, เช็ด ev-in ของ parent ก่อนเพิ่มเหมือน attribute-sync ของ morphdom, ไม่ใส่ตอนแรกเปิดชั้น/ตอน skeleton) — `app/src/m/23-render.ts`
   - ให้ React reconcile แทน unmount+remount ใน setSheet (โครง sheet) และ aiRefresh (#aiBody) — ของเดิมไม่ขยับ เฉพาะของใหม่ที่เข้าเหมือน patch ของเดโม (`app/src/m/09-ui__layers.ts`, `app/src/m/17-views__ai.ts`)

7. **ส่วนที่ตั้งใจไม่เหมือนเดโม (ตามที่เจ้าของระบุ)** — หน้าตั้งค่าไม่มี "ข้อมูลของคุณ" (เป็นของฝั่งเดโม) และไม่มี "จำลองสถานะ (เฉพาะเดโม)" + ข้อความแจ้งเตือนเป็นฉบับระบบจริง — คงเดิมทั้งหมด ไม่ได้เพิ่มกลับมา

## การตรวจ (ผ่านทั้งหมด)
- เทียบภาพ demo กับแอป (seed เดียวกัน วันเดียวกัน): today / รายการ / ปฏิทิน / สถิติ / รายละเอียด / ฟอร์มเพิ่ม / AI / หน้าล็อกอิน = **ต่าง 0.00%** · ตั้งค่า = ต่างเฉพาะสองการ์ดที่ตั้งใจลบ
- เทียบพฤติกรรม (probe จริงในเบราว์เซอร์): โฟกัส sheet 60ms, sheetIn/data-stage/data-resize ตอนเลือกประเภท, data-enter ของหน้า, pop ของติ๊กเช็ก, lifecycle ของ ev-in ในแชท AI 2 ข้อความ, การปิด popover เมื่อ scroll — ตรงเดโมทุกจุด
- Smoke test ไหลครบวงจร (เพิ่ม/แก้ไขรายการ, เมนูรายการ, รายละเอียด, ตั้งค่า+ธีม, AI+แชท+drawer, ปัดขอบปิดหน้า) — ไม่มี error console
- กฎ "ต้องมีเวลาเมื่อเปิดเตือนตรงเวลา" ในฟอร์ม = พฤติกรรมเดโม (ตรวจแล้วทั้งสองฝั่ง) ไม่ใช่บั๊ก

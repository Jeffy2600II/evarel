# 04. ระบบเอกสารและการตรวจสอบรหัสโค้ดแบบอัตโนมัติ (Documentation & Code Sync System)

ระบบเอกสาร Evarel กำหนดให้แต่ละระบบ (System) มีโฟลเดอร์ของตัวเองซึ่งประกอบด้วย **`manifest.json`** และ **Markdown Document** เป็น Single Source of Truth เพียงหนึ่งเดียว เพื่อบรรลุ 4 วัตถุประสงค์:
1. **Human Docs**: สร้างเอกสารอ่านง่ายสำหรับนักพัฒนา
2. **AI Tool Schemas**: แปลง `actions` ที่ระบุ `tool: true` เป็น Function Calling Tool Schema ให้ AI Agent อัตโนมัติ
3. **External AI Onboarding**: โครงสร้างมาตรฐานที่ AI / External Agent เข้าใจและขยายระบบได้ใน 5 นาที
4. **Automated Drift Check**: สคริปต์ตรวจจับความต่าง (Drift) ระหว่างเอกสารและโค้ดจริงบน CI/Pre-commit

---

## 1. Manifest JSON Schema

ไฟล์ `src/systems/<system-name>/manifest.json` มีโครงสร้าง Schema ดังนี้:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["system", "purpose", "entities", "actions", "endpoints", "events", "invariants", "tests"],
  "properties": {
    "system": { "type": "string" },
    "purpose": { "type": "string" },
    "entities": { "type": "array", "items": { "type": "object", "required": ["name", "fields"] } },
    "actions": {
      "type": "array",
      "items": { "type": "object", "required": ["name", "description", "params", "sideEffects", "tool"] }
    },
    "endpoints": {
      "type": "array",
      "items": { "type": "object", "required": ["method", "path", "description"] }
    },
    "events": { "type": "array", "items": { "type": "string" } },
    "invariants": { "type": "array", "items": { "type": "string" } },
    "tests": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## 2. Document Template Sections

ไฟล์ Markdown ประจำระบบ (`README.md` หรือ `<system-name>.md`) ประกอบด้วย 6 หัวข้อมาตรฐาน:
1. **Overview & Purpose**: วัตถุประสงค์และภาพรวมระบบ
2. **Data Entities & Schema**: โครงสร้างฟิลด์ ชนิดข้อมูล และความสัมพันธ์
3. **Actions & AI Tool Interface**: การกระทำ Side Effects และสถานะการเป็น AI Tool
4. **Endpoints & Events**: รายการ REST APIs และ Events ที่เกิดขึ้น
5. **Business Invariants**: กฎเหล็กของระบบที่ไม่ยอมให้ละเมิด
6. **Verification & Tests**: รายการสคริปต์การทดสอบและวิธีการยืนยัน

---

## 3. Drift-Check Algorithm (Pseudo-Code)

สคริปต์ `scripts/check-docs-drift.ts` สำหรับตรวจสอบความตรงกันระหว่างโค้ดและเอกสาร:

```typescript
function checkDocsDrift(): void {
  const manifests = loadAllManifests("src/systems/*/manifest.json");
  const codeActions = extractKeysFromCode("src/actions.ts", "ACTIONS");
  const codeRoutes = extractRoutesFromCode("src/worker.ts");
  let errors: string[] = [];

  for (const manifest of manifests) {
    for (const action of manifest.actions) {
      if (!codeActions.has(action.name)) {
        errors.push(`[Action Drift] '${action.name}' ใน manifest ไม่มีใน ACTIONS code`);
      }
      codeActions.delete(action.name);
    }
    for (const ep of manifest.endpoints) {
      if (!codeRoutes.has(`${ep.method} ${ep.path}`)) {
        errors.push(`[Endpoint Drift] '${ep.method} ${ep.path}' ใน manifest ไม่มีใน router code`);
      }
    }
  }
  // ตรวจเอกสาร Markdown เทียบ manifest (ตรงกับวัตถุประสงค์ข้อ 4)
  for (const manifest of manifests) {
    const md = readMarkdown(manifest.system);
    for (const action of manifest.actions) {
      if (!md.mentions(action.name)) errors.push(`[Doc Drift] action '${action.name}' ไม่อยู่ในเอกสาร ${manifest.system}`);
    }
  }
  if (codeActions.size > 0) {
    errors.push(`[Orphan Action] ACTIONS ในโค้ดที่ไม่มีใน manifest: ${Array.from(codeActions).join(", ")}`);
  }
  if (errors.length > 0) {
    console.error("❌ Docs Drift Detected:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("✅ All docs and manifests are in sync with code!");
}
```

---

## 4. `docs/INDEX.md` Convention & 5-Minute Onboarding Order

### ข้อตกลง `docs/INDEX.md`
- สารบัญระบบทั้งหมด แผนผังไดอะแกรม (System Map) และสถานะการซิงค์ AI Tools ล่าสุด

### ลำดับการอ่านสำหรับ AI Agent ใหม่ (5-Minute Onboarding Order)
1. **Minute 1**: อ่าน `docs/INDEX.md` และ `system-logic.md` เพื่อเข้าใจภาพรวมสถาปัตยกรรมและคำศัพท์
2. **Minute 2**: อ่าน `src/systems/<system>/manifest.json` เพื่อรู้ Data Model, Actions และ Endpoints
3. **Minute 3**: อ่าน `src/systems/<system>/README.md` เข้าใจ Business Invariants และ Edge Cases
4. **Minute 4**: ดู AI Tool Schemas ที่สร้างจาก manifest เพื่อทราบคำสั่งที่ Agent เรียกใช้ได้
5. **Minute 5**: รัน `npm run test:drift` และชุดทดสอบใน `tests/` เพื่อยืนยันความถูกต้องก่อนเริ่มงาน


---

## 5. ข้อควรทำเพิ่ม (จากการตรวจโดย coordinator)
1. **พิสูจน์ตัวตรวจก่อนเชื่อ**: ตัวอย่าง manifest ฉบับแรกของ worker มี action 2 ตัวที่ไม่มีใน `ACTIONS` จริงและ type ผิด — สคริปต์ drift ต้องถูกรันกับ manifest ที่ผิดโดยตั้งใจและต้องล้ม (exit 1) ก่อนจึงจะยอมรับผลผ่านของมัน
2. **`tool:true` ต้องเป็นการตัดสินใจ ไม่ใช่ค่าเริ่มต้น**: ปุ่ม UI (`check`, `inc`, `tstart`...) ตั้ง `tool:false`; agent เรียกเครื่องมือระดับข้อมูล (`item_create`/`item_update`/`item_delete`/`item_query`/`log_set`/`skip_set`/`reminder_set`) ที่ผ่านการตรวจพารามิเตอร์
3. **`ACTIONS` ใน Stage 1** จะย้ายไปอยู่ตามโมดูล — ตัวตรวจต้องอ่านจากตำแหน่งใหม่ (ปรับ `extractKeysFromCode` ตามเฟส)

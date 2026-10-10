# 03-ai-agent.md — แผนสถาปัตยกรรม AI Agent ของ Evarel

## 1. Master Architecture & Deterministic-First Concept
Evarel Agent ไม่ใช่เพียง wrapper ของ LLM แต่เป็นวงรอบควบคุมอัตโนมัติ (Plan-Tool-Verify-Answer Loop) ที่ใช้หลักการ **Deterministic Code First**:
- **Code Handles First**: งานที่คำนวณด้วยโค้ดได้ (เช่น คำนวณวันที่, Regex intent parser, Validation, CRUD สถิติทั่วไป) จะถูกประมวลผลด้วยโค้ดโดยตรงโดยไม่เรียก LLM เพื่อประหยัด Token และลด Latency
- **LLM Handles Unstructured**: LLM ถูกใช้เฉพาะการแปลความหมายภาษาธรรมชาติที่ไม่ตรงรูปแบบ (Unstructured Intent), การจัดรูปแบบคำตอบ และ Tool Calling ที่ซับซ้อน

### การเชื่อมโยง Seams (จาก App-v11 / Worker PoC -> System Architecture)
- **ChatStore**: Supabase (ตาราง `chat_sessions`, `chat_messages`) — เก็บประวัติแชทฉบับเต็มและ State ของ UI
- **MemoryProvider**: MemoryLake REST API — เก็บเฉพาะ Long-term Facts ที่เลือกสรรแล้ว
- **AIClient**: Cloudflare Worker Gateway — เรียก Groq (Primary) สลับ OpenRouter (Failover)

---

## 2. Agent Loop State Machine
```
[User Input] --> (Deterministic Intent Parser) --[Direct Answer]--> [Return UI]
                        | (Needs AI / Tool Call)
                        v
            [Build Context & Budget]
            (Supabase History + MemoryLake Facts)
                        |
                        v
             [Call LLM Gateway]
             (Groq -> OpenRouter Failover)
                        |
         +--------------+--------------+
         v                             v
  [Tool Call Request]            [Final Answer]
         |                             |
         v                             v
  [Execute Code Tool]            [Save Chat to Supabase]
  (Validate & Run CRUD)                |
         |                             v
         +------> [Verify: ผลเครื่องมือผ่านการตรวจพารามิเตอร์?]
                       | ใช่ และ round < 3  -> กลับไป [Call LLM Gateway]
                       | ไม่ผ่าน หรือ round = 3 -> ตอบจากที่มี + บอกข้อจำกัด -> [Return UI]
```

---

## 3. Tool Registry & Manifest Schema
Tool ทั้งหมดถูกลงทะเบียนผ่าน `manifest.json` ตามมาตรฐาน OpenAI Function Calling Schema เช่นเดียวกับ PoC (`evarel/poc/worker.js`):
- เครื่องมือต้องตรงกับโมเดล `items` จริง (4 ชนิด `habit|task|event|class`, `track` = `check|count|timer`) ไม่ใช่ `add_task` สามตัวของ PoC
- ชุดเริ่มต้น (สร้างจาก manifest เฉพาะ action ที่ตั้ง `tool:true` และไม่ใช่ปุ่ม UI ล้วน): `item_create`, `item_update`, `item_delete`, `item_query` (กรองวัน/ชนิด/สถานะ), `log_set` (บันทึกค่ารายวัน), `skip_set`, `reminder_set`
- ทุกเครื่องมือเขียนข้อมูลต้องผ่านการ์ด **ยืนยันก่อนทำ** (เหมือน mock AI ใน v11) และตรวจพารามิเตอร์ด้วยโค้ดก่อน ไม่ให้ LLM เขียนฐานข้อมูลตรง

---

## 4. Long-Term Memory Policy (MemoryLake Integration)
ประวัติแชททั้งหมดเก็บใน Supabase แต่ข้อมูลจริงจังระยะยาว (Facts) ของผู้ใช้จะถูกคัดเลือกส่งไป **MemoryLake REST API** (`https://app.memorylake.ai/openapi/memorylake` Auth: Bearer Key Structure: `Workspace` -> `Project` -> `Actor(custom_id)` -> `Boundary`):

| Action | เงื่อนไขการตัดสินใจของ Agent | Action บน MemoryLake | ตัวอย่างข้อความ (ภาษาไทย) |
| :--- | :--- | :--- | :--- |
| **Remember** | ข้อจำกัด/พฤติกรรม/สัจธรรมส่วนตัวระยะยาว | Save Fact | "ฉันแพ้กุ้งและอาหารทะเล", "ปกติชอบตื่น 06:00" |
| **Skip** | งานชั่วคราว/ประวัติการสนทนาทั่วไป | ข้าม (เก็บแค่ Supabase) | "พรุ่งนี้มีประชุม 10 โมง", "ขอสรุปงานวันนี้" |
| **Update** | ข้อมูลสัจธรรมเดิมมีการเปลี่ยนแปลง | Update Fact ID เดิม | "เปลี่ยนเวลาตื่นเป็น 06:30 น." |
| **Forget** | ผู้ใช้สั่งให้ลืม หรือข้อมูลไม่ถูกต้อง | Forget Fact ID (ยกเลิกไม่ได้; ประวัติเก็บไว้ตรวจสอบ) | "ลบข้อมูลเรื่องการแพ้อาหารออกที" |

**ข้อมูลอ่อนไหว**: MemoryLake เป็นบริการภายนอก — สุขภาพ/การแพทย์/ข้อมูลระบุตัวตนห้ามส่งโดยอัตโนมัติ ต้องให้ผู้ใช้ยืนยันก่อน (ตัวอย่าง "แพ้กุ้ง" ในตารางด้านบนเป็นข้อมูลสุขภาพ จึงต้องถามก่อน) และมีปุ่มดู/ลบความจำทั้งหมดของตัวเอง
**ลำดับตัดสินใจจดจำ (โค้ดก่อน LLM)**: กฎคำสำคัญ ("จำไว้ว่า", "ลืม...") → ตัวกรองข้อมูลอ่อนไหว → ค่อยให้ LLM ตัดสินส่วนที่เหลือ; ตรวจซ้ำกับ fact เดิมก่อนบันทึก (ลดค่า Memory Input)

---

## 5. Resource Limits, Rate Limits & Token Budget Math
### Verified Provider Quotas & Limits
- **Groq Free Tier (gpt-oss-120b)**:
  - 30 RPM / 1,000 Requests/day
  - 8,000 Tokens/min (TPM) / 200,000 Tokens/day (TPD)
- **OpenRouter Free Tier (:free)**:
  - 50 Requests/day (จะเพิ่มเป็น 1,000 Req/day เมื่อเติม $10 Credit)
- **MemoryLake Free Tier**:
  - 300,000 Tokens/month, Rate Limit 600 req/min
  - Retrieval ~1,200 calls/month free
  - Memory Input มีค่าใช้จ่าย ($5.49/1M chars, ฟรีสะสม ~164K chars) -> ต้องกรองก่อนเซฟอย่างเข้มงวด

### Token Budget Math ต่อ Agent Round
- **ตัวเลขเดิมเป็นสมมติฐาน ห้ามใช้ตัดสิน**: ต้องวัดโทเคนจริงของข้อความภาษาไทยบน gpt-oss-120b ก่อนล็อก (ภาษาไทยใช้โทเคนมากกว่าอังกฤษหลายเท่า)
- **หน่วยคือ "ต่อข้อความผู้ใช้" ไม่ใช่ "ต่อรอบ"**: 1 ข้อความที่เรียกเครื่องมือวน = หลายรอบ LLM ทุกรอบส่งบริบททั้งก้อนซ้ำ
- **สูตร**: โทเคนต่อข้อความ ≈ (system+memory+history+input) x จำนวนรอบ + เอาต์พุตรวม; ตัวอย่างสมมติฐาน (ยังไม่วัด) 1,100 x 3 รอบ + 500 = ~3,800 → **~2 ข้อความ/นาที** ที่ 8,000 TPM และ **~52 ข้อความ/วัน** ที่ 200,000 TPD
- **เพดานบังคับ**: สูงสุด 3 รอบ LLM ต่อข้อความ (ครบแล้วต้องตอบจากที่มี ไม่วนต่อ); เอาต์พุตสูงสุด 500 โทเคน/รอบ
- **โควตาเป็นระดับองค์กรร่วมทุกผู้ใช้**: ต้องมีโควตาต่อผู้ใช้ต่อวัน (เช่น แบ่ง 200K TPD) และนับโทเคนต่อผู้ใช้ในตาราง `ai_usage(user_id, day, tokens)`; ใกล้เต็ม (เช่น 80%) สลับ OpenRouter, เต็มทั้งคู่แสดงข้อความชัดเจน ไม่ลองซ้ำ
- **งานที่ต้องไม่เรียก LLM เลย**: คำนวณวัน/เวลา, ตรวจความถูกต้อง, CRUD ตรงๆ, ค้นรายการ — ลดโทเคนลงมากที่สุด

---

## 6. Failover Rules & Cloudflare Workers Constraints
1. **Automatic Failover Flow**:
   - เรียก Groq (`openai/gpt-oss-120b`) ก่อนเสมอ
   - หากเจอ `429 Rate Limit`, `5xx Server Error`, Token เกิน TPM/TPD หรือ Timeout (> 4 วินาที) -> สลับไปยัง OpenRouter (`:free` fallback model) โดยอัตโนมัติ
2. **Cloudflare Workers Execution Constraints**:
   - **Subrequests limit**: ไม่เกิน 50 subrequests ต่อ 1 HTTP request (รวม Fetch Supabase, MemoryLake, LLM API, Web Push)
   - **CPU Time limit**: 10ms CPU execution time (การรอ I/O Network API ไม่นับเป็น CPU time)

---

## 7. Open Risks (ความเสี่ยงที่ยังเปิดอยู่)
1. **Groq 8K TPM Bottleneck**: ข้อจำกัด 8,000 TPM ของ Groq ต่ำมาก หากมีผู้ใช้ส่งแชทพร้อมกันมากกว่า 4-5 คนใน 1 นาที จะติด Rate Limit ต้องสลับไป OpenRouter ทันที
2. **Thai Language Token Density & Quality**: โมเดล gpt-oss-120b หรือ Llama บน Groq ใช้ Token สำหรับภาษาไทยสูงกว่าภาษาอังกฤษ 2-3 เท่า ทำให้โควตา 8K TPM หมดไวขึ้น และต้องทดสอบคุณภาพความเข้าใจภาษาไทยจริงในระบบ Production
3. **MemoryLake Input Character Cost**: Memory Input มีค่าใช้จ่ายค่อนข้างสูงหลังพ้นโควตาฟรี หาก Agent กรอง Fact ไม่รัดกุมและเซฟบ่อยเกินไปจะสิ้นเปลืองงบประมาณ

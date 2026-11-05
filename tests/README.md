# tests/ : ชุดตรวจของรีโป

จัดเป็น 4 กลุ่มตามที่รันและสิ่งที่ต้องมี (จัดใหม่ 5 พ.ย. 2026 — เดิมไฟล์ 176 ตัวกองราบที่เดียว)

```
tests/
  *.mjs                 CI เฝ้า + ไฟล์ที่ใช้ helper ร่วมกัน (อยู่ระดับเดียวกับ helper จึง import './' ได้)
  equiv/                ชุดเทียบที่เปิดเบราว์เซอร์ (รันมือ: ต้องมี playwright + chromium 1243 + คีย์)
  manual/               ตัวตรวจ/ตัวสำรวจ/กรณีศึกษาที่รันมือเป็นครั้งคราว (Node ล้วนหรือเบราว์เซอร์)
  history/              ชุดตรวจของยุคเก่า (v7/v11/v12/v13) เก็บไว้อ้างอิง ไม่อัปเดตต่อ
  fixtures/             ไฟล์ข้อมูลตัวอย่างของเทสต์
  refs.lock.json        ตาราง commit ฐานของไฟล์อ้างอิงเทียบ (ดูหัวข้อท้ายไฟล์นี้)
```

เหตุผลที่บางไฟล์ต้องอยู่ระดับรากของ tests/: ไฟล์เหล่านั้น import helper ร่วม (`./live_user.mjs`, `./_env.mjs`, `./_constants_inline.mjs`, `./seed_items.mjs`) หรือถูก import โดยไฟล์อื่น หรือถูก CI/.github/workflows/web.yml อ้างด้วยพาธตรง

## กลุ่มที่ CI เฝ้าทุก push (.github/workflows/web.yml)

| ชุด | ตรวจอะไร |
|---|---|
| `aiproposal` `calendar` `core` `settingsviews` `stats_html` `today` (ชื่อไฟล์ `*_equiv.test.mjs`) | เทียบตรรกะ/HTML ปัจจุบันกับตัวอ้างอิงจาก git commit ฐาน (Node ล้วน ไม่เปิดเบราว์เซอร์ ไม่ยิงเน็ต) |
| `m_core_import.test.mjs` | เกตแคช: ทุก import `./core/` ต้องอยู่ใน CORE ของ `web/classic/sw.js` ไม่งั้นออฟไลน์พังเงียบ |
| `build_integrity.test.mjs` | ความครบของผลบิลด์: ไฟล์ที่ index.html อ้างมีจริง สคริปต์ parse ได้ ไม่มี js/m กล่องครบ แคช sw ไม่อ้างไฟล์ผี |
| `no-email-guessing.test.mjs` | ห้ามมีระบบเดา/ชี้ทางอีเมลกลับมา (กันความเป็นส่วนตัว) |
| `domains.test.mjs` | โดเมนทั้งระบบเป็น ordivel-* (กันชื่อยุคเก่าหลุดกลับมา) |

ข้อควรระวังของเทสต์ equiv ที่อ่าน git ฐาน:
- ต้องมีประวัติเต็ม (CI ใช้ fetch-depth 0 โคลนตื้นจะหา commit ฐานไม่เจอ)
- พาธใน `git show` เป็นพาธยุค commit ฐาน ห้ามแก้ตามการย้ายโฟลเดอร์ปัจจุบัน เพราะอดีตไม่ย้ายตาม (บทเรียน F6/F7 เปลี่ยนค้างไว้จนเทสต์ตายทั้งชุด พบและแก้รอบ 2026.2.62)

## tests/equiv/ — ชุดเทียบที่เปิดเบราว์เซอร์ (รันมือ)

ตรรกะเดิมเทียบกับพฤติกรรมจริงในเบราว์เซอร์ (playwright + chromium `chromium_headless_shell-1243` = playwright 1.63.0 พอดี รุ่นอื่น raster ต่าง ผลภาพเพี้ยน):

`authform_logic` `authlogic` `authviews` `calendar_lifecycle` `calendar_logic` `constants` `fn` `focus` `legacy` `markdown` `notify` `repo` `uihtml` (ชื่อไฟล์ `<ชื่อ>_equiv.test.mjs`)

## tests/manual/ — ตัวตรวจและเครื่องมือสำรวจที่รันมือ

| กลุ่ม | ไฟล์ | ใช้เมื่อ |
|---|---|---|
| ท่อบิลด์/เกตโครงสร้าง | `box_build_pipeline.test.mjs` `typecheck.test.mjs` `esm_readiness_gate.mjs` `ts1c_state_behavior.mjs` `ts1j_scope_gate.mjs` | ตรวจกติกากล่อง ชนิด และกราฟพึ่งพาเมื่อแตะโครงสร้าง |
| ตรรกะ Node ล้วน | `late_note.test.mjs` `notify_default.test.mjs` `version_rules.test.mjs` | ตรวจสูตร/กติกาเลขรุ่นโดยไม่เปิดเบราว์เซอร์ |
| ระบบแจ้งเตือน/แอปจริง | `notify_push.test.mjs` `sw_push.test.mjs` `oauth_park.test.mjs` `refresh_once.test.mjs` `s3_next_wrap.test.mjs` | ทดสอบบน forge จริง (ต้องมีคีย์ใน .agents/.env) |
| กรณีศึกษายุคก่อนโรงงาน (อ่านอย่างเดียว) | `_ts1b_*` `_ts1c_probe` `_ts1f..i` `_ts1n_authflow` `_ovf_*` `_supa_*` `_abuse_browser` `_formprobe` `_addshot` `_addtxt` `_esm1a_tool_unit` `authfix-probe` `authflow_email_probe` | ไฟล์ประกอบการแก้บั๊กรอบก่อน เก็บไว้เป็นหลักฐานวิธีคิด |
| ประตูภาพเสริม | `visual-parity.mjs` `xss-guard.mjs` `quota-unit.mjs` | เทียบภาพ/กัน XSS ตามจุดประสงค์ในหัวไฟล์ |

หมายเหตุ: `notify_default.test.mjs` อ้าง `web/classic/js/m` ซึ่งหมดไปตั้งแต่ F6 — ไฟล์นี้เก็บไว้เป็นหลักฐานสเปก D1 ยังไม่รันได้จนกว่าจะอ้างโมดูลใหม่

## tests/history/ — ชุดตรวจยุคเก่า (ไม่อัปเดตต่อ)

`v7parity` `v7pwa` `v7route` `v11parity` `v11pwa` `v11route` `v11feat` `v11ovf` `v12auth` `v13parity` + helper ประกอบ (`_legacy_inject` `_live13` `_v13_*`)
ยุคนี้เทียบกับเดโม master-demo ใน archive/design ตามที่ประกาศไว้ในหัวไฟล์แต่ละตัว

## ตัวช่วยกลางที่ระดับราก (ห้ามย้ายลงโฟลเดอร์ ถ้าไม่อยากแก้ import ทั้งชุด)

| ไฟล์ | หน้าที่ |
|---|---|
| `live_user.mjs` | สร้าง/ลบผู้ใช้ทดสอบ + เปิดแอปในฐานะผู้ใช้นั้น (ใช้ร่วมทั้งชุด browser) |
| `seed_items.mjs` | ข้อมูลตัวอย่างรายการสำหรับผู้ใช้ทดสอบ |
| `_env.mjs` | อ่านความลับ/ตั้งค่าจาก .agents/.env อย่างปลอดภัย |
| `_constants_inline.mjs` | ดึงค่าคงที่จากเอนจินมารันใน Node ล้วน |
| `baseline_shots.mjs` | ตัวถ่ายภาพพิมพ์ 32 ฉากของประตูภาพ (เรียกโดย scripts/run_shots_gate.sh) |
| `import-legacy.mjs` | เครื่องมือนำเข้าข้อมูลเก่า |

## ไฟล์อ้างอิงของเทสต์เทียบ (`/tmp/*.js`) - สร้างใหม่ได้เสมอ

เทสต์เทียบ 8 ชุด (avatar undo push popover form timer quota calstats) เทียบ "ไฟล์ก่อนย้ายตรรกะออก" กับ "ไฟล์ปัจจุบัน (ห่อบาง + core)"
ไฟล์ฝั่งอดีตถูกอ่านจาก `/tmp` ตามค่าเริ่มต้นในเทสต์ ซึ่ง**หายเมื่อรีสตาร์ทเครื่องหรือย้ายเครื่อง** แล้วเทสต์จะตายทั้งชุดด้วย `ENOENT`
ทั้งที่โค้ดไม่ได้ผิด (เกิดจริง 1 พ.ย. 2026 แปดชุดพร้อมกัน) ห้ามสร้างด้วยมือและห้าม commit ไฟล์พวกนี้

สร้างใหม่ทั้งหมด (ผลลัพธ์คงที่ทุกเครื่อง เพราะมาจากประวัติ git ในรีโป):

```
node scripts/gen-equiv-refs.mjs            # เขียนที่ /tmp ตามตารางใน tests/refs.lock.json
node scripts/gen-equiv-refs.mjs --run      # สร้างแล้วรันเทสต์ทั้งชุดให้ด้วย (ต้องมี playwright + chromium)
node scripts/gen-equiv-refs.mjs --check    # ตรวจว่า lock ยังใช้ได้ ไม่เขียนอะไร
node scripts/gen-equiv-refs.mjs --verify   # หา commit ฐานใหม่ที่เทสต์ผ่านจริง แล้วเขียน lock (ช้า, ทำเมื่อย้ายตรรกะเพิ่ม)
```

`tests/refs.lock.json` เก็บว่าเทสต์ไหนใช้ไฟล์จาก commit ไหน **ตัวที่บันทึกคือตัวที่เทสต์ผ่านจริง** ไม่ใช่ตัวที่เดาว่าใช่
เพราะแต่ละโมดูลถูกย้ายหลายรอบ (F6/F7) เลข commit ที่ถูกต้องจึงพิสูจน์ได้ด้วยการรันเทสต์เท่านั้น
ถ้าอนาคตย้ายตรรกะออกจากโมดูลอีก ให้รัน `--verify` ครั้งเดียวแล้ว commit lock ที่ได้

ข้อควรรู้: ตัวสร้างเลือกไฟล์ที่ **ต่างจากไฟล์ปัจจุบัน** เสมอ ถ้าเผลอชี้ไฟล์ปัจจุบัน เทสต์จะเทียบกับตัวเองแล้วผ่านลวง

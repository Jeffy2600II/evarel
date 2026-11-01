# Ordivel — USER-FLOW.md

| Field | Value |
|---|---|
| Document | `USER-FLOW.md` — the canonical user flows for V1 |
| Scope | `web/` PWA, per `PRD.md` §3 (F1–F8) |
| Conventions | Screen IDs are defined in `SITEMAP.md`. UI copy language: Thai. States reference `DESIGN.md` (§10 components, §13 anti-patterns) |
| Actors | The Owner (sole user) · the AI assistant (in-app feature) · the system (scheduler/worker) |

---

## Flow 1 — First run & authentication (PRD F1)

**Trigger:** App opened with no session. **Goal:** A working session on a real Android device.

1. `S-AUTH` shows brand mark, then two actions: **"สมัครบัญชีใหม่"** (email) and **"ดำเนินการต่อด้วย Google"** (Google). Email expands inline fields (email, password, confirm) — no page hop. A quiet **"มีบัญชีอยู่แล้ว — เข้าสู่ระบบ"** link flips the same panel to sign-in mode (email + password only, no confirm field).
2. Submit → loading state on the button (never a disabled screen) → on success land on `S-TODAY`.
3. Returning user with a session skips `S-AUTH` entirely (token refresh silently; failure falls back with a toast, not a dead end).

**Edge cases**

| Case | Behavior |
|---|---|
| Invalid credentials | Inline field error (border `--c-danger` + helper text ink on `--c-danger-soft`). Never a modal for validation |
| Offline at first run | Auth requires network — show inline "ต้องการอินเทอร์เน็ต" note with retry; the rest of the shell stays cached |
| Google flow interrupted | Return to `S-AUTH` untouched state; no partial account |
| Existing account, expired session | Same panel in sign-in mode (email + password only); success lands on `S-TODAY` |
| Already signed in | Skip `S-AUTH` (step 3) |

## Flow 2 — Create a task (PRD F2)

**Trigger:** FAB "+" on `S-TASKS`. **Goal:** One task captured in ≤10 seconds.

1. FAB press → `SHEET-TASK` slides up (320ms `out-expo`, §DESIGN 9).
2. Fields: title (autofocus), due date/time (chips for "วันนี้ / พรุ่งนี้ / สัปดาห์หน้า" + custom), notes (optional).
3. Save (primary button) → sheet exits 160ms → new row appears at top of list with the enter curve; if a reminder time was set, the system flow (Flow 7) arms.
4. Offline: the write goes to the local queue; row renders immediately with a quiet "รอซิงค์" meta line — **never block the UI on the network**.

**Edge cases**

| Case | Behavior |
|---|---|
| Empty title | Save disabled (primary button at 40%); no error modal |
| Offline save | Optimistic UI + queue; reconciliation per Flow 8; duplicate impossible via client-generated ids (`DATA-MODEL.md` §6) |
| Reminder time in the past | Chip picker prevents it; manual entry clamps to +15 min with an inline note |

## Flow 3 — Mark done & edit (PRD F2/F3)

1. Tap checkbox → row title strikes through, color drops to `--c-muted`, checkbox fills `--c-ok` — **this is the one `spring` moment** (§DESIGN 9); 320ms max.
2. Completed items collapse into a "เสร็จแล้ว (n)" group header (tap to expand).
3. Row tap (not the checkbox) → `SHEET-TASK` in edit mode: title, due, notes, delete (destructive, quiet style at list bottom).
4. Delete asks `DIALOG-CONFIRM` (danger action right-aligned); undo toast 3.5s after delete — recovery without a trip to the trash concept (no trash feature in V1).

**Edge cases**

| Case | Behavior |
|---|---|
| Un-check a done task | Restores to the active list at original due position; reminder re-arms if still future |
| Edit while offline | Same optimistic queue as Flow 2 |

## Flow 4 — Create a routine (PRD F3)

**Trigger:** FAB on `S-ROUTINES`. Same sheet pattern as Flow 2 with one addition:

1. Cadence step: day-of-week chips (7 pills, multi-select) + time picker — this is the only extra complexity allowed in V1 routines.
2. Save → routine appears in `S-ROUTINES` and starts feeding `S-TODAY` ("วันนี้" section) and the reminder scheduler (Flow 7).

**Edge cases**

| Case | Behavior |
|---|---|
| No days selected | Save disabled; chip group shows helper text |
| Routine with no time | Allowed — appears on `S-TODAY` without a reminder slot |

## Flow 5 — Calendar overview (PRD F4)

1. `S-CAL` opens on the current month (header owns H1 month + chevrons).
2. Days with items show a single 3px dot under the number — one dot regardless of count (no per-item dots; that's dashboard clutter).
3. Tap a day → `SHEET-DAY` (that day's merged list: tasks, routine occurrences, events) → tap an item → its home screen or edit sheet.
4. Sources are not visually differentiated by color (P4 — one accent); they're labeled by a leading icon + Secondary text.

**Edge cases**

| Case | Behavior |
|---|---|
| Day with no items | `SHEET-DAY` shows the empty state + one action ("เพิ่มรายการ") |
| Month navigation | Instant swap, no skeleton for cached months; skeleton only on first paint |

## Flow 6 — AI command, Thai, within quota (PRD F5)

**Trigger:** `S-AI` (tab bar). **Goal:** A Thai command executed or cleanly refused.

1. Input focused; history renders from the AI thread store (`web/src/engine/18-services__ai-live.ts`). Suggestion chips for common commands (read-only, from real usage patterns — never fake suggestions).
2. Send → message enters the thread (optimistic), a 3-dot typing indicator; response streams in.
3. Commands that mutate (e.g., "เพิ่มงาน ...") apply through the same services as manual flows — the AI never writes to storage directly (`ARCHITECTURE.md`).

**Edge cases**

| Case | Behavior |
|---|---|
| Quota exceeded | `DIALOG-QUOTA` with the meter at 100%; input disabled with a countdown to reset. No retry loop, no error storm — abuse prevention lives server-side |
| Offline | Input disabled with inline note; the thread stays readable (cached) |
| AI unavailable (both providers) | One toast; thread preserved; retry is manual |
| Unknown command | Plain refusal in Thai + the closest matching chips. Never a fake success |

## Flow 7 — Scheduled notification delivery (PRD F6)

**System flow (no UI steps until delivery):**

1. At create/edit time, a reminder is registered with the notify system (`backend/api/src/systems/notify`).
2. Due reminders fire on the pg_cron minute tick via the Supabase Edge Function (`backend/edge/notify-tick`); push dispatch uses `webpush-webcrypto`.
3. Device shows the system notification (title = task/routine name, Thai).
4. Tap → deep link to `S-TODAY` (or the owning screen), item highlighted for 1.5s.

**Edge cases**

| Case | Behavior |
|---|---|
| Notification permission denied | One-time inline explainer on `S-SETTINGS` ("เปิดการแจ้งเตือน"); never nag on other screens |
| Delivered while app open | In-app toast instead of a duplicate system push |
| Missed during offline/kill | On next launch, `S-TODAY` shows a "ที่ค้างไว้" section — catching up silently, never spam |

## Flow 8 — Offline reconciliation (PRD §5 constraint)

**System flow after connectivity returns:**

1. Queued writes replay in order, each an idempotent upsert keyed by client-generated id (`DATA-MODEL.md` §6).
2. Server responses merge; conflicts resolve **last-write-wins** on non-checklist fields; checklist (done) state never regresses (a done task stays done).
3. Quiet success: "ซิงค์แล้ว n รายการ" toast. Failures keep the "รอซิงค์" meta and retry on next window — no red banners for background mechanics.

## Flow 9 — Theme switch (PRD F7)

1. `S-SETTINGS` → "ธีม" row → `POPOVER-THEME`: สว่าง / มืด / ตามระบบ.
2. Switch applies immediately (no restart, no reload); writes `data-theme`; both themes must already satisfy `DESIGN.md` §11 parity — this is why parity is mandatory, not optional.

---

## Cross-references

- Screens and overlays (`S-*`, `SHEET-*`, `DIALOG-*`): `SITEMAP.md`
- Visual states and motion timing per step: `DESIGN.md` §9–10
- Data guarantees behind every step: `DATA-MODEL.md` §6
- Gate: every flow above must survive the 3 test suites (`PRD.md` §4) before it counts as shipped

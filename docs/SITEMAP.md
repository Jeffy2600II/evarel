# Ordivel — SITEMAP.md

| Field | Value |
|---|---|
| Document | `SITEMAP.md` — the screen inventory and navigation map for V1 |
| Scope | `web/` PWA, per `PRD.md` §3 |
| Navigation model | Bottom tab bar (4) + header actions + overlays (sheets/dialogs/popovers) |
| Layout | Single 480px column (`--col-max`), stacked sections — never multi-column (`DESIGN.md` §5, P6) |

---

## 1. Screen inventory

| ID | Screen | Route (canonical) | Module (today) | Purpose | Primary action |
|---|---|---|---|---|---|
| S-AUTH | Login / Register | `/login` | `web/runtime/index.html` shell (auth layer) | Establish a session (email+password or Google) | Sign in |
| S-TODAY | Today | `/today` | `web/src/engine/13-views.ts` | Answer "what's due today?" — tasks + routine occurrences + missed items | Check items off |
| S-TASKS | Tasks | `/tasks` | `web/src/engine/13-views.ts` | Full task list; filter chips (วันนี้/สัปดาห์/ทั้งหมด/เสร็จแล้ว) | FAB "+" → SHEET-TASK |
| S-ROUTINES | Routines | `/routines` | `web/src/engine/13-views.ts` | Manage recurring routines by day-of-week | FAB "+" → SHEET-ROUTINE |
| S-CAL | Calendar | `/calendar` | `web/src/engine/13-views.ts` | Month overview; one dot per day with items | Tap day → SHEET-DAY |
| S-AI | AI Assistant | `/ai` | `web/src/engine/17-views__ai.ts` | Thai commands within quota; thread history | Send command |
| S-SETTINGS | Settings | `/settings` | `web/src/engine/19-views__settings.ts` | Account, theme, notifications, quota status | Open sub-sheets |

Route note: canonical paths above are the spec. **Verified implementation (2026-11-01, `web/runtime/js/route.js`):** hash routes — tabs `#/today` `#/all` `#/calendar` `#/stats`, full pages `#/ai` `#/settings`; auth is an in-app layer without its own route, and there are no separate `/tasks` or `/routines` routes (lists live under `#/all`). These differences are logged as `DESIGN.md` §15 **D-007** and must be reconciled in one decision — the router is the implementation, this table is the contract.

## 2. Hierarchy

```
PWA shell (`web/runtime/index.html` + `sw.js`)
├── S-AUTH (only without a session)
└── Tab bar (4) ── bottom, --nav-h 64px + safe-area
    ├── S-TODAY ──── today's merged view
    ├── S-TASKS ────┬── SHEET-TASK (create/edit)
    │               └── DIALOG-CONFIRM (delete)
    ├── S-CAL ──────┬── month header (H1 + chevrons)
    │               └── SHEET-DAY (day detail)
    ├── S-AI ───────┬── DIALOG-QUOTA (quota exceeded)
    │               └── thread (AI thread store)
    └── (header) S-SETTINGS
        ├── sheet: account
        ├── POPOVER-THEME (สว่าง/มืด/ตามระบบ)
        └── sheet: notifications
S-ROUTINES lives in the header/segmented reach of S-TODAY/S-TASKS group
```

## 3. Navigation map

- **Tab bar** (persistent): วันนี้ (S-TODAY) · งาน (S-TASKS) · ปฏิทิน (S-CAL) · AI (S-AI). Settings = header icon on every screen → `S-SETTINGS`.
- **S-ROUTINES** is reached from a header action on S-TODAY/S-TASKS ("กิจวัตร"). It is deliberately *not* a fifth tab — four tabs is the legibility ceiling (`DESIGN.md` §10 Tab bar).
- **Deep links:** notification tap → `S-TODAY` with the owning item highlighted (Flow 7). AI-created items navigate to their home screen.
- **Back behavior:** overlays (sheets/dialogs) close to the *same screen state* — never re-navigate or scroll-jump. Hardware back closes an open overlay first, then exits the app from a root screen (standard Android PWA contract).

## 4. Overlay inventory

| ID | Type | Trigger | Contents |
|---|---|---|---|
| SHEET-TASK | Bottom sheet | FAB on S-TASKS / row tap | Create & edit task (Flow 2/3) |
| SHEET-ROUTINE | Bottom sheet | FAB on S-ROUTINES | Create & edit routine (Flow 4) |
| SHEET-DAY | Bottom sheet | Day tap on S-CAL | Merged day list (Flow 5) |
| DIALOG-CONFIRM | Dialog | Destructive actions | Confirm delete (danger action) |
| DIALOG-QUOTA | Dialog | Quota exceeded on S-AI | Meter at 100% + reset countdown (Flow 6) |
| POPOVER-THEME | Popover | Theme row on S-SETTINGS | สว่าง / มืด / ตามระบบ (Flow 9) |
| TOAST | Toast | System feedback | Sync done, undo delete, offline online transitions |

Overlay rules: one overlay at a time; scrim `--c-scrim` behind sheets/dialogs; exits faster than enters; no overlay ever spawns another overlay directly.

## 5. State matrix (every screen ships all four)

| Screen | Empty | Loading | Offline | Error |
|---|---|---|---|---|
| S-AUTH | n/a (first run) | Button-level only | Inline "ต้องการอินเทอร์เน็ต" + retry | Inline field errors; never a modal |
| S-TODAY | "วันนี้ยังไม่มีรายการ" — icon + one line + one action ("เพิ่มรายการแรก") | Skeleton rows | Banner-lite: "ออฟไลน์ — แสดงข้อมูลล่าสุด" | Read-only with cached data; retry quiet |
| S-TASKS | "ยังไม่มีงาน" + FAB remains visible | Skeleton | Items render from cache; queued writes show "รอซิงค์" meta | Same as S-TODAY |
| S-ROUTINES | "ยังไม่มีกิจวัตร" + one action | Skeleton | Same pattern as S-TASKS | Same |
| S-CAL | Days simply have no dots (month is never "empty") | First-paint skeleton only | Cached month renders | Retry on next focus |
| S-AI | Greeting + real suggestion chips (never fake) | 3-dot typing indicator | Input disabled + inline note; thread readable | One toast; manual retry |
| S-SETTINGS | n/a | Instant (local) | Works offline (theme/account rows) | Account rows show retry |

Empty-state rule (`DESIGN.md` §13-6): icon + one line + one action. No illustration, no art, no fake content.

## 6. Conventions

- Screen IDs are stable (the `S-` prefix plus an uppercase name, e.g. `S-AUTH`, `S-TODAY`) and are used by `USER-FLOW.md` and tests; routes are lowercase paths; Thai labels above are the canonical UI copy.
- Every screen title is unique and left-aligned; one Display per screen (`DESIGN.md` §4).
- Tab switches never reset scroll or filters; returning to a tab restores its exact state.

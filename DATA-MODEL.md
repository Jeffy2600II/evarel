# Ordivel — DATA-MODEL.md

| Field | Value |
|---|---|
| Document | `DATA-MODEL.md` — the semantic data contract for V1 |
| Database | Supabase Postgres. The schema of record lives in `backend/db` (`schema.sql` + numbered migrations; re-verified 2026-11-01) |
| Status of tables below | **Reference model** — the contract that migrations and services must satisfy. Where a migration already differs, reconcile in a drift log entry (§8), the same way `DESIGN.md` governs visual drift |
| Conventions | snake_case · UUID primary keys (client-generated, see §6) · `timestamptz` in UTC · boolean states, no string enums where a bool suffices |

---

## 1. Entity map

```
accounts ──┬── tasks
           ├── routines ── routine_occurrences
           ├── calendar_events (source: manual | task | routine)
           ├── reminders (subject: task | routine | event)
           ├── push_subscriptions
           ├── ai_messages
           └── ai_quota_usage / rate_limits
```

## 2. Conventions (all tables)

1. `id` — UUID, generated **client-side** for offline-first writes (§6).
2. `owner_id` — FK to `accounts.id`. RLS filters on `owner_id` even though V1 has one owner (hygiene, `ARCHITECTURE.md` §5).
3. Timestamps: `created_at` / `updated_at`, `timestamptz`, UTC. The device never stores local time.
4. No soft deletes in V1 — deletes are real, and the UI offers undo via toast within 3.5s (`USER-FLOW.md` Flow 3) instead of a trash feature.

## 3. Tables

### accounts
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | text | unique; null only for pure-Google rows that lack one |
| password_hash | text | null when provider is google |
| provider | text | `email` \| `google` |
| display_name | text | |
| created_at | timestamptz | |

Supabase Auth owns credentials; this row is the app-level projection.

### tasks
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, client-generated |
| owner_id | uuid | FK accounts |
| title | text | Required; trimmed on save |
| notes | text | Optional |
| status | text | `todo` \| `done` |
| due_at | timestamptz | Optional (undated tasks are allowed) |
| completed_at | timestamptz | Set when status flips to done; **monotonic — never regresses** (§6) |
| created_at / updated_at | timestamptz | |

### routines
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, client-generated |
| owner_id | uuid | FK accounts |
| title | text | |
| cadence_days | int[] | 0–6 (Mon–Sun); at least one to be schedulable |
| cadence_time | time | Optional — routine without time has no reminder slot (`USER-FLOW.md` Flow 4) |
| active | boolean | Paused ≠ deleted |
| created_at / updated_at | timestamptz | |

### routine_occurrences
Materialized per-day instances that feed Today and the calendar.
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| routine_id | uuid | FK routines |
| owner_id | uuid | denormalized for RLS |
| date | date | The day it applies to |
| status | text | `todo` \| `done` \| `skipped` |
| completed_at | timestamptz | Monotonic like tasks |

### calendar_events
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, client-generated |
| owner_id | uuid | FK accounts |
| title | text | |
| starts_at / ends_at | timestamptz | |
| all_day | boolean | |
| source | text | `manual` \| `task` \| `routine` — tasks/routines never mutate into events; the calendar **reads** them (single source of truth per entity) |
| created_at / updated_at | timestamptz | |

### reminders
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK accounts |
| subject_type | text | `task` \| `routine` \| `event` |
| subject_id | uuid | FK to the owning row |
| fire_at | timestamptz | When the scheduler delivers |
| delivered_at | timestamptz | Null until delivered; missed deliveries surface as “ที่ค้างไว้” on Today (Flow 7) |
| channel | text | `push` (V1) |

### push_subscriptions
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK accounts |
| endpoint | text | Unique — Web Push endpoint URL |
| keys | jsonb | p256dh / auth |
| created_at | timestamptz | One device may have several rows; prune on 410 Gone |

### ai_messages
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK accounts |
| role | text | `user` \| `assistant` |
| content | text | Thai; stored verbatim |
| created_at | timestamptz | Ordering key for the AI thread (`web/src/engine/18-services__ai-live.ts`) |

### ai_quota_usage
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK accounts |
| window_start | timestamptz | Quota windows reset on a fixed cadence |
| commands_used | int | Counted per command, not per token — free-tier friendly |
| updated_at | timestamptz | Enforced **server-side**; the client may display, never decide (Flow 6) |

### rate_limits (abuse prevention)
Buckets keyed by `owner_id` + action; sliding window counters. The Worker rejects early with a typed error; the UI renders `DIALOG-QUOTA` (`SITEMAP.md` §4). No retry storms — backoff is Worker-owned.

## 4. Relationships & integrity

- Deleting a task/routine/event cascades to its `reminders` rows (a delivered notification for a dead subject is noise).
- `calendar_events.source` rows pointing at tasks/routines are **derived**, never authoritative — the calendar reads the owning tables live.
- `routine_occurrences` are regenerated forward on cadence edits; history (past occurrences) is never rewritten.

## 5. Quota model (PRD F5, zero budget)

1. Quotas are per owner, per window, counted per AI command (`commands_used`), enforced in the Worker before any provider call.
2. Provider order: Groq → OpenRouter. A provider failure is not a quota event.
3. Display: the quota meter (`DESIGN.md` §10) reads from the server; the client caches the last known value with a “รอซิงค์” hint offline.

## 6. Offline reconciliation (the contract behind `USER-FLOW.md` Flow 8)

1. Every write carries a **client-generated UUID** and `updated_at`; replay is an **idempotent upsert** on `id` — the same queued write can land twice with one result.
2. Conflict policy: **last-write-wins** on editable fields; **checklist monotonicity** — once `status = done` / `completed_at` is set, a later replay can never undo it (a done task stays done; §3 tasks).
3. Replay order is queue order; the UI never blocks on reconciliation and never shows red banners for background mechanics — a quiet “ซิงค์แล้ว n รายการ” toast on success (`USER-FLOW.md` Flow 8).

## 7. Access rules

All tables RLS-filtered on `owner_id`. The service key lives only in the Worker (`ARCHITECTURE.md` §7). The front end authenticates as the owner via Supabase Auth and never touches service-level keys.

## 8. Drift log

| ID | Drift | Resolution |
|---|---|---|
| DM-001 | Reference model above vs. live migrations in `backend/db` | On adoption, diff once; log each difference here; migrations win until the next schema change, after which this doc is the contract |

Record schema changes the same way `DESIGN.md` §15 records visual drift: one entry per change, same commit as the migration.

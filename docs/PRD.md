# Ordivel — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | Ordivel — personal life-management PWA |
| Document | `PRD.md` · V1 |
| Status | Living document — the single source of truth for product scope |
| Scope of this doc set | `web/` PWA (classic runtime + React page boxes, served by `web/next`) with `core/` and its Worker API / Supabase `backend/` (this repository) |
| UI language | Thai (code identifiers, comments, and all docs in English) |
| Primary device | Real Android device, installed as PWA (direct-file distribution, not Google Play) |
| Target date | **2026-11-02** (first day of semester) — hard deadline |
| Doc set | `PRD.md` · `DESIGN.md` · `USER-FLOW.md` · `SITEMAP.md` · `ARCHITECTURE.md` · `DATA-MODEL.md` · `AGENTS.md` |
| Sources of truth | `README.md`, `docs/plan/MASTER-PLAN.md` (phases S0–S7), `web/runtime/styles/design.css`, `tailwind.config.cjs`, `package.json` |

---

## 1. Product summary

Ordivel is a **single-owner, personal life-management Progressive Web App**. It combines the owner's work items, daily routines, calendar, and an AI assistant into one Thai-language app that runs offline-first on Android.

- It is a **personal tool, not a SaaS**. Exactly one primary account. No multi-tenant features, no onboarding funnel, no marketing surfaces.
- It must behave like a **native app on Android**: installable, fast on a real device, working offline, and delivering real push notifications.
- **Zero-budget constraint is a product requirement**, not an engineering detail: the entire stack runs on free tiers only (Cloudflare, Supabase, Groq with OpenRouter as backup). Every feature must be deliverable and sustainable within those free quotas — this is enforced by the quota system and abuse-prevention mechanisms.

## 2. Personas

One persona drives every decision:

**The Owner** — the sole user and developer. Uses the app daily on an Android phone, in Thai, across unreliable network conditions. Priorities, in order:

1. Reliability of data (never lose a task; survives app restart and offline periods)
2. Speed on a real device (open → see today → act, in seconds)
3. Calm, focused UI (one job per screen; no decoration for its own sake — see `DESIGN.md`)

**Secondary actor — the AI assistant**: executes Thai-language commands inside strict quotas (see §4). It is a feature of the app, not a chat product.

## 3. V1 scope (locked)

V1 ships the **full feature set**. There is no V1 without these; anything else is V2+.

| # | Capability | Included in V1 |
|---|---|---|
| F1 | **Accounts** | Login with email + password **and** Google sign-in, on a real Android device |
| F2 | **Tasks** | Create, edit, mark done; data persists across app restart and offline sessions |
| F3 | **Routines** | Create, edit, mark; same persistence guarantees as tasks |
| F4 | **Calendar** | Unified view of work items, routines, and events |
| F5 | **AI assistant** | Thai-language commands, executed strictly **within user quotas** |
| F6 | **Notifications** | Real-device push notifications, delivered at scheduled times for tasks and routines |
| F7 | **Settings** | Account, theme (light/dark), notification preferences |
| F8 | **Offline shell** | PWA installability + offline usage (service worker, cached shell) |

## 4. Acceptance criteria (verbatim from `docs/plan/MASTER-PLAN.md`)

The system is "done for V1" when it runs on a **real Android device** and passes all five:

1. Login with both email/password and Google on real Android.
2. Add, edit, mark tasks and routines — with data persistence after closing/opening the app **and while offline**.
3. AI commands in Thai, within user quotas.
4. Real device notifications at scheduled times for tasks and routines.
5. Pass the original 3 test suites: **original image 0 pixels**, **route 22 test suite**, **feature 13**, and **offline usage**.

These five criteria are the definition of done for V1. No criterion may be traded away to save time; scope cuts come from §6 instead.

## 5. Constraints

| Constraint | Detail |
|---|---|
| Budget | **Zero.** Free plans only: Cloudflare (Workers + Static Assets), Supabase, Groq (OpenRouter as backup). No paid tier may become a dependency |
| Quota & abuse | AI usage and other metered operations run inside per-user quotas with abuse prevention (rate limiting). The quota model lives in `DATA-MODEL.md` |
| Network | Offline-first. Writes made offline must reconcile without duplication when connectivity returns |
| Distribution | Direct file / PWA install. **Not** Google Play (React Native APK is a separate, secondary goal — plan phase S7) |
| Language | UI copy is Thai. All identifiers, docs, and comments are English |
| Environments | `forge` (development) and `production`, per `README.md` |

## 6. Non-goals (V1 and beyond, unless re-scoped)

- Multi-user / team features, sharing, or permissions — this is a single-owner app.
- A marketing website or public landing page.
- Google Play distribution.
- Paid infrastructure of any kind.
- Rich-media features (voice, images in chat) beyond what free AI tiers provide.
- Other areas of this repository — `archive/` (retired builds and design demos), `app/` (reserved for the React Native phase S7), `backend/api/prototype/` — out of scope for this doc set by decision; do not extend them when implementing V1.

## 7. Milestones (re-verified against `docs/plan/MASTER-PLAN.md` on 2026-11-01)

From `docs/plan/MASTER-PLAN.md`:

| Phase | Name | Status |
|---|---|---|
| S0 | Baseline | Completed |
| S1 | Accounts and Email | Completed 2026-10-13 |
| S2 | Notifications and AI | Closed 2026-10-16 — AI live within quota, notify sender moved to Supabase, verified on a real device |
| S3 | Wrapped with Next.js | Completed 2026-10-16 on develop (not yet production) |
| S4 | Full Next.js + TypeScript + React | Completed 2026-10-19 on develop (not yet production) |
| S5 | Change to Tailwind page by page | **Not started** (the phase that may slip if time runs out) |
| S6 | Close work and activate | **Not started** (S1–S2 and verification criteria must land on time) |
| S7 | APK app with React Native | Not started — secondary goal, planned after 2026-11-02 |

Deployment status: `forge` (web + Worker) auto-deploys on every push to `develop`; the `production` Worker is **not yet deployed**. Worker-side tests: 225 passing cases.

## 8. Success metrics

1. All five acceptance criteria in §4 pass on the owner's real Android device.
2. The 3 test suites remain green on every merged change (gate defined in `AGENTS.md`).
3. Zero dollars spent on infrastructure from V1 day one through the semester.
4. The UI matches `DESIGN.md` with no unlogged drift (drift log is in `DESIGN.md` §15).

## 9. Risks and mitigations (2026-10-30, re-verified 2026-11-01)

| Risk | Severity | Mitigation |
|---|---|---|
| **1 day to deadline (2026-11-01); S5–S6 not started** | Critical | Ship on the existing CSS/token pipeline (`web/runtime/styles/design.css` already works; `forge` auto-deploys on push). Treat S5 (page-by-page Tailwind) as post-deadline polish, as the plan already allows |
| Production deploy still pending (forge is automated) | Critical | Run the `production` deploy as the first calm task after the deadline; never demo from a local build |
| Design-token drift (`design.css` ↔ `tailwind.config.cjs` ↔ master demo disagree) | High | Governed by `DESIGN.md` (§1 governance + §15 drift log). One edit point: `web/runtime/styles/design.css` |
| Free-tier quota exhaustion (Groq / Supabase / Cloudflare) | Medium | Quota system + abuse prevention are in scope (§5); monitor usage in-app |
| Offline write conflicts (duplicate sync) | Medium | Reconciliation rule is specified in `DATA-MODEL.md` §6 — idempotent upserts by client-generated id |
| Single maintainer | Structural | This doc set exists so any AI agent (or a future contributor) can continue the work without oral history |

## 10. Change protocol for this document

1. Any change to V1 scope (§3) requires editing this file and citing the plan file it comes from.
2. Acceptance criteria (§4) are frozen — they mirror `MASTER-PLAN.md` and may not be reworded.
3. Milestone status (§7) is refreshed from `docs/plan/MASTER-PLAN.md` whenever that file changes.

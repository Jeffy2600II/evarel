# Ordivel — ARCHITECTURE.md

| Field | Value |
|---|---|
| Document | `ARCHITECTURE.md` — how the system is put together |
| Scope | `web/` PWA + shared `core/` + its Worker API and Supabase backend (per `PRD.md`) |
| Runtime constraints | Zero budget: free tiers only (Cloudflare, Supabase, Groq/OpenRouter) |
| Verified against | repository paths and `package.json` scripts as inspected 2026-10-30; re-verified against the F7 layout on 2026-11-01 |

---

## 1. System overview

```
Android device (primary target)
└── web/  · PWA front end
     │  classic/   committed build: index.html · sw.js (offline shell) · js/engine (27 modules) · styles
     │  src/       TS sources: engine/ (27 modules) + react/ runtime
     │  shared/    React page boxes (BOX.md convention) · next/ = serving route (Next.js)
     ▼
core/  · pure shared logic in TypeScript (23 files) — web today, the future native app tomorrow
     ▼
backend/api  · Cloudflare Worker (TypeScript)
     │  systems: auth · items · ai (agent/llm/quota/memory/tools) · notify (due/reminders/scheduler/sender/push-routes)
     ▼
backend/edge/notify-tick  · Supabase Edge Function, fired by pg_cron every minute (due reminders)
     ▼
Supabase ── Auth (email+password, Google) + Postgres (data of record; backend/db schema + migrations)
     │
     ├── Groq (primary) → OpenRouter (backup)      — AI assistant
     ├── Web Push (webpush-webcrypto)               — real device notifications
     └── SMTP                                       — transactional email
```

## 2. Front end — `web/` (verified structure, F7 layout)

```
web/
├── classic/              # committed build — what tests read and what ships offline
│   ├── index.html        # shell: mounts views, owns header/tab bar per SITEMAP
│   ├── sw.js             # service worker: offline shell + cache strategy
│   ├── js/engine/        # compiled engine (27 modules, numbers 00–25; slot 22 holds two files: views__auth + views__live-sync)
│   ├── js/react/         # compiled React islands (today, calendar, ai, …)
│   ├── js/route.js       # hash router (tab routes + full-page layers)
│   └── styles/           # design.css (token source) → app.css (compiled components)
├── src/
│   ├── engine/           # TypeScript sources of the engine (27 modules)
│   └── react/            # React runtime sources
├── shared/               # React page boxes — one folder per box: Page.jsx · BOX.md · parts/ · *.style.css
├── pages/                # page boxes on the factory conveyor (stats, all)
├── next/                 # Next.js serving route (S3/S4 complete; builds to build/web)
├── shell/                # S3 shell; node_modules home the build scripts use
└── data/ · styles/       # data trays · central molds (web/styles/MOLD-TABLE.md)
```

Layering rule (strict, top-down only): **router → views → services → core → network** — encoded in the engine's module order and mirrored by the pure logic in `core/`. Views never fetch; services never render. React page boxes read data through the trays (`*.tray.js`, `web/data/`) and never reach into engine internals (factory rule, `tools/factory/HOUSE-RULES.md`).

The engine itself is framework-free TypeScript compiled with esbuild (`build:ts`). React exists only as page boxes (`build:react`), and `web/next` is the serving route — that is the current architecture (S3/S4 complete), not a side experiment. `archive/` holds the retired frontends (`app-v13`, old design demos) and stays frozen.

## 3. Styling architecture

```
DESIGN.md (decisions)
   → web/runtime/styles/design.css   (values; the single edit point)
   → scripts/build-css.mjs           (Tailwind CLI → compiled app.css)
   → tailwind.config.cjs             (utility mapping to CSS vars — never literal values)
```

- Every color, radius, spacing, shadow, and motion value is a CSS variable in `design.css`. Tailwind utilities (`bg-surface`, `text-ink`, `rounded-card`, `ease-out-expo`…) map to those vars — they are aliases, not a second system.
- Governance and drift rules: `DESIGN.md` §1 and §15. Known drift (two competing `:root` blocks in `design.css`, the stale v29 demo citation, the pending indigo migration) is logged there and must be resolved as part of V1.

## 4. Back end — Cloudflare Worker (TypeScript)

- One Worker serves the JSON API in front of Supabase; static assets are served from the same zone (Cloudflare Static Assets).
- Systems (verified from `backend/api/src/systems`): **auth** (email+password, Google), **items** (tasks/routines/events routes, validation, abuse guards), **AI gateway** (agent · llm · quota · memory · tools; Groq primary, OpenRouter backup), **notify** (`due`, `reminders`, `scheduler`, `sender`, `push-routes`), plus shared `auth` / `ratelimit` / `smtp-mail` helpers. Due reminders are fired by the Supabase Edge Function `backend/edge/notify-tick` on a pg_cron minute tick — and that Edge Function imports and runs the **same** `scheduler`/`sender` modules from the Worker source (verified 2026-11-01). That is what MASTER-PLAN S2's “notify sender moved to Supabase” means: the code is shared, the scheduled runtime moved to the Edge Function.
- API conventions: JSON in/out; UTC timestamps everywhere (`DATA-MODEL.md` §2); client-generated ids accepted for idempotent upserts (§6 of that doc); errors are typed, never stringly.
- Worker tests: 225 passing cases at inspection. The notify suite runs via `npm run test:notify`.

## 5. Data & auth — Supabase

- Auth: Supabase Auth with both providers (email+password, Google). The Worker holds the service key; the front end never sees it.
- Database: Postgres. The schema of record lives in the Supabase migration scripts; the semantic contract is `DATA-MODEL.md`.
- RLS stays on even though this is a single-owner app — it is free hygiene and protects against future multi-account mistakes.

## 6. Integrations

| Integration | Provider | Notes |
|---|---|---|
| AI assistant | Groq (primary) → OpenRouter (backup) | Thai commands; enforced quotas; the AI never writes to storage directly — it goes through the same services as manual actions (`USER-FLOW.md` Flow 6) |
| AI memory | MemoryLake (`MEMORYLAKE_API_KEY`) | Backs assistant context; free tier |
| Push | Web Push via `webpush-webcrypto` | Real Android device delivery at `fire_at` times (Flow 7) |
| Email | SMTP (`SMTP_USER/PASS/FROM`) | Account flows (S1) |

## 7. Environments & secrets

| Environment | Purpose | Names (per `README.md`) |
|---|---|---|
| `forge` | Development | `ordivel-app-forge`, `ordivel-api-forge` |
| `production` | Official release | `ordivel-app`, `ordivel-api` |

Secrets (names only — values never enter code, docs, or chat): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `MEMORYLAKE_API_KEY`.

## 8. Build, test, and quality gates

Commands (from `package.json`):

| Command | Purpose |
|---|---|
| `npm test` | Worker API test suite |
| `npm run test:notify` | Notify system: due, reminders, push-routes, scheduler, sender |
| `npm run build:web:forge` / `build:web:production` | Build the web app per environment |
| `npm run build:css` / `build:ts` | CSS and TypeScript builds |
| `npm run build:react` / `check:react` | Compile / check the React page boxes |
| `npm run plan:check` | Plan consistency check (`tools/plan_check.py`); Node ≥ 20 required |

**Merge gate (no exceptions):** the visual parity gate (`scripts/run-shots-gate.sh`, 32 scenes, 0-pixel rule), the route and feature suites (`tests/history/v11route.mjs`, `tests/history/v11feat.mjs`), the browser equiv suites, and **offline usage**. These are the PRD acceptance criteria in executable form; see `AGENTS.md` for how agents must run them.

## 9. Performance & offline strategy

- `sw.js` (`web/runtime`) owns the offline shell; content data renders from cache first, then reconciles (`USER-FLOW.md` Flow 8).
- Budget mindset for a real device: open → interactive on cached shell without network; writes are optimistic; the network is an enhancement, not a precondition (`PRD.md` §5).
- No runtime framework, no polyfill bloat, no analytics in V1 — every byte is budget on a free tier.

## 10. Agent rules

`AGENTS.md` (repository root) is the binding rulebook for AI coding agents — this document describes the system; `AGENTS.md` governs the work. When they conflict, `AGENTS.md` wins and this file gets a fix in the same change.

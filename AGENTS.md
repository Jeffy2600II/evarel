# AGENTS.md — Ordivel

> **Who this file is for:** AI coding agents (Claude Code, Cursor, Windsurf, and any tool that reads the AGENTS.md standard). It is the binding rulebook. When any other document conflicts with this file, this file wins and the other file gets fixed in the same change.

## Project context (read this first)

Ordivel is a **single-owner, Thai-language, offline-first life-management PWA** (tasks, routines, calendar, AI assistant) running on **zero budget** — Cloudflare + Supabase + Groq/OpenRouter free tiers only. Primary device: real Android. Full product scope: `docs/PRD.md` §3. This doc set exists so you never need the owner to re-explain the project.

## 1. Read order (mandatory before any task)

1. `AGENTS.md` (this file)
2. `docs/PRD.md` — scope, acceptance criteria (§4, frozen), constraints
3. `docs/DESIGN.md` — the design system; the “Do's and Don'ts” section is hard bans
4. `docs/SITEMAP.md` + `docs/USER-FLOW.md` — screens and flows you must preserve
5. `docs/ARCHITECTURE.md` + `docs/DATA-MODEL.md` — how to build without breaking layering

## 2. Scope

- **In scope:** the `web/` PWA (classic runtime + React page boxes, served by `web/next`), the shared `core/` logic, and the `backend/` Worker API + Supabase assets.
- **Out of scope:** `archive/` (retired builds and design demos), `app/` (reserved for the React Native phase S7 — empty by design), `backend/api/prototype/`, any marketing site (`docs/PRD.md` §6). Do not touch them, do not "helpfully" extend them.

## 3. Design rules (short form of `docs/DESIGN.md`)

- **Tokens only.** Every color, radius, spacing, shadow, and motion value comes from `web/classic/styles/design.css` via CSS vars or Tailwind aliases (`bg-surface`, `rounded-card`, …). **Never write a literal hex, px radius, or ad-hoc shadow in a component.**
- **Single edit point.** Value changes happen in `web/classic/styles/design.css` only — the compiled `app.css` is never edited by hand — following the change protocol in `docs/DESIGN.md` Appendix A1 (decision log → tokens → demo → tailwind mapping, one commit).
- **Radius per class:** chip 12 · control 14 · card 26 · sheet 32 · pill 999 (`--r-*`; chip/control tokens are still pending in code — see docs/DESIGN.md D-006). Never improvise a radius.
- **One accent per view;** semantic colors are dots/icons, **never body text**; states = ink text on `-soft` backgrounds (`docs/DESIGN.md` § Colors — semantic rules + measured contrast).
- **Banned (the “AI look” list, `docs/DESIGN.md` § Do's and Don'ts):** gradients, glassmorphism, shadows on resting cards, colored body text, emoji as icons, decorative motion, all-caps, multi-column mosaics, fake content, new colors. If your output contains any of these, it is wrong by definition.
- **Both themes, always:** light and dark ship in the same change; dark buttons use ink-on-accent, not white (`docs/DESIGN.md` § Colors — Dark).
- **Font:** the shipped `--font` stack only — `system-ui … 'Noto Sans Thai'` (DD-7). Never add a family, `@font-face`, or font files.

## 4. Code rules

- **UI copy: Thai. Identifiers, comments, docs: English.** No all-caps Thai; emphasis by weight, never underline/italics (`docs/DESIGN.md` § Typography).
- **Layering is strict** (`docs/ARCHITECTURE.md` §2): router → views → services → core → network. Views never fetch; services never render. The AI never writes to storage directly — it goes through the same services as manual actions.
- **Offline-first:** writes are optimistic with client-generated UUIDs; reconciliation is idempotent upsert, last-write-wins, checklist monotonic (`docs/DATA-MODEL.md` §6). Never block the UI on the network.
- **No new runtime framework or dependency in `web/`** beyond the existing stack (TS engine modules, React page boxes, the `web/next` serving route). No new dependency without a stated free-tier-budget justification.
- Timestamps UTC `timestamptz`; ids UUID; naming per `docs/DATA-MODEL.md` §2.

## 5. Quality gate (before you claim any task is done)

Run and pass:

1. `npm test` — Worker suite (225 cases at baseline)
2. `npm run test:notify` — notify systems
3. Front end: the route and feature suites (`tests/history/v11route.mjs`, `tests/history/v11feat.mjs`), the browser equiv suites (`node tests/equiv/<name>_equiv.test.mjs`), and the visual parity gate `scripts/run_shots_gate.sh` — **32 scenes, 0-pixel rule** — plus **offline usage** (`docs/PRD.md` §4 item 5)

If you cannot run a suite, say so explicitly instead of claiming it passed.

## 6. Definition of done — UI checklist (copy into your task)

```
[ ] Uses only tokens (no literal colors/radii/shadows)
[ ] Light + dark both correct (dark buttons: ink on accent)
[ ] One accent element per view, max ~10% accent pixels
[ ] Radius from the --r-* scale only
[ ] Hit targets ≥ 44px; focus visible; reduced-motion honored
[ ] Thai copy, sentence case, no all-caps, no underline emphasis
[ ] Empty/loading/offline/error states present (docs/SITEMAP.md §5)
[ ] Motion only on state change (out-expo default; spring only for affirmative moments)
[ ] No item from the Do/Don't list (docs/DESIGN.md § Do's and Don'ts)
[ ] Visual parity suite passes (image 0 pixels)
```

## 7. Secrets & safety

Secret **names** only in code/docs: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `MEMORYLAKE_API_KEY`. Never print, copy, or commit values. The service key stays in the Worker; the front end never sees it.

## 8. Changing the docs themselves

- Product scope changes: `docs/PRD.md` (cite the plan file). Acceptance criteria are frozen.
- Visual changes: append to `docs/DESIGN.md` Appendix A2 decision log, then sync per A1. Log discovered drift in A3 — never "fix" drift silently.
- Schema changes: migration + `docs/DATA-MODEL.md` entry in the same commit (§8 there).

## 9. Working style

- Branch: `develop`. Small commits, conventional messages (`feat:`, `fix:`, `docs:`, `design:`).
- Every change ships both themes and passes the §5 gate before being called done.
- When a task is ambiguous, prefer the interpretation that keeps the app **calm, fast, and offline-safe** — that is the product (`docs/PRD.md` §2). Ask only when both readings would ship different behavior.

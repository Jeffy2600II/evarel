# Evarel — DESIGN.md

| Field | Value |
|---|---|
| Document | `DESIGN.md` — the design system of record |
| Status | Living document — the **single source of truth** for all visual decisions |
| Applies to | `web/` PWA — classic runtime + React page boxes (all screens, components, and states) |
| Reference themes | Light = primary (polished first) · Dark = full parity, already implemented in code |
| Feel | **"Precision with warmth"** — Linear/Vercel-grade discipline, delivered with soft curves and a calm, friendly face |
| Verified | All contrast ratios in §12 computed with a WCAG 2.1 script on 2026-10-30 · full doc-vs-repo consistency audit 2026-11-01 (drift log re-checked against the actual files, not from memory) |
| Sources | `web/classic/styles/design.css` (token source; `scripts/build-css.mjs` compiles it → `app.css`), `tailwind.config.cjs`, `archive/design/*.html` |

---

## 1. How this file works (governance)

Four artifacts touch Evarel's visual language. Exactly one of them is the source of truth:

```
DESIGN.md  ── semantic rules (this file; the ONLY place decisions are made)
    │
    ├── archive/design/*.html ────── visual reference (pixel parity target)
    │
    ├── web/classic/styles/design.css ─ implementation values (THE single edit point;
    │                                    build-css.mjs compiles it → app.css)
    │
    └── tailwind.config.cjs ────── utility mapping only (never edit values here)
```

**Change protocol (one change, four touches, same commit):**
1. Add the decision to the Decision Log (§14).
2. Update the paste-ready token block in §3.4.
3. Refresh `web/classic/styles/design.css` (never the compiled `app.css`) and, if needed, the master demo.
4. `tailwind.config.cjs` must never gain a literal value — it maps to CSS vars only (it already does; keep it that way).

Current drift between these artifacts is recorded in §15 and must be burned down as part of V1.

## 2. Feel and principles

**Precision with warmth.** The skeleton is Linear/Vercel: flat surfaces, hairline borders, restrained color, tight type. The skin is Evarel: generous radius, spring confirmations, the system + Noto Sans Thai type stack (DD-7), a calm near-white canvas. The result reads engineered, not decorated — friendly because of geometry and rhythm, never because of ornament.

| # | Principle | In practice |
|---|---|---|
| P1 | One job per screen | Every screen answers one question ("What's today?", "What's due?"). Never build dashboard mosaics |
| P2 | Flat by default | Surfaces are flat with a 1px `--c-line` border. Elevation is reserved for true overlays (§7) |
| P3 | Geometry is the personality | Radius is generous and *consistent* — the roundness IS the brand. Never mix radii on one screen |
| P4 | Color is meaning, not decoration | Indigo marks primary actions and active states only. Neutrals do ~90% of the work. Accent pixels ≤ ~10% of any view |
| P5 | Motion explains, never decorates | Animate state changes only (§9). Nothing animates on scroll or at rest |
| P6 | Thai-first typography | Thai script sets line-heights and forbids all-caps. Never apply Latin tricks (uppercase, tight tracking) to Thai |

## 3. Color

### 3.1 Palette — Light (primary theme)

| Token | Value | Role |
|---|---|---|
| `--c-bg` | `#F7F7F9` | App canvas behind surfaces |
| `--c-surface` | `#FFFFFF` | Cards, sheets, inputs — everything raised |
| `--c-text` | `#14141A` | Primary ink |
| `--c-muted` | `#6A6A77` | Secondary text, inactive icons (AA: 4.98:1 on bg) |
| `--c-line` | `#ECECF0` | 1px hairline borders |
| `--c-fill` | `#F0F0F4` | Quiet interactive fill (chips, secondary buttons, selected rows) — **new in this system, fixes D-003** |
| `--c-accent` | `#4F46E5` | Primary actions, active tab, links, focus (6.29:1 on white) |
| `--c-accent-text` | `#4F46E5` | Inline accent text (links, active labels) |
| `--c-accent-soft` | `#EEF2FF` | Selected/active backgrounds, info banners |
| `--c-on-accent` | `#FFFFFF` | Text on solid accent (6.29:1) |
| `--c-accent-2` | `#6366F1` | Secondary accent — **use sparingly** (hover tint, gradient-free depth on charts) |
| `--c-ok` | `#18A66A` | Success state — icon/dot only, **never small text** (3.13:1) |
| `--c-on-ok` | `#14141A` | Text on solid ok (5.9:1 — dark ink, not white) |
| `--c-warn` | `#E8890C` | Warning state — icon/dot only, **never text on white** (2.62:1 fails) |
| `--c-warn-soft` | `#FFF3E0` | Warning backgrounds (pair with ink text) |
| `--c-danger` | `#E5484D` | Destructive actions — icon/fill only, not small text (3.91:1) |
| `--c-danger-soft` | `#FDECEC` | Destructive backgrounds (pair with ink text) |

> **2026-11-01 audit:** the shipped TOKENS block differs from these targets in `--c-line` (`#E8E8ED`), `--c-fill` (`#EDEDF1`), `--c-scrim`, `--shadow`, `--shadow-fab`, and `--font` — every delta is logged in §15. Values in this table stay the decision of record; never "fix" code silently (change protocol §1).

### 3.2 Palette — Dark (full parity)

| Token | Value | Note |
|---|---|---|
| `--c-bg` | `#0E0E12` | Canvas |
| `--c-surface` | `#1A1A21` | Raised surfaces |
| `--c-text` | `#F2F2F5` | Ink (17.24:1 on bg) |
| `--c-muted` | `#9A9AA8` | Secondary (6.94:1) |
| `--c-line` | `#2A2A33` | Hairlines (decorative — AA exempt) |
| `--c-fill` | `#23232C` | Quiet fill — new |
| `--c-accent` | `#818CF8` | Actions (6.46:1 on bg) |
| `--c-accent-text` | `#A5B4FC` | Inline accent text (9.66:1) |
| `--c-accent-soft` | `#23234A` | Selected backgrounds |
| `--c-on-accent` | `#0E0E12` | **Dark ink on accent** (6.46:1) — replaces white text; this is the Linear-dark pattern |
| `--c-accent-2` | `#8386F6` | Secondary accent |
| `--c-ok` | `#18A66A` | Same family as light |
| `--c-on-ok` | `#0E0E12` | Ink on solid ok |
| shadows | `none` / fab only | Dark relies on surface-vs-bg contrast, not elevation |

### 3.3 Semantic color rules (this is what kills the "AI look")

1. **State colors are dots and icons, not prose.** To communicate state in words: ink text on a `-soft` background with a colored dot or icon. `--c-ok/--c-warn/--c-danger` never color body text (they fail AA at text sizes — see §12).
2. **One accent per view.** If a screen already has a primary button, the active tab, and a link, that is the quota. No fourth accent element.
3. **No gradients.** Flat fills only, in both themes. `--c-accent-2` exists for hover tints and chart series — not for gradient washes.
4. **Neutrals first.** When unsure, the answer is `--c-fill`, `--c-line`, or `--c-muted` — not accent.

### 3.4 Token block (decisions of record — merge via the §1 protocol; **not** byte-identical with `design.css` today, see the note below the block)

```css
:root{
  --font:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans Thai','Noto Sans Thai UI',sans-serif;
  /* neutrals — carried from the shipped app; shipped deltas (line/fill hex) are logged in §15 */
  --c-bg:#F7F7F9; --c-surface:#fff; --c-text:#14141A; --c-muted:#6A6A77; --c-line:#ECECF0;
  /* accent — indigo family (DD-1) */
  --c-accent:#4F46E5; --c-accent-text:#4F46E5; --c-accent-soft:#EEF2FF; --c-on-accent:#fff;
  --c-accent-2:#6366F1;
  /* semantics */
  --c-ok:#18A66A; --c-on-ok:#14141A; --c-warn:#E8890C; --c-danger:#E5484D;
  --c-danger-soft:#FDECEC; --c-warn-soft:#FFF3E0;
  /* NEW: quiet fill (fixes D-003) */
  --c-fill:#F0F0F4;
  /* continuity vars the code defines and components/Tailwind rely on (ink-* is violet-era — re-tint at DD-1) */
  --c-on-ink-soft:rgba(255,255,255,.2); --c-on-fill:#fff;
  --c-ink-a:#4B2FF5; --c-ink-b:#5B3CFA; --c-ink-c:#5836FF;
  /* spacing — 8px scale, unchanged */
  --s1:8px; --s2:16px; --s3:24px; --s4:32px;
  /* radius — canonical scale (DD-2) */
  --r-chip:12px; --r-control:14px; --r-card:26px; --r-sheet:32px; --r-pill:999px;
  /* elevation — the shipped --shadow is a 1px ring applied to cards (§7); no blur at rest */
  --shadow:0 0 0 1px rgba(20,20,26,.035);
  --shadow-fab:0 6px 20px rgba(75,47,245,.35); /* violet-era tint — re-tint to indigo in the DD-1 commit */
  --c-scrim:rgba(10,10,20,.45);
  /* motion & layout — these MUST exist or Tailwind ease aliases and the dock layout break */
  --t-fast:.18s; --t-med:.32s; --ease:cubic-bezier(.22,1,.36,1); --spring:cubic-bezier(.34,1.56,.64,1);
  --nav-h:64px; --col-max:480px; /* TOKENS block ships 60, the v16 pass ships 64 (effective) — unify in D-006 */
  --dock:calc(var(--nav-h) + env(safe-area-inset-bottom,0) + 10px);
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --c-bg:#0E0E12; --c-surface:#1A1A21; --c-text:#F2F2F5; --c-muted:#9A9AA8; --c-line:#2A2A33;
  --c-accent:#818CF8; --c-accent-text:#A5B4FC; --c-accent-soft:#23234A; --c-on-accent:#0E0E12;
  --c-accent-2:#8386F6; --c-fill:#23232C; --c-on-ink-soft:rgba(0,0,0,.14);
  --c-ok:#18A66A; --c-on-ok:#0E0E12; --c-warn:#E8890C; --c-danger:#E5484D;
  --c-danger-soft:#3A1E21; --c-warn-soft:#3A2D14;
  --shadow:none; --shadow-fab:0 2px 8px rgba(0,0,0,.45);
}}
:root[data-theme="dark"]{
  --c-bg:#0E0E12; --c-surface:#1A1A21; --c-text:#F2F2F5; --c-muted:#9A9AA8; --c-line:#2A2A33;
  --c-accent:#818CF8; --c-accent-text:#A5B4FC; --c-accent-soft:#23234A; --c-on-accent:#0E0E12;
  --c-accent-2:#8386F6; --c-fill:#23232C; --c-on-ink-soft:rgba(0,0,0,.14);
  --c-ok:#18A66A; --c-on-ok:#0E0E12; --c-warn:#E8890C; --c-danger:#E5484D;
  --c-danger-soft:#3A1E21; --c-warn-soft:#3A2D14;
  --shadow:none; --shadow-fab:0 2px 8px rgba(0,0,0,.45);
}
```

> **Reality check (2026-11-01):** `design.css` currently contains **three** competing token layers — the TOKENS block (L7), the “v16 design pass” (~L431), and a semantic-text pass (~L532) — the later ones win the cascade (radius 32/38, spacing 10/20/28/40, softer neutrals, no accent override; details in **D-006**). This document stays the decision of record; **do not paste §3.4 wholesale** until the D-006 consolidation — merge per the §1 protocol, keeping every var the code defines.

## 4. Typography

One family pair — the device system stack: Latin resolves to the platform system face (`system-ui…`), Thai to **'Noto Sans Thai'**. Decided 2026-10-23 after comparing 7 typefaces (recorded in `extra.css`); **no webfont, no `@font-face`, no font files on the wire** — free-tier bytes and offline-first win together. An earlier draft of this doc named “IBM Plex Sans Thai” as the app font; that was an error — IBM Plex has never shipped in `web/` — retired by **DD-7** (D-008). Hierarchy comes from size, weight, and color — not from new fonts.

| Role | Size / line-height | Weight | Tracking | Usage |
|---|---|---|---|---|
| Display | 28 / 34 | 700 | −0.01em | One per screen (screen title). Thai marks make tighter tracking risky — −0.01em is the floor (DD-5) |
| H1 | 24 / 31 | 700 | −0.01em | Page-level titles (calendar month, section pages) |
| H2 | 20 / 27 | 600 | −0.01em | Card-group titles |
| H3 | 17 / 24 | 600 | 0 | List-row titles, sheet headers |
| Body | 15 / 24 | 400 | 0 | Default UI text. Line-height 1.6 — Thai stacks tall marks and needs the air |
| Body-strong | 15 / 24 | 600 | 0 | Emphasis inside body (use weight, never underline) |
| Secondary | 13 / 20 | 400 | 0 | `--c-muted` metadata: timestamps, counts, helper text |
| Caption | 12 / 16 | 500 | 0 | Chips, badges, form labels |

Rules:
1. **No all-caps, anywhere.** Thai has no uppercase; mixed all-caps Latin next to Thai looks broken. Sentence case everywhere.
2. **Emphasis = weight** (400→600), or `--c-text`→`--c-accent-text` for links. Never italics, never underline (reserved for links on web views only).
3. **Numbers are tabular.** Counts, times, quota meters use `font-variant-numeric: tabular-nums` so digits don't jitter.
4. **Thai line-height**: shipped body is **1.45** (the `design.css` body rule) and is parity-locked through 2026-11-02 — never lower it for Thai; raising body to the 1.6 target is re-decided at the D-006 consolidation (log it in §14 if raised). Descending Thai vowels (ฤๅ ฦๅ ๎) clip at 1.1–1.2 — headings never below ~1.3.
5. Maximum line length ~34–40 Thai characters per line inside the 480px column at Body size — achieved naturally by the column; do not widen past `--col-max`.

## 5. Spacing and layout

- **Scale (existing, unchanged):** `--s1:8 · --s2:16 · --s3:24 · --s4:32`. Half-step 4px allowed for icon-to-label gaps only.
- **Column:** `--col-max: 480px` centered. Content never widens past it — this is a phone app, not a responsive website (P6 → single column, stacked sections; no multi-column mosaics).
- **Screen padding:** 16px (`--s2`) left/right; 24px (`--s3`) top under the header.
- **Card padding:** 16px (`--s2`). **Sheet padding:** 24px (`--s3`).
- **Vertical rhythm:** sections separated by 24px (`--s3`); items inside a section by 8px (`--s1`).
- **Bars:** header 56px tall, transparent over `--c-bg`; bottom tab bar `--nav-h: 64px` + `env(safe-area-inset-bottom)`.
- **Touch targets ≥ 44×44px**, always — including icons inside 24px boxes (pad with hit area, not pixels).
- Safe areas: `env(safe-area-inset-bottom)` on tab bar, FAB, and sheets; `env(safe-area-inset-top)` under notches.

## 6. Radius (the signature)

Canonical scale (DD-2). **One radius per component class — never improvised:**

| Token | Value | Applies to |
|---|---|---|
| `--r-chip` | 12px | Chips, tags, small badges, inline filters |
| `--r-control` | 14px | Buttons, inputs, selects, segmented controls, toggles |
| `--r-card` | 26px | Cards, list groups, banners, images |
| `--r-sheet` | 32px | Bottom sheets, modals, dialogs |
| `--r-pill` | 999px | Pills, avatars, status dots (with icon), FAB is a circle |

Migration status (re-verified 2026-11-01): the old `tokens.css` (20/28) is gone; the restructured `design.css` TOKENS block already carries 26/32, matching `tailwind.config.cjs` (`card:26px / sheet:32px` — stays as-is). Open conflict: a later `:root` block in the same file (the v16 pass) redefines card 32 / sheet 38 and wins the cascade — drift **D-006**. `--r-chip`/`--r-control` are still not defined in code; introduce them during the D-006 consolidation.

## 7. Elevation and borders

1. **Default surface: flat + 1px `--c-line` border.** No shadow. This is the single biggest "looks engineered, not generated" lever.
2. **Blurred elevation is for overlays only** — bottom sheets, popovers, menus. Cards at rest never carry a blur. *(Audit 2026-11-01: the shipped `--shadow` is a 1px ring — `0 0 0 1px rgba(20,20,26,.035)` — and `.ev-card` applies it at rest as its soft hairline; that ring *is* rule 1's border expressed as a shadow, so it is allowed. §3.4 now carries the ring value.)*
3. **`--shadow-fab`** belongs to the FAB alone.
4. **Dark mode:** shadows off (existing behavior); separation comes from `#1A1A21` on `#0E0E12` + hairlines.
5. Scrim over content: `--c-scrim` (40% black) behind every sheet/dialog.
6. Never stack two shadows; never blur a border into a "glow".

## 8. Iconography

- 24px grid, **1.75px stroke**, round caps and joins (soft = on-brand), inline SVG in the components. (`web/classic/icons/` holds the PWA launcher PNGs only — audited 2026-11-01.)
- Inactive: `--c-muted`. Active/selected: `--c-accent` (icon only — the tab bar pairs an active icon with `--c-accent-text` label).
- Filled variant allowed for the active tab state (outline → filled is a cheap, legible "you are here").
- **No emoji as UI icons. No emoji bullets.** Emoji appear only inside user-generated content (task notes, chat).

## 9. Motion

| Token / value | Use |
|---|---|
| `--t-fast` 180ms | Default micro-feedback: presses, toggles, chips |
| 240ms (guidance) | Content changes, tab switches, list reordering |
| 320ms (guidance) | Sheet enter/exit |
| `out-expo` `cubic-bezier(.22,1,.36,1)` | Default curve — everything that enters or moves |
| `spring` `cubic-bezier(.34,1.56,.64,1)` | **Only** affirmative micro-moments: task marked done, chip selected, quota saved. Once per moment — never on lists or screens |

Rules: animate **state changes only**; nothing moves at rest or on scroll. Exits are always faster than enters (≤160ms, no spring). Honor `prefers-reduced-motion` by collapsing to 80ms opacity fades. Never animate `--c-line` borders or layout of unrelated elements.

## 10. Components (spec sheet)

**Button**
- Heights: 48 (primary), 40 (standard), 32 (compact, in-toolbars). Padding 0 20px; radius `--r-control`; type Body-strong.
- Primary: `--c-accent` fill, `--c-on-accent` text. Hover: `--c-accent-2`. Pressed: opacity .88. Focus: 2px `--c-accent` outline offset 2px.
- Secondary: `--c-surface` fill, 1px `--c-line` border, ink text. Quiet: `--c-fill` fill, no border.
- Destructive: `--c-danger` fill + white text, or `--c-danger-soft` fill + ink text for low-emphasis.
- One primary button per view (P4). Disabled: 40% opacity, never accent-colored.

**Input**
- Height 48, radius `--r-control`, 1px `--c-line` (never bottom-border-only — box inputs match the round geometry).
- Focus: border `--c-accent` 1.5px + 3px `--c-accent-soft` ring. Error: border `--c-danger` + helper text in ink on `--c-danger-soft`, 12px. Labels: Caption, above the field.

**Chip / Tag** — height 28–32, radius `--r-chip`, `--c-fill` bg, ink text; selected: `--c-accent-soft` bg + `--c-accent-text` text + 1px `--c-accent` border. Dots (status): 8px circles from semantic colors.

**Card** — `--c-surface`, 1px `--c-line`, radius `--r-card`, pad 16. Grouped rows inside a card: separated by 1px `--c-line` inset lines (16px from the left edge, aligned under text — not under icons).

**List row** — 56px min height; leading icon 24 (muted), title H3, meta Secondary; trailing control right-aligned. Completed tasks: title `--c-muted` + line-through.

**Sheet (bottom)** — radius `--r-sheet` top corners only, `--shadow`, `--c-scrim` behind, pad 24, 4px grab handle centered at top (24×4, `--c-line`). Enter 320ms `out-expo`; exit 160ms.

**Dialog** — centered card, max 360px wide, radius `--r-sheet`, scrim behind. Title H3, body Body, actions right-aligned (text buttons: quiet).

**Tab bar** — bottom, `--nav-h` 64 + safe-area, `--c-surface` top hairline. 4 items: Today · Tasks · Calendar · AI (Settings lives in the header). Active: icon `--c-accent` (filled) + label 12px `--c-accent-text`; inactive: `--c-muted` outline. Never more than 5 items. *(2026-11-01 check: the shipped build's tabs are วันนี้ · รายการ · ปฏิทิน · สถิติ, with AI and Settings as full pages — navigation contract drift is logged as D-007.)*

**Header** — 56px, transparent. The header shows only context (e.g., the current month at H1); the *screen* owns the one Display title inside the content area. Right side: 1–2 icon actions (settings, search).

**FAB** — 56px circle, `--c-accent`, `--c-on-accent` icon, `--shadow-fab`, bottom-right 24px above the tab bar + safe-area. One FAB max per screen; it creates the screen's core object ("+" on Tasks).

**Toast** — pill, `--c-fill` at 96% opacity backdrop-free, ink text 13px + a 20px icon tinted with the semantic color (dots stay 8px per the Chip spec); bottom-center above the tab bar; auto-dismiss 3.5s; never stacks more than one.

**Empty state** — icon 48px muted, one line H3, one line Secondary, **one** primary action. No illustration, no full-screen art.

**Skeleton** — `--c-fill` blocks at final layout size, radius matching the component, gentle 1.2s opacity pulse. Never spinners for content areas.

**Quota meter** (AI usage) — 4px track `--c-fill`, full-radius; fill `--c-accent` → `--c-warn` at 80% → `--c-danger` only at 100% (bar color is a state, so it may use semantic colors). Percentage label uses tabular-nums.

## 11. Dark mode

Full parity is mandatory and already implemented via `prefers-color-scheme` + `[data-theme]` in `design.css`. Rules: every component ships both themes in the same change; both themes pass §12 contrast; the in-app toggle (`data-theme`) writes the same values as the media query. Light is polished first (primary theme), dark follows immediately — never ship light-only components.

## 12. Accessibility (measured 2026-10-30, WCAG 2.1)

| Pair | Ratio | Verdict |
|---|---|---|
| Ink on bg | 17.15:1 | AA/AAA |
| Muted on bg | 4.98:1 | AA |
| Accent on white | 6.29:1 | AA |
| White on accent | 6.29:1 | AA |
| Ink on accent-soft | 16.41:1 | AAA |
| Dark: ink on bg | 17.24:1 | AAA |
| Dark: accent-text on bg | 9.66:1 | AAA |
| Dark: ink on accent (buttons) | 6.46:1 | AA |
| `--c-ok` as text on white | 3.13:1 | **AA-large only → not body text** |
| `--c-warn` as text on white | 2.62:1 | **FAIL → never text; icon/dot only** |
| `--c-danger` as text on white | 3.91:1 | **AA-large only → not body text** |

Consequences (encoded in §3.3): semantic colors never color body text; states are communicated with dot/icon + ink text on `-soft` backgrounds. Additional floors: hit targets ≥44px; focus visible on every interactive element (2px accent outline, offset 2px); `prefers-reduced-motion` honored; contrast of hairlines is decorative (AA-exempt).

Note (2026-11-01): the code still runs violet (`#4B2FF5` light, `#6E5BEF` dark) — the DD-1 indigo migration is pending, and the dark accent currently in code has **not** been measured here; re-run the contrast script in the same commit that applies DD-1.

## 13. Anti-patterns (the "looks AI-generated" blacklist)

These are **banned** in Evarel. Each line is a real failure mode of model-generated UI:

1. **Gradients** — especially purple→blue buttons, banners, or "hero washes". Flat fills only.
2. **Glassmorphism / backdrop-blur cards** — frosted panes over busy backdrops. Flat surfaces + hairlines instead.
3. **Shadows on resting cards.** A shadow on a static card is the #1 generic-AI tell. 1px border.
4. **Colored body text** — semantic-colored sentences, rainbow metadata, neon labels. §3.3 rule 1.
5. **Emoji as icons or bullets** — "🚀 แจ้งเตือน" in a nav bar reads as a toy. Icon set only; emoji live in user content.
6. **Stock illustration / mascot art / decorative photos** on empty states or headers. Icon + text + action.
7. **Landing-page layouts inside the app** — centered hero + three feature cards + CTA stack. That pattern belongs to marketing pages, not a personal tool.
8. **Mixed radii on one screen** — 4px chips next to 26px cards next to 999px buttons. Radius comes from §6, nowhere else.
9. **Accent flooding** — more than ~10% accent pixels, or two competing accent elements (P4).
10. **Decorative motion** — anything that moves while the user isn't causing it (scroll parallax, idle float, pulsing headers).
11. **New colors invented per screen.** Every color comes from `tokens.css` or it doesn't ship (governance §1).
12. **All-caps Thai, underlined emphasis, italics** — §4 rules 1–2.
13. **Multi-column dashboard mosaics** at 480px. Single column, stacked sections (P6).
14. **Placeholder-shaped content** — fake "Team collaboration" cards, features the product doesn't have. The UI shows real data or a real empty state — nothing aspirational.

## 14. Decision log

| ID | Decision | Date |
|---|---|---|
| DD-1 | Accent family migrates violet `#4B2FF5` → indigo `#4F46E5` (light) / `#818CF8` (dark). Neutrals, ok/warn/danger unchanged — continuity with the shipped app, new accent identity | 2026-10-30 |
| DD-2 | Canonical radius: chip 12 · control 14 · card 26 · sheet 32 · pill 999. `tokens.css` updates from 20/28 → 26/32 to match the demo-v29 direction already mapped in `tailwind.config.cjs` | 2026-10-30 |
| DD-3 | Dark-mode primary buttons switch from white text to dark ink (`--c-on-accent:#0E0E12`); `--c-on-ok` becomes ink. Measured, stronger contrast in both cases | 2026-10-30 |
| DD-4 | `--c-fill` introduced (quiet interactive fill), fixing the undefined Tailwind `fill` mapping | 2026-10-30 |
| DD-5 | Typography ramp locked (§4); Thai-safe tracking floor −0.01em; line-height floors 1.6/1.3; tabular numerals | 2026-10-30 |
| DD-6 | Motion table locked (§9): out-expo default, spring reserved for affirmative moments, reduced-motion honored | 2026-10-30 |
| DD-7 | Font stack locked to the shipped system stack (`system-ui … 'Noto Sans Thai' …`) — no webfont, no `@font-face`, no font files. The “IBM Plex Sans Thai” claim in this doc is retired as an error; the owner's system-font decision is recorded in `extra.css` (2026-10-23) | 2026-11-01 |

## 15. Drift log (burn down as part of V1)

| ID | Drift found | Resolution |
|---|---|---|
| D-001 | (2026-10-30) `tokens.css` radius 20/28 vs `tailwind.config.cjs` 26/32 | Superseded 2026-11-01: `tokens.css` dissolved into `web/classic/styles/design.css` (F7 restructure); its TOKENS block now carries 26/32, matching the Tailwind mapping. Residual conflict → D-006 |
| D-002 | `tailwind.config.cjs` cites `archive/design/master-demo-v29.html`; `archive/design/` holds v2 / v7 / v12 / v12-intended / `Evarel v24.html` only — **v29 still does not exist** (re-verified 2026-11-01) | Re-issue one current master demo (single file), fix the citation; demos are *referenced by* DESIGN.md, never the reverse |
| D-003 | (2026-10-30) Tailwind maps `fill` → `var(--c-fill)` but tokens never defined it | **Resolved (definition only)** — `--c-fill` exists (light `#EDEDF1`, dark `#262630`), but those hexes differ from the §3.1/§3.4 target (`#F0F0F4`/`#23232C`). Reconcile one side during the D-006 consolidation |
| D-004 | (2026-10-30) token file header cited demo **v2** — stale provenance | Carried over: `design.css` now cites `archive/design/master-demo-v24.html`, but the file on disk is named `Evarel v24.html`; the same header also cites `archive/design/master-demo-v3.html` — **no v3 exists anywhere** (audit 2026-11-01). Fix both citations. Governance (§1) unchanged: DESIGN.md is the decision point |
| D-005 | Accent family mismatch across artifacts (violet in app, indigo decided) | **Still open** (2026-11-01): code runs violet `#4B2FF5` (light) / `#6E5BEF` (dark); DD-1 targets `#4F46E5` / `#818CF8`. `--c-on-ok` is `#fff` in code vs ink per DD-3; the violet-tinted `--shadow-fab` (`rgba(75,47,245,.35)`) and the `--c-ink-a/b/c` card-gradient family re-tint in the same commit. Apply as one commit across all four artifacts |
| D-006 | **New (2026-11-01; extended same day):** `design.css` contains **three** competing token layers — the TOKENS block (L7: radius 26/32, spacing 8/16/24/32, `--nav-h` 60), the “v16 design pass” (L431: radius 32/38, spacing 10/20/28/40, `--nav-h` 64, softer neutrals), and a semantic-text pass (L532: `--c-ok` `#0E8A55`/`#3DD598`, `--c-muted` `#65637A`/`#A3A1B5`, `--c-line` `#E1DFEB`/`#363544`, plus text-safe tokens `--c-ok-text`/`--c-warn-text`/`--c-danger-text`/`--c-danger-fill`/`--c-line-ctl`/`--c-halo` that this doc does not yet govern). The later blocks win the cascade, so the *effective* values contradict DD-2, §3.1 and §5 | Consolidate into ONE canonical block aligned with the decision log — or re-decide via §14 if the later direction is preferred (owner's call). Introduce the missing `--r-chip`/`--r-control` tokens and adopt or retire the text-safe tokens in the same commit |
| D-007 | **New (2026-11-01):** navigation drift — the implemented router (`web/classic/js/route.js`) uses hash routes: tabs `#/today #/all #/calendar #/stats`, full pages `#/ai #/settings`; auth is an in-app layer (no `/login` route). SITEMAP §1 specifies path routes incl. `/tasks` and `/routines`, and §10 above specifies a Today·Tasks·Calendar·AI tab bar | One reconciling decision: adopt the implemented navigation into SITEMAP/§10, or change the router to the spec. Until then, SITEMAP §1 carries a verified implementation note |
| D-008 | **New (2026-11-01):** typography drift — this doc claimed “IBM Plex Sans Thai (already the app's `--font`)”; false on both counts. `web/` contains no IBM Plex anywhere; the shipped `--font` is `system-ui,…,'Noto Sans Thai',…` with the owner's system-font decision recorded in `extra.css` (2026-10-23, after comparing 7 typefaces). Body line-height ships at 1.45, not the 1.6 floor stated in §4 | §4 and §3.4 corrected to the system stack (**DD-7**); 1.45 is parity-locked through 2026-11-02, the 1.6 floor is re-decided at the D-006 consolidation |

## 16. Sources

- `web/classic/styles/design.css` — token source (TOKENS block + v16 pass + semantic-text pass; see D-006) — re-verified 2026-11-01
- `web/classic/styles/extra.css` — app-only styles; records the system-font decision (2026-10-23) — audited 2026-11-01
- `web/classic/styles/app.css` — compiled component CSS (build artifact of `scripts/build-css.mjs`; never edit by hand)
- `tailwind.config.cjs` — utility mapping (colors → CSS vars; radius; `--col-max:480px`; timing curves)
- `archive/design/*.html` — visual reference chain (v2 / v7 / v12 / `Evarel v24`)
- WCAG 2.1 contrast math: computed with a contrast script on 2026-10-30, values reproduced in §12

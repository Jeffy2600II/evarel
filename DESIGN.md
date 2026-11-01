---
version: alpha
name: Ordivel
description: "Personal life-management PWA (tasks, routines, calendar, AI). Phone-first, Thai-first, offline-first. Feel — 'Precision with warmth': Linear/Vercel discipline with soft geometry and a calm, friendly face."
omitted: []
colors:
  primary: "#4F46E5"
  bg: "#F7F7F9"
  surface: "#FFFFFF"
  text: "#14141A"
  muted: "#6A6A77"
  line: "#ECECF0"
  fill: "#F0F0F4"
  accent: "#4F46E5"
  accent-text: "#4F46E5"
  accent-soft: "#EEF2FF"
  on-accent: "#FFFFFF"
  accent-2: "#6366F1"
  ok: "#18A66A"
  on-ok: "#14141A"
  warn: "#E8890C"
  warn-soft: "#FFF3E0"
  danger: "#E5484D"
  danger-soft: "#FDECEC"
  scrim: "#0A0A1473"
  primary-dark: "#818CF8"
  bg-dark: "#0E0E12"
  surface-dark: "#1A1A21"
  text-dark: "#F2F2F5"
  muted-dark: "#9A9AA8"
  line-dark: "#2A2A33"
  fill-dark: "#23232C"
  accent-dark: "#818CF8"
  accent-text-dark: "#A5B4FC"
  accent-soft-dark: "#23234A"
  on-accent-dark: "#0E0E12"
  accent-2-dark: "#8386F6"
  on-ok-dark: "#0E0E12"
typography:
  display:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 34px
    letterSpacing: -0.01em
  h1:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 31px
    letterSpacing: -0.01em
  h2:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 27px
    letterSpacing: -0.01em
  h3:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 24px
  body:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 24px
  body-strong:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 24px
  secondary:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  caption:
    fontFamily: "system-ui, 'Noto Sans Thai', sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
rounded:
  chip: 12px
  control: 14px
  card: 26px
  sheet: 32px
  pill: 999px
spacing:
  s1: 8px
  s2: 16px
  s3: 24px
  s4: 32px
components:
  screen:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  screen-dark:
    backgroundColor: "{colors.bg-dark}"
    textColor: "{colors.text-dark}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    typography: "{typography.body-strong}"
  button-primary-hover:
    backgroundColor: "{colors.accent-2}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    typography: "{typography.body-strong}"
  button-quiet:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  button-destructive:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    typography: "{typography.body-strong}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    typography: "{typography.body}"
  chip:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.text}"
    rounded: "{rounded.chip}"
    typography: "{typography.caption}"
  chip-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.chip}"
    typography: "{typography.caption}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: 16px
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.h3}"
  list-row-meta:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.secondary}"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: 24px
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
  tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-text}"
  tab-inactive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
  fab:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
  toast:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    typography: "{typography.secondary}"
  skeleton:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.card}"
---

# Ordivel — DESIGN.md

> Tokens are **normative** — the machine-readable block above is the decision of record; prose explains why values exist and how to apply them. Validate with `npx @google/design.md lint DESIGN.md`, compare versions with `npx @google/design.md diff`. Sections follow the [Google DESIGN.md spec](https://github.com/google-labs-code/design.md) order; Ordivel-specific governance appendices live after the canonical sections.
>
> Two lint notes, both intentional: (1) the `-dark` color tokens are **theme-flat mirrors** — the spec has one `colors` map, and the `[data-theme="dark"]` block in `design.css` maps each `-dark` token onto the same components (hence lint counts them "unreferenced"); (2) hover/focus/scrim/border details live in prose, not the components map, because the schema models only the base pair — they remain fully specified below.

## Overview

Ordivel is a personal life-management PWA — tasks, routines, calendar, and an AI assistant — for one user, on a phone, in Thai, offline-first. The design language is **"Precision with warmth."** The skeleton is Linear/Vercel: flat surfaces, hairline borders, restrained color, tight type. The skin is Ordivel: generous radius, spring confirmations, the system + Noto Sans Thai type stack, a calm near-white canvas. The result reads engineered, not decorated — friendly because of geometry and rhythm, never because of ornament.

| # | Principle | In practice |
|---|---|---|
| P1 | One job per screen | Every screen answers one question ("What's today?", "What's due?"). Never build dashboard mosaics |
| P2 | Flat by default | Surfaces are flat with a 1px `--c-line` border. Elevation is reserved for true overlays (§ Elevation & Depth) |
| P3 | Geometry is the personality | Radius is generous and *consistent* — the roundness IS the brand. Never mix radii on one screen |
| P4 | Color is meaning, not decoration | Indigo marks primary actions and active states only. Neutrals do ~90% of the work. Accent pixels ≤ ~10% of any view |
| P5 | Motion explains, never decorates | Animate state changes only (§ Components — motion). Nothing animates on scroll or at rest |
| P6 | Thai-first typography | Thai script sets line-heights and forbids all-caps. Never apply Latin tricks (uppercase, tight tracking) to Thai |

## Colors

Light is the primary theme (polished first). Dark is full parity — same structure, shipped via `prefers-color-scheme` + `[data-theme="dark"]` in `web/classic/styles/design.css`.

### Light (primary)

| Token | Value | Role |
|---|---|---|
| `{colors.bg}` | `#F7F7F9` | App canvas behind surfaces |
| `{colors.surface}` | `#FFFFFF` | Cards, sheets, inputs — everything raised |
| `{colors.text}` | `#14141A` | Primary ink |
| `{colors.muted}` | `#6A6A77` | Secondary text, inactive icons (AA: 4.98:1 on bg) |
| `{colors.line}` | `#ECECF0` | 1px hairline borders |
| `{colors.fill}` | `#F0F0F4` | Quiet interactive fill (chips, secondary buttons, selected rows) |
| `{colors.accent}` | `#4F46E5` | Primary actions, active tab, links, focus (6.29:1 on white) |
| `{colors.accent-soft}` | `#EEF2FF` | Selected/active backgrounds, info banners |
| `{colors.on-accent}` | `#FFFFFF` | Text on solid accent (6.29:1) |
| `{colors.accent-2}` | `#6366F1` | Secondary accent — hover tints and chart series only |
| `{colors.ok}` / `{colors.warn}` / `{colors.danger}` | `#18A66A` / `#E8890C` / `#E5484D` | State colors — **icon/dot/fill only, never small text** (§ Do's and Don'ts) |
| `{colors.warn-soft}` / `{colors.danger-soft}` | `#FFF3E0` / `#FDECEC` | State backgrounds — always pair with ink text |
| `{colors.scrim}` | `#0A0A1473` | Scrim behind sheets/dialogs (rgba(10,10,20,.45)) |

### Dark (full parity)

| Token | Value | Note |
|---|---|---|
| `{colors.bg-dark}` | `#0E0E12` | Canvas |
| `{colors.surface-dark}` | `#1A1A21` | Raised surfaces |
| `{colors.text-dark}` | `#F2F2F5` | Ink (17.24:1 on bg) |
| `{colors.muted-dark}` | `#9A9AA8` | Secondary (6.94:1) |
| `{colors.line-dark}` | `#2A2A33` | Hairlines (decorative — AA exempt) |
| `{colors.fill-dark}` | `#23232C` | Quiet fill |
| `{colors.accent-dark}` | `#818CF8` | Actions (6.46:1 on bg) |
| `{colors.accent-text-dark}` | `#A5B4FC` | Inline accent text (9.66:1) |
| `{colors.accent-soft-dark}` | `#23234A` | Selected backgrounds |
| `{colors.on-accent-dark}` | `#0E0E12` | **Dark ink on accent** — the Linear-dark pattern (DD-3) |
| shadows (dark) | `none` / fab only | Separation comes from surface-vs-bg contrast, not elevation |

Semantic rules that hold in both themes: **state colors are dots and icons, not prose** (to communicate state in words: ink text on a `-soft` background with a colored dot); **one accent per view** (primary button + active tab + link = the quota); **no gradients** (flat fills only); **neutrals first** (when unsure the answer is `fill`, `line`, or `muted` — not accent).

Accessibility floor (WCAG 2.1, measured 2026-10-30 with a contrast script, re-verified 2026-11-01): ink on bg 17.15:1 (AAA) · muted on bg 4.98:1 · accent on white 6.29:1 · white on accent 6.29:1 · ink on accent-soft 16.41:1 · dark ink on accent 6.46:1 · dark accent-text on bg 9.66:1. `ok` as text on white 3.13:1 and `danger` as text 3.91:1 are AA-large only; `warn` as text on white 2.62:1 **fails** — all three are therefore icon/dot/fill only.

## Typography

One family pair — the device system stack: Latin resolves to the platform system face (`system-ui…`), Thai to **'Noto Sans Thai'**. Decided 2026-10-23 after comparing 7 typefaces (recorded in `extra.css`); **no webfont, no `@font-face`, no font files on the wire** — free-tier bytes and offline-first win together. Hierarchy comes from size, weight, and color — never from new fonts.

| Role | Size / line-height | Weight | Tracking | Usage |
|---|---|---|---|---|
| `{typography.display}` | 28 / 34 | 700 | −0.01em | One per screen (screen title) |
| `{typography.h1}` | 24 / 31 | 700 | −0.01em | Page-level titles (calendar month, section pages) |
| `{typography.h2}` | 20 / 27 | 600 | −0.01em | Card-group titles |
| `{typography.h3}` | 17 / 24 | 600 | 0 | List-row titles, sheet headers |
| `{typography.body}` | 15 / 24 | 400 | 0 | Default UI text |
| `{typography.body-strong}` | 15 / 24 | 600 | 0 | Emphasis inside body (weight, never underline) |
| `{typography.secondary}` | 13 / 20 | 400 | 0 | `muted` metadata: timestamps, counts, helper text |
| `{typography.caption}` | 12 / 16 | 500 | 0 | Chips, badges, form labels |

Rules:
1. **No all-caps, anywhere.** Thai has no uppercase; mixed all-caps Latin next to Thai looks broken. Sentence case everywhere.
2. **Emphasis = weight** (400→600), or `text`→`accent-text` for links. Never italics; underline is reserved for links on web views only.
3. **Numbers are tabular.** Counts, times, quota meters use `font-variant-numeric: tabular-nums` so digits don't jitter.
4. **Thai line-height**: shipped body is **1.45** and is parity-locked through 2026-11-02; never lower it for Thai (descending Thai vowels ฤๅ ฦๅ ๎ clip at 1.1–1.2 — headings never below ~1.3). The 1.6 target is re-decided at the D-006 consolidation.
5. Maximum line length ~34–40 Thai characters per line inside the 480px column at Body size — achieved naturally by the column; do not widen past it.

## Layout

- **Column:** 480px max (`--col-max`), centered. Content never widens past it — this is a phone app, not a responsive website. Single column, stacked sections; no multi-column mosaics (P6).
- **Spacing scale:** `{spacing.s1}` 8 · `{spacing.s2}` 16 · `{spacing.s3}` 24 · `{spacing.s4}` 32. Half-step 4px allowed for icon-to-label gaps only.
- **Screen padding:** 16px (`--s2`) left/right; 24px (`--s3`) top under the header. **Card padding:** 16px. **Sheet padding:** 24px.
- **Vertical rhythm:** sections separated by 24px (`--s3`); items inside a section by 8px (`--s1`).
- **Bars:** header 56px tall, transparent over `bg`; bottom tab bar `--nav-h: 64px` + `env(safe-area-inset-bottom)`.
- **Touch targets ≥ 44×44px**, always — including icons inside 24px boxes (pad with hit area, not pixels).
- **Safe areas:** `env(safe-area-inset-bottom)` on tab bar, FAB, and sheets; `env(safe-area-inset-top)` under notches.

## Elevation & Depth

1. **Default surface: flat + 1px `--c-line` border. No shadow.** This is the single biggest "looks engineered, not generated" lever. (The shipped `--shadow` is a 1px ring — `0 0 0 1px rgba(20,20,26,.035)` — applied at rest as the card's soft hairline; that ring *is* this rule's border expressed as a shadow, so it is allowed.)
2. **Blurred elevation is for overlays only** — bottom sheets, popovers, menus. Cards at rest never carry a blur.
3. **`--shadow-fab`** (`0 6px 20px rgba(75,47,245,.35)`, re-tinted with DD-1) belongs to the FAB alone.
4. **Dark mode:** shadows off; separation comes from `#1A1A21` on `#0E0E12` + hairlines.
5. Scrim over content: `{colors.scrim}` behind every sheet/dialog.
6. Never stack two shadows; never blur a border into a "glow".

## Shapes

The radius scale is the brand's signature (DD-2). **One radius per component class — never improvised:**

| Token | Value | Applies to |
|---|---|---|
| `{rounded.chip}` | 12px | Chips, tags, small badges, inline filters |
| `{rounded.control}` | 14px | Buttons, inputs, selects, segmented controls, toggles |
| `{rounded.card}` | 26px | Cards, list groups, banners, images |
| `{rounded.sheet}` | 32px | Bottom sheets, modals, dialogs |
| `{rounded.pill}` | 999px | Pills, avatars, status dots (with icon), FAB is a circle |

Icons: 24px grid, **1.75px stroke**, round caps and joins (soft = on-brand), inline SVG inside the components. Inactive `muted`; active `accent` (the tab bar pairs an active icon with an `accent-text` label; filled variant allowed for the active tab — outline → filled is a cheap, legible "you are here"). Emoji are never UI icons — they live only inside user-generated content.

## Brand assets

The platform symbol and name live in `brand/` — the designer's original pack, **byte-immutable** (verify with `cmp` against `brand/1-ordinal/` before any commit that touches logo files). Symbol = symbol, name = name: the symbol never substitutes the letter "O".

| Asset | Immutable source | Shipped copy & use |
|---|---|---|
| App icon (any) | `brand/1-ordinal/png/appicon-violet-1024.png` | `icons/appicon-violet-1024.png` — manifest `purpose: any` + apple-touch-icon |
| App icon (maskable) | `brand/1-ordinal/png/circle-violet-1024.png` | `icons/circle-violet-1024.png` — manifest `purpose: maskable` |
| Favicons | `brand/1-ordinal/favicon.ico` + `png/favicon-{16,32,48,256}.png` | `icons/favicon.*` — head links; `favicon-256` is the Web Push icon/badge |
| Symbol (gradient) | `brand/1-ordinal/svg/mark-gradient.svg` | `icons/mark-gradient.svg` — the `EV_MARK` in the auth hero and both boot splashes |

Symbol DNA (do not redraw): the O is "your circle of days"; the pearl dot ("next item") sits at 25°, the empty slot at 162.5° — exactly 137.5° apart (golden angle). The artwork's indigo-violet sits in the same family as `{colors.primary}`; **recoloring or resizing the artwork is forbidden** — theming happens around the logo, never inside it.

## Components

Motion (component behavior): `--t-fast` 180ms for presses, toggles, chips; 240ms for content changes and tab switches; 320ms for sheet enter/exit. Default curve `out-expo` `cubic-bezier(.22,1,.36,1)` for everything that enters or moves; `spring` `cubic-bezier(.34,1.56,.64,1)` **only** for affirmative micro-moments (task done, chip selected, quota saved) — once per moment. Exits are always faster than enters (≤160ms, no spring). Honor `prefers-reduced-motion` by collapsing to 80ms opacity fades.

- **Button** — heights 48 (primary) / 40 (standard) / 32 (compact, toolbars); padding 0 20px; radius `{rounded.control}`; type Body-strong. Primary `{components.button-primary}` (hover = `{components.button-primary-hover}`, background only; pressed opacity .88; focus = 2px accent outline offset 2px); secondary = surface fill + 1px `--c-line` border + ink text; quiet = `--c-fill` fill, no border; destructive = `{components.button-destructive}` — `--c-danger-soft` fill + **ink text** (§3.1/§12 rule: semantic colors never sit behind 15px labels as fills; solid `--c-danger` is reserved for icons and fills without small text on top). **One primary button per view** (P4). Disabled: 40% opacity, never accent-colored.
- **Input** — height 48, radius `{rounded.control}`, 1px `--c-line` box border (never bottom-border-only — box inputs match the round geometry). Focus: border `--c-accent` 1.5px + 3px `--c-accent-soft` ring. Error: border `--c-danger` + helper text in ink on `--c-danger-soft`, 12px. Labels: Caption, above the field.
- **Chip / Tag** — height 28–32, radius `{rounded.chip}`, `--c-fill` bg, ink text; selected = `{components.chip-selected}`. Status dots: 8px circles from semantic colors.
- **Card** — `{components.card}`: surface, 1px `--c-line`, radius `{rounded.card}`, pad 16. Grouped rows inside a card: separated by 1px `--c-line` inset lines (16px from the left edge, aligned under text — not under icons).
- **List row** — 56px min height; leading icon 24 (muted), title H3, meta Secondary; trailing control right-aligned. Completed tasks: title `muted` + line-through.
- **Sheet (bottom)** — radius `{rounded.sheet}` top corners only, `--shadow`, `{colors.scrim}` behind, pad 24, 4px grab handle centered at top (24×4, `--c-line`). Enter 320ms `out-expo`; exit 160ms.
- **Dialog** — centered card, max 360px, radius `{rounded.sheet}`, scrim behind. Title H3, body Body, actions right-aligned (text buttons: quiet).
- **Tab bar** — bottom, 64px + safe-area, surface with top hairline. Active = `{components.tab-active}` (filled icon + 12px `accent-text` label); inactive = `muted` outline. *(Implementation note: shipped tabs are วันนี้ · รายการ · ปฏิทิน · สถิติ with AI and Settings as full pages — navigation contract drift is logged as D-007.)*
- **Header** — 56px, transparent. The header shows only context (e.g., the current month at H1); the *screen* owns the one Display title inside the content area. Right side: 1–2 icon actions.
- **FAB** — `{components.fab}`: 56px circle, `--shadow-fab`, bottom-right 24px above the tab bar + safe-area. One per screen; it creates the screen's core object ("+" on Tasks).
- **Toast** — pill, `--c-fill` at 96% opacity, ink text 13px + a 20px icon tinted with the semantic color; bottom-center above the tab bar; auto-dismiss 3.5s; never stacks more than one.
- **Empty state** — icon 48px muted, one line H3, one line Secondary, **one** primary action. No illustration, no full-screen art.
- **Skeleton** — `--c-fill` blocks at final layout size, radius matching the component, gentle 1.2s opacity pulse. Never spinners for content areas.
- **Quota meter** (AI usage) — 4px track `--c-fill`, full radius; fill `--c-accent` → `--c-warn` at 80% → `--c-danger` only at 100% (bar color is a state, so it may use semantic colors). Percentage label uses tabular-nums.

## Do's and Don'ts

Rules that settle real edits — when a decision isn't in the tokens, this section is.

**Do**
- Do mark state with a dot or icon + ink text on a `-soft` background (e.g. `--c-warn-soft` + ink + 8px `--c-warn` dot).
- Do keep accent ≤ ~10% of pixels: one primary button, the active tab, links — that is the whole quota for a view.
- Do use `{rounded.card}` for every card-class surface and `{rounded.sheet}` for every overlay — pull from the scale, never invent.
- Do honor both themes in the same change; every component ships light + dark together.
- Do animate only state changes; exits ≤160ms without spring; collapse to 80ms fades under `prefers-reduced-motion`.

**Don't**
- Don't use `--c-ok`, `--c-warn`, or `--c-danger` as body-text color — they fail AA at text sizes (warn 2.62:1). Icon/dot/fill only.
- Don't put blurred shadows on resting cards — 1px `--c-line` is the border; the 1px ring in `--shadow` is allowed as that border.
- Don't use gradients, glassmorphism, or backdrop-blur cards — flat fills + hairlines only.
- Don't invent colors per screen: every color comes from the token block above, or it doesn't ship.
- Don't apply all-caps, italics, or underline emphasis to Thai text — weight and color carry emphasis.
- Don't build landing-page layouts (centered hero + three feature cards) or multi-column mosaics at 480px — this is a single-column tool.
- Don't use emoji as icons or bullets, and don't ship stock illustrations on empty states — icon + text + one action.
- Don't animate anything the user isn't causing — no scroll parallax, no idle float, no pulsing headers.

---

# Appendices — Ordivel governance (repo workflow)

*The sections above are the design system an agent implements. This appendix is how the repo keeps it true.*

## A1. How this file works (governance)

Four artifacts touch Ordivel's visual language. Exactly one of them is the source of truth:

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
1. Add the decision to the Decision Log (A2).
2. Update the YAML token block at the top of this file.
3. Refresh `web/classic/styles/design.css` (never the compiled `app.css`) and, if needed, the master demo.
4. If `tailwind.config.cjs` maps the token, remap it there too.

> **Reality check (2026-11-01):** `design.css` currently contains **three** competing token layers — the TOKENS block (L7), the "v16 design pass" (~L431), and a semantic-text pass (~L532) — the later ones win the cascade (radius 32/38, spacing 10/20/28/40, softer neutrals; details in **D-006**). The YAML block above stays the decision of record; **do not paste it wholesale** into `design.css` until the D-006 consolidation — merge per the A1 protocol, keeping every var the code defines. Shipped hex deltas (line/fill/scrim/shadow/font) stay logged in D-003/D-006.

## A2. Decision log

| ID | Decision | Date |
|---|---|---|
| DD-1 | Accent family migrates violet `#4B2FF5` → indigo `#4F46E5` (light) / `#818CF8` (dark). Neutrals, ok/warn/danger unchanged — continuity with the shipped app, new accent identity | 2026-10-30 |
| DD-2 | Canonical radius: chip 12 · control 14 · card 26 · sheet 32 · pill 999. `tokens.css` updates from 20/28 → 26/32 to match the demo-v29 direction already mapped in `tailwind.config.cjs` | 2026-10-30 |
| DD-3 | Dark-mode primary buttons switch from white text to dark ink (`--c-on-accent:#0E0E12`); `--c-on-ok` becomes ink. Measured, stronger contrast in both cases | 2026-10-30 |
| DD-4 | `--c-fill` introduced (quiet interactive fill), fixing the undefined Tailwind `fill` mapping | 2026-10-30 |
| DD-5 | Typography ramp locked (§ Typography); Thai-safe tracking floor −0.01em; line-height floors 1.6/1.3; tabular numerals | 2026-10-30 |
| DD-6 | Motion table locked (§ Components): out-expo default, spring reserved for affirmative moments, reduced-motion honored | 2026-10-30 |
| DD-7 | Font stack locked to the shipped system stack (`system-ui … 'Noto Sans Thai' …`) — no webfont, no `@font-face`, no font files. The "IBM Plex Sans Thai" claim is retired as an error (D-008) | 2026-11-01 |
| DD-8 | This file adopts the Google DESIGN.md format: YAML token front matter (normative) + canonical section order + components map — machine-lintable with `npx @google/design.md lint` while keeping Ordivel's governance appendices. Same change: § Components destructive button aligned with the measured § Colors consequences (`--c-danger-soft` fill + ink text; solid `--c-danger` = icon/fill only — it was 3.91:1 behind a 15px label) | 2026-11-01 |
| DD-9 | Platform renamed **Evarel → Ordivel**. Brand assets shipped as byte-exact copies of the designer pack stored under `brand/` (§ Brand assets; the folder README holds the immutability contract): icon set (any + maskable), favicons, gradient symbol in the auth hero and boot splashes. Every user-facing name string switched (manifest, titles, per-tab `document.title`, e-mail sender/subjects, push title, AI persona/drawer); technical identifiers and storage keys (`evarel-*`, `EvarelMount`, repo URLs) deliberately stay for data continuity. Resolves the launcher-icon residual of D-005 | 2026-11-01 |

## A3. Drift log (burn down as part of V1)

| ID | Drift found | Resolution |
|---|---|---|
| D-001 | (2026-10-30) `tokens.css` radius 20/28 vs `tailwind.config.cjs` 26/32 | Superseded 2026-11-01: `tokens.css` dissolved into `web/classic/styles/design.css` (F7 restructure); its TOKENS block now carries 26/32, matching the Tailwind mapping. Residual conflict → D-006 |
| D-002 | `tailwind.config.cjs` cites `archive/design/master-demo-v29.html`; `archive/design/` holds v2 / v7 / v12 / v12-intended / `Evarel v24.html` only — **v29 still does not exist** (re-verified 2026-11-01) | **Resolved 2026-11-01 (citation half):** `tailwind.config.cjs` and the `design.css` headers now cite `archive/design/Evarel v24.html`. Re-issuing a fresh single-file master demo stays open as optional polish |
| D-003 | (2026-10-30) Tailwind maps `fill` → `var(--c-fill)` but tokens never defined it | **Resolved (definition only)** — `--c-fill` exists (light `#EDEDF1`, dark `#262630`), but those hexes differ from the decision-of-record (`#F0F0F4`/`#23232C`). Reconcile one side during the D-006 consolidation |
| D-004 | (2026-10-30) token file header cited demo **v2** — stale provenance | **Resolved 2026-11-01:** both `design.css` headers now cite `archive/design/Evarel v24.html` and note the real demo chain (v2 → v7 → v12 → v24); the phantom v3/v29 mentions are gone (tailwind.config.cjs fixed in the same commit) |
| D-005 | Accent family mismatch across artifacts (violet in app, indigo decided) | **Resolved 2026-11-01 (one commit, four artifacts):** light `#4F46E5`/`#6366F1`/`#EEF2FF`, dark `#818CF8`/`#A5B4FC`/`#23234A`/`#8386F6`; dark `--c-on-accent:#0E0E12` added (DD-3); `--c-ink-a/b/c` hue-shifted to indigo with luminance kept — light `#3A2FF5/#473CFA/#4136FF`, dark `#232C80/#37419F/#515CCC` (white-on-gradient ≥6.37 light / ≥5.60 dark); `--shadow-fab` and the v16 `--c-accent-soft`/`--c-halo` re-tinted; `theme-color` (index.html + next layout) and manifest `theme_color` updated; MOLD-TABLE re-tinted. Residuals: launcher PNG icons replaced 2026-11-01 with the Ordivel brand set (DD-9); v17 `--c-on-ok` belongs to the D-006 consolidation |
| D-006 | **Open (2026-11-01; extended same day):** `design.css` contains **three** competing token layers — the TOKENS block (L7: radius 26/32, spacing 8/16/24/32, `--nav-h` 60), the "v16 design pass" (L431: radius 32/38, spacing 10/20/28/40, `--nav-h` 64, softer neutrals), and a semantic-text pass (L532: `--c-ok` `#0E8A55`/`#3DD598`, `--c-muted` `#65637A`/`#A3A1B5`, `--c-line` `#E1DFEB`/`#363544`, plus text-safe tokens `--c-ok-text`/`--c-warn-text`/`--c-danger-text`/`--c-danger-fill`/`--c-line-ctl`/`--c-halo` that this doc does not yet govern). The later blocks win the cascade, so the *effective* values contradict DD-2, § Colors and § Layout | Consolidate into ONE canonical block aligned with the decision log — or re-decide via A2 if the later direction is preferred (owner's call). Introduce the missing `--r-chip`/`--r-control` tokens and adopt or retire the text-safe tokens in the same commit |
| D-007 | **Open (2026-11-01):** navigation drift — the implemented router (`web/classic/js/route.js`) uses hash routes: tabs `#/today #/all #/calendar #/stats`, full pages `#/ai #/settings`; auth is an in-app layer (no `/login` route). SITEMAP §1 specifies path routes incl. `/tasks` and `/routines`, and § Components specifies a Today·Tasks·Calendar·AI tab bar | One reconciling decision: adopt the implemented navigation into SITEMAP/§ Components, or change the router to the spec. Until then, SITEMAP §1 carries a verified implementation note |
| D-008 | **Resolved (2026-11-01):** typography drift — this doc claimed "IBM Plex Sans Thai (already the app's `--font`)"; false on both counts. The shipped `--font` is `system-ui,…,'Noto Sans Thai',…` with the owner's system-font decision recorded in `extra.css` (2026-10-23). Body line-height ships at 1.45, not the 1.6 floor stated in § Typography | § Typography corrected to the system stack (**DD-7**); 1.45 is parity-locked through 2026-11-02, the 1.6 floor is re-decided at the D-006 consolidation. `tailwind.config.cjs` `fontFamily` now maps the DD-7 system stack |
| D-009 | **Resolved (2026-11-01):** page-box styles `web/pages/all/all.style.css` + `web/pages/stats/stats.style.css` asked for `var(--sp-4)` (no such token) and colored text with `--c-ink-a` behind an off-token `#333` fallback | Fixed same day: `var(--s2, 16px)` + `var(--c-text, #14141A)`; the files stay unwired until factory step D |
| D-010 | **Resolved (2026-11-01):** `tools/factory/audit_css_values.py` (the F1.2 value audit) pointed at the pre-restructure path `web/styles/` while the stylesheets live in `web/classic/styles/` — silently unrunnable since F7 | Fixed same day: path updated; run it as part of the D-006 consolidation |

## A4. Sources

- `web/classic/styles/design.css` — token source (TOKENS block + v16 pass + semantic-text pass; see D-006) — re-verified 2026-11-01
- `web/classic/styles/extra.css` — app-only styles; records the system-font decision (2026-10-23) — audited 2026-11-01
- `web/styles/MOLD-TABLE.md` — the measured mold table (hand-patched with the DD-1 values 2026-11-01; regenerate with `tests/measure_root_vars.mjs` at the next deploy)
- `web/classic/styles/app.css` — compiled component CSS (build artifact of `scripts/build-css.mjs`; never edit by hand)
- `tailwind.config.cjs` — utility mapping (colors → CSS vars; radius; `--col-max:480px`; timing curves)
- `archive/design/*.html` — visual reference chain (v2 / v7 / v12 / `Evarel v24`)
- `brand/1-ordinal/` — the immutable Ordivel logo pack (v8 premium edition) + `ordivel-1-ordinal-full.zip` backup; shipped copies mapped in § Brand assets
- WCAG 2.1 contrast math: computed with a contrast script on 2026-10-30, values reproduced in § Colors
- Format reference: [google-labs-code/design.md](https://github.com/google-labs-code/design.md) (Apache-2.0, Google Labs) · catalog of real-site DESIGN.md analyses: [getdesign.md](https://getdesign.md/)

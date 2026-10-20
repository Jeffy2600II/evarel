# Graph Report - ev_graph2  (2026-10-20)

## Corpus Check
- 96 files · ~58,620 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .sqlite 1, .sqlite-shm 1, .sqlite-wal 1)

## Summary
- 946 nodes · 1835 edges · 64 communities (52 shown, 12 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 274 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ebb9e25`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- router.ts
- schedule.ts
- memory.ts
- scheduler.ts
- account.ts
- 22-views__auth.ts
- 14-ui__form.ts
- 01-core__constants.ts
- 09-ui__layers.ts
- account.test.mjs
- 07-services__stats.ts
- 17-views__ai.ts
- 10-services__notify.ts
- 20-services__calendar.ts
- form.jsx
- 05-data__auth.ts
- ref_node_url
- smtp-mail.js
- 06-services__schedule.ts
- push-routes.test.mjs
- 16-services__ai-quota.ts
- quota-read.test.mjs
- abuse.test.mjs
- due.test.mjs
- scheduler.test.mjs
- runtime.js
- 19-views__settings.ts
- auth.test.mjs
- ref_node_child_process
- quota-wire.test.mjs
- 24-services__legacy-import.ts
- manifest.json
- worker.js
- ai/routes.test.mjs
- sender.test.mjs
- 02-core__dates.ts
- addDays
- 15-core__timer.ts
- memory.test.mjs
- codes.test.mjs
- 25-actions.ts
- detail.jsx
- items/routes.test.mjs
- 08-core__undo.ts
- 12-ui__primitives.ts
- ai.jsx
- 21-views__detail.ts
- 23-render.ts
- sheet.jsx
- 04-data__repo.ts
- 18-services__ai-live.ts
- calendar.jsx
- dialog.jsx
- 13-views.ts
- focus.jsx
- item-row.jsx
- nav.jsx
- quota.jsx
- imports
- aiShell.jsx
- auth.jsx
- settings.jsx
- 00-head.ts

## God Nodes (most connected - your core abstractions)
1. `handleRequest()` - 33 edges
2. `jsonResponse()` - 29 edges
3. `errorResponse()` - 21 edges
4. `extractBearer()` - 18 edges
5. `handleAiChat()` - 15 edges
6. `handleSignup()` - 15 edges
7. `verifyJWT()` - 14 edges
8. `handleVerify()` - 14 edges
9. `isDone()` - 14 edges
10. `formBody()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `statsClassic()` --indirect_call--> `streak()`  [INFERRED]
  src/m/13-views.ts → src/m/06-services__schedule.ts
- `fetch()` --calls--> `handleRequest()`  [EXTRACTED]
  api/src/index.ts → api/src/router.ts
- `handleRequest()` --calls--> `handleDeleteAccount()`  [EXTRACTED]
  api/src/router.ts → api/src/systems/auth/account.ts
- `handleRequest()` --calls--> `handleForgot()`  [EXTRACTED]
  api/src/router.ts → api/src/systems/auth/account.ts
- `handleRequest()` --calls--> `handleResend()`  [EXTRACTED]
  api/src/router.ts → api/src/systems/auth/account.ts

## Import Cycles
- None detected.

## Communities (64 total, 12 thin omitted)

### Community 0 - "router.ts"
Cohesion: 0.07
Nodes (73): fetch(), handleRequest(), AuthEnv, JWK, JWKSCache, JWKSResponse, base64UrlDecode(), decodeJSON() (+65 more)

### Community 1 - "schedule.ts"
Cohesion: 0.06
Nodes (61): addDays(), DAY_MS, dayLab(), fmtClock(), fmtDate(), nowHM(), pad(), parse() (+53 more)

### Community 2 - "memory.ts"
Cohesion: 0.06
Nodes (47): AgentOut, bangkokNow(), MAX_ROUNDS, Proposal, runAgent(), summarize(), systemPrompt(), TH_DAYS (+39 more)

### Community 3 - "scheduler.ts"
Cohesion: 0.06
Nodes (40): scheduled(), dayNumber(), ItemLite, occursOnStr(), Repeat, weekday(), ymdParts(), abs() (+32 more)

### Community 4 - "account.ts"
Cohesion: 0.13
Nodes (41): admin(), base(), body(), codeFail(), f(), fail(), findUserByEmail(), handleDeleteAccount() (+33 more)

### Community 5 - "22-views__auth.ts"
Cohesion: 0.10
Nodes (19): AU_MSG, AUTH_VIEWS, doSignOut(), liveRefresh(), MAIL_TYPO, paintCool(), renderAuthRoot(), resendReset() (+11 more)

### Community 6 - "14-ui__form.ts"
Cohesion: 0.16
Nodes (23): chips(), draftFrom(), everyTxt(), formBody(), IR(), newDraft(), openForm(), PN() (+15 more)

### Community 7 - "01-core__constants.ts"
Cohesion: 0.08
Nodes (22): AI_PLACEHOLDER, AI_TOOL_LABEL, CHATS_KEY, DRAG_CLOSE_PX, DRAG_CLOSE_V, HHMM, ICONS, LAYER_ANIM_MS (+14 more)

### Community 8 - "09-ui__layers.ts"
Cohesion: 0.14
Nodes (20): BEHIND, closePop(), closeTop(), CONFIRM, confirmDialog(), dialog, endDrag(), LAYERS (+12 more)

### Community 9 - "account.test.mjs"
Cohesion: 0.13
Nodes (11): b64u(), call(), here, json(), needOwn(), PUBJWK, req(), signJWT() (+3 more)

### Community 10 - "07-services__stats.ts"
Cohesion: 0.20
Nodes (18): WD, UI, dayMenu(), dayState(), isDone(), occursOn(), onDate(), rate() (+10 more)

### Community 11 - "17-views__ai.ts"
Cohesion: 0.16
Nodes (14): tracked(), aiBodyHTML(), aiPlusItems, aiRefresh(), aiRenderDrawer(), aiReply(), aiShellHTML(), aiSync() (+6 more)

### Community 12 - "10-services__notify.ts"
Cohesion: 0.19
Nodes (15): AHEAD_PRESETS, checkNotify(), countNotifiable(), isRemObj(), notifyState(), PUSH_WHY, pushAutoSync(), pushSavedState() (+7 more)

### Community 13 - "20-services__calendar.ts"
Cohesion: 0.20
Nodes (14): addMin(), calDayTap(), destroyCal(), DETAIL_BY_TYPE, detailHTML(), dotsFor(), FCS, metaCard() (+6 more)

### Community 14 - "form.jsx"
Cohesion: 0.32
Nodes (17): Chips(), FormBody(), FormFields(), IR(), PN(), RangePanel(), raw(), RemPanel() (+9 more)

### Community 15 - "05-data__auth.ts"
Cohesion: 0.18
Nodes (14): Auth, authErr(), find(), nowS(), S, SUPA_API, SUPA_HOST, SUPA_SESS (+6 more)

### Community 16 - "ref_node_url"
Cohesion: 0.14
Nodes (5): here, NOW, here, human(), keys()

### Community 17 - "smtp-mail.js"
Cohesion: 0.28
Nodes (14): assertAddress(), assertSingleLine(), b64(), buildMessage(), dec, dotStuff(), enc, encodeHeaderWord() (+6 more)

### Community 18 - "06-services__schedule.ts"
Cohesion: 0.15
Nodes (10): DAY_MS, icon(), STAT_DAYS, STREAK_LOOKBACK, UNIT_TH, fmtDate(), parse(), overdue() (+2 more)

### Community 19 - "push-routes.test.mjs"
Cohesion: 0.18
Nodes (8): b64u(), here, json(), jwk, mkJwt(), post(), VAPID, world()

### Community 20 - "16-services__ai-quota.ts"
Cohesion: 0.30
Nodes (13): QUOTA_UNKNOWN, quotaEnabled(), quotaFetch(), quotaFromChat(), quotaPaint(), quotaRefresh(), quotaSheet(), quotaSheetHTML() (+5 more)

### Community 21 - "quota-read.test.mjs"
Cohesion: 0.21
Nodes (9): b64u(), fresh(), get(), here, jwk, mkJwt(), t(), world() (+1 more)

### Community 22 - "abuse.test.mjs"
Cohesion: 0.18
Nodes (8): b64u(), here, jwk, ADR-0003, mkJwt(), put(), world(), w

### Community 23 - "due.test.mjs"
Cohesion: 0.15
Nodes (8): appOccursOn, appSrc, bad, code, constSrc, datesSrc, here, sandbox

### Community 24 - "scheduler.test.mjs"
Cohesion: 0.21
Nodes (7): env(), here, json(), okSend(), run(), th(), world()

### Community 25 - "runtime.js"
Cohesion: 0.22
Nodes (6): commit(), mountAt(), ready(), rerender(), unmountOne(), createStore()

### Community 26 - "19-views__settings.ts"
Cohesion: 0.29
Nodes (11): loadReactFile(), loadReactSettings(), notifInfo(), REACT_LAZY, REACT_PAGES, settingsHTML(), settingsHTMLClassic(), settingsOpen() (+3 more)

### Community 27 - "auth.test.mjs"
Cohesion: 0.36
Nodes (10): base64UrlDecode(), clearJWKSCache(), decodeJSON(), extractBearer(), fetchJWKS(), verifyJWT(), base64UrlEncode(), createKeyPairAndJWK() (+2 more)

### Community 28 - "ref_node_child_process"
Cohesion: 0.22
Nodes (7): here, json(), login(), ADR-0003, post(), world(), w

### Community 29 - "quota-wire.test.mjs"
Cohesion: 0.22
Nodes (7): b64u(), here, jwk, mkJwt(), req(), world(), w

### Community 30 - "24-services__legacy-import.ts"
Cohesion: 0.36
Nodes (10): authGoogle(), authSubmit(), boot(), enterApp(), IMPORT_FLAG(), importLegacy(), loadApp(), maybeImportLegacy() (+2 more)

### Community 31 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, lang, name, short_name, start_url (+1 more)

### Community 32 - "worker.js"
Cohesion: 0.44
Nodes (9): cors(), corsHeaders(), fetch(), handleChat(), handleSend(), json(), sbHeaders(), TOOLS (+1 more)

### Community 33 - "ai/routes.test.mjs"
Cohesion: 0.20
Nodes (3): here, ITEMS, NOW

### Community 34 - "sender.test.mjs"
Cohesion: 0.22
Nodes (7): auth, decrypt(), hkdf(), rcv, subRow, VAPID, RFC-8291

### Community 35 - "02-core__dates.ts"
Cohesion: 0.24
Nodes (8): HAPTIC_MS, TH_DAY, TH_MON, esc(), fmtClock(), nowHM(), pad(), TODAY

### Community 36 - "addDays"
Cohesion: 0.47
Nodes (9): addDays(), dayLab(), ymd(), cls(), daily(), fill(), mk(), seed() (+1 more)

### Community 37 - "15-core__timer.ts"
Cohesion: 0.44
Nodes (8): focusBody(), openFocus(), refreshFocus(), saveTM(), tick(), tmFinish(), tmMs(), updateLive()

### Community 39 - "codes.test.mjs"
Cohesion: 0.25
Nodes (3): fakeDB(), here, json()

### Community 41 - "detail.jsx"
Cohesion: 0.67
Nodes (8): DetailContent(), Empty(), HabitCard(), MetaCard(), raw(), ScheduleCard(), TaskCard(), W()

### Community 42 - "items/routes.test.mjs"
Cohesion: 0.46
Nodes (7): base64UrlDecode(), base64UrlEncode(), createKeyPairAndJWK(), decodeJwtPayload(), getHeaderValue(), makeJWT(), runTests()

### Community 43 - "08-core__undo.ts"
Cohesion: 0.39
Nodes (7): clone(), commit(), LP, SYNC, syncFail(), toast(), toastEl

### Community 44 - "12-ui__primitives.ts"
Cohesion: 0.38
Nodes (3): agendaHTML(), empty(), itemRow()

### Community 45 - "ai.jsx"
Cohesion: 0.62
Nodes (6): AiContent(), AiHello(), AiItemCard(), AiMark(), AiToolCard(), W()

### Community 46 - "21-views__detail.ts"
Cohesion: 0.47
Nodes (4): calMove(), dvHTML(), dvStep(), refreshDetail()

### Community 47 - "23-render.ts"
Cohesion: 0.53
Nodes (4): countUp(), growBars(), render(), setBar()

### Community 48 - "sheet.jsx"
Cohesion: 0.73
Nodes (5): raw(), SheetBody(), SheetInner(), SheetShell(), W()

### Community 51 - "calendar.jsx"
Cohesion: 0.70
Nodes (4): CalendarContent(), CalendarLive(), CalendarMain(), W()

### Community 54 - "focus.jsx"
Cohesion: 1.00
Nodes (3): FocusBtn(), FocusContent(), W()

### Community 55 - "item-row.jsx"
Cohesion: 0.83
Nodes (3): ItemRow(), raw(), W()

### Community 56 - "nav.jsx"
Cohesion: 0.83
Nodes (3): NavTabs(), raw(), W()

### Community 57 - "quota.jsx"
Cohesion: 0.83
Nodes (3): QuotaBar(), QuotaBody(), W()

## Knowledge Gaps
- **9 isolated node(s):** `ADR-0003`, `ADR-0003`, `RFC-2047`, `RFC-5321`, `ADR-0002` (+4 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Env` connect `router.ts` to `account.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `ADR-0003`, `ADR-0003`, `RFC-2047` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `router.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07414500683994528 - nodes in this community are weakly interconnected._
- **Why does `handleRequest()` connect `router.ts` to `account.ts`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `schedule.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0649452269170579 - nodes in this community are weakly interconnected._
- **Why does `runScheduler()` connect `scheduler.ts` to `router.ts`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `memory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06386066763425254 - nodes in this community are weakly interconnected._
import { pad } from "./dates.js";
const QUOTA_LOW = 0.2;
const resetMs = (iso) => {
  const v = +new Date(iso);
  return Number.isFinite(v) ? v : NaN;
};
function quotaState(q) {
  if (!q || q.unknown || !q.calls || !q.tokens || !(q.calls.limit > 0) || !(q.tokens.limit > 0)) return null;
  if (q.blocked || q.calls.remaining <= 0 || q.tokens.remaining <= 0) return "out";
  const r = Math.min(q.calls.remaining / q.calls.limit, q.tokens.remaining / q.tokens.limit);
  return r <= QUOTA_LOW ? "low" : "ok";
}
function quotaShort(q) {
  const st = quotaState(q);
  if (st === "out") return "\u0E42\u0E04\u0E27\u0E15\u0E32\u0E2B\u0E21\u0E14";
  const cr = q.calls.remaining / q.calls.limit, tr = q.tokens.remaining / q.tokens.limit;
  if (tr <= QUOTA_LOW && tr < cr) return "\u0E43\u0E01\u0E25\u0E49\u0E16\u0E36\u0E07\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49";
  return `\u0E40\u0E2B\u0E25\u0E37\u0E2D ${q.calls.remaining} \u0E08\u0E32\u0E01 ${q.calls.limit} \u0E04\u0E23\u0E31\u0E49\u0E07`;
}
function resetClock(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const b = new Date(+d + 7 * 36e5);
  return `${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`;
}
function resetInAt(iso, now) {
  const ms = resetMs(iso) - now;
  if (!(ms > 0)) return "\u0E43\u0E19\u0E2D\u0E35\u0E01\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48";
  const m = Math.ceil(ms / 6e4), h = Math.floor(m / 60);
  return h >= 1 ? `\u0E2D\u0E35\u0E01 ${h} \u0E0A\u0E21. ${m % 60} \u0E19\u0E32\u0E17\u0E35` : `\u0E2D\u0E35\u0E01 ${m} \u0E19\u0E32\u0E17\u0E35`;
}
const QUOTA_UNKNOWN = Object.freeze({ unknown: true, blocked: false });
function quotaFetchOf(deps) {
  return async () => {
    if (!deps.enabled()) return null;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 6e3);
    try {
      const t = await deps.token(), r = await fetch(`${deps.api()}/ai/quota`, { signal: ctl.signal, headers: { Authorization: "Bearer " + t } });
      if (!r.ok) return QUOTA_UNKNOWN;
      const j = await r.json();
      if (j && j.unknown) return QUOTA_UNKNOWN;
      if (!j || typeof j !== "object" || !j.calls || !j.tokens || !(j.calls.limit > 0) || !(j.tokens.limit > 0)) return QUOTA_UNKNOWN;
      return j;
    } catch (e) {
      return QUOTA_UNKNOWN;
    } finally {
      clearTimeout(tm);
    }
  };
}
function aiLockInfoOf(notice, quota) {
  if (notice && notice.kind === "limit") return notice;
  const v = quota;
  return quotaState(v) === "out" ? { reason: v && v.reason || "calls", resetAt: v && v.resetAt } : null;
}
function limitBannerOf(L, icon, now) {
  if (!L) return "";
  const g = L.reason === "global";
  const title = g ? "\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E21\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E08\u0E33\u0E19\u0E27\u0E19\u0E21\u0E32\u0E01" : L.reason === "tokens" ? "\u0E1A\u0E17\u0E2A\u0E19\u0E17\u0E19\u0E32\u0E22\u0E32\u0E27\u0E16\u0E36\u0E07\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27" : "\u0E16\u0E36\u0E07\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14\u0E01\u0E32\u0E23\u0E16\u0E32\u0E21\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27";
  const sub = g ? "\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E15\u0E47\u0E21\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E43\u0E19\u0E2D\u0E35\u0E01\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48" : `\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 ${resetInAt(L.resetAt, now)} (${resetClock(L.resetAt)} \u0E19.)`;
  return `<div class="ev-limit" role="status" data-key="limit"><span class="ev-limit-ic">${icon("clock")}</span><div class="grow"><b>${title}</b><span>${sub}</span></div>${g ? '<button type="button" class="ev-btn-ghost ev-btn-sm" data-act="ai-retry-global">\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48</button>' : '<button type="button" class="ev-btn-ghost ev-btn-sm" data-act="ai-usage">\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14</button>'}</div>`;
}
function quotaFromChatState(qc, hit429, prev, now) {
  if (!qc || !(qc.limit > 0)) return void 0;
  const tl = qc.tokens && qc.tokens.limit > 0 ? qc.tokens : { used: 0, limit: prev && prev.tokens?.limit || 6e4 };
  const out = hit429 || qc.used >= qc.limit || tl.used >= tl.limit;
  return {
    day: "",
    resetAt: qc.resetAt || prev?.resetAt || new Date(now + 36e5).toISOString(),
    blocked: out,
    ...out ? { reason: qc.reason || (qc.used >= qc.limit ? "calls" : "tokens") } : {},
    calls: { used: qc.used, limit: qc.limit, remaining: Math.max(0, qc.limit - qc.used) },
    tokens: { used: tl.used, limit: tl.limit, remaining: Math.max(0, tl.limit - tl.used) }
  };
}
function quotaSheetHTMLOf(q, now) {
  if (!q || q.unknown) return "";
  const bar = (u, l, lb) => `<div class="ev-qbar" role="progressbar" aria-label="${lb}" aria-valuemin="0" aria-valuemax="${l}" aria-valuenow="${Math.min(u, l || 0)}"><i style="--p:${l > 0 ? Math.min(1, u / l).toFixed(3) : "0"}"></i></div>`;
  return `<div class="ev-qrow"><div class="ev-row"><b>\u0E08\u0E33\u0E19\u0E27\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07</b><span class="ev-sub">${q.calls.used} / ${q.calls.limit}</span></div>${bar(q.calls.used, q.calls.limit, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49")}</div>
 <div class="ev-qrow"><div class="ev-row"><b>\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E01\u0E32\u0E23\u0E04\u0E34\u0E14</b><span class="ev-sub">${q.tokens.used.toLocaleString("en-US")} / ${q.tokens.limit.toLocaleString("en-US")}</span></div>${bar(q.tokens.used, q.tokens.limit, "\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E01\u0E32\u0E23\u0E04\u0E34\u0E14\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49")}</div>
 <p class="ev-sub" style="margin-top:12px">${q.blocked ? "\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E49\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E49\u0E27 " : ""}\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E40\u0E27\u0E25\u0E32 ${resetClock(q.resetAt)} \u0E19. (${resetInAt(q.resetAt, now)})</p>`;
}
export {
  QUOTA_LOW,
  QUOTA_UNKNOWN,
  aiLockInfoOf,
  limitBannerOf,
  quotaFetchOf,
  quotaFromChatState,
  quotaSheetHTMLOf,
  quotaShort,
  quotaState,
  resetClock,
  resetInAt,
  resetMs
};

import { quotaState, resetInAt } from "./quota.js";
import { GLOGO } from "./authviews.js";
function usageCardHTML(q) {
  const st = quotaState(q);
  if (!st) return `<b>\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 AI \u0E27\u0E31\u0E19\u0E19\u0E35\u0E49</b><p class="ev-sub" style="margin-top:6px">${q ? "\u0E14\u0E39\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49 \u0E41\u0E15\u0E48\u0E22\u0E31\u0E07\u0E43\u0E0A\u0E49 AI \u0E44\u0E14\u0E49\u0E15\u0E32\u0E21\u0E1B\u0E01\u0E15\u0E34" : "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u2026"}</p>${q ? '<button class="ev-btn-ghost ev-btn-sm" style="margin-top:10px" data-act="usage-refresh">\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48</button>' : ""}`;
  const c = q.calls, t = q.tokens, cp = Math.min(100, Math.round(100 * c.used / c.limit)), tp = Math.min(100, Math.round(100 * t.used / t.limit)), lab = { ok: "\u0E1B\u0E01\u0E15\u0E34", low: "\u0E43\u0E01\u0E25\u0E49\u0E16\u0E36\u0E07\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14", out: "\u0E16\u0E36\u0E07\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14\u0E41\u0E25\u0E49\u0E27" }[st];
  return `<div class="ev-stat"><b>\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 AI \u0E27\u0E31\u0E19\u0E19\u0E35\u0E49</b><span class="ev-chip" data-state="${st === "out" ? "late" : st === "low" ? "soon" : "done"}">${lab}</span></div>
  <div class="ev-use"><div class="ev-stat"><span>\u0E08\u0E33\u0E19\u0E27\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E16\u0E32\u0E21</span><b>${c.used} / ${c.limit}</b></div><div class="ev-bar ev-bar-lg"><i data-k="u-calls" data-to="${cp}" data-lv="${st}"></i></div></div>
  <div class="ev-use"><div class="ev-stat"><span>\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E1A\u0E17\u0E2A\u0E19\u0E17\u0E19\u0E32</span><b>${tp}%</b></div><div class="ev-bar ev-bar-lg"><i data-k="u-tok" data-to="${tp}" data-lv="${st}"></i></div></div>
  <p class="ev-sub" style="margin-top:14px">\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E17\u0E38\u0E01\u0E40\u0E17\u0E35\u0E48\u0E22\u0E07\u0E04\u0E37\u0E19 (00:00 \u0E19.) \xB7 ${resetInAt(q.resetAt, Date.now())}</p>`;
}
const providerChip = (u) => u?.provider === "google" ? `<span class="ev-chip ev-chip-g">${GLOGO}Google</span>` : '<span class="ev-chip">\u0E2D\u0E35\u0E40\u0E21\u0E25</span>';
function versionCardHTML(v) {
  const ver = v.version || "\u2014";
  const bld = v.build ? ` \xB7 build ${v.build}` : "";
  return `<b>\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A</b><div class="ev-stat" style="margin-top:12px"><div><div id="appVerNum" style="font-size:20px;font-weight:700;letter-spacing:-.01em">${ver}</div><p class="ev-sub" id="appVerSub">${v.date ? v.date : "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E38\u0E48\u0E19\u2026"}${bld}</p></div></div>`;
}
export {
  providerChip,
  usageCardHTML,
  versionCardHTML
};

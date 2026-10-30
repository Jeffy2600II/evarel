const AHEAD_PRESETS = [10, 30, 60, 1440];
const isRemObj = (r) => r && typeof r === "object" && !Array.isArray(r);
const remList = (rem) => Array.isArray(rem) ? rem.filter(isRemObj) : [];
const defaultRem = () => [{ k: "before", m: 0 }];
function notifyState(rem, hasTime) {
  const L = remList(rem), onTime = L.some((r) => r.k === "before" && r.m === 0);
  const ahead = [...new Set(L.filter((r) => r.k === "before" && Number.isInteger(r.m) && r.m > 0).map((r) => r.m))].sort((a, b) => a - b);
  const at = [...new Set(L.filter((r) => r.k === "at" && typeof r.t === "string").map((r) => r.t))].sort();
  const issue = (onTime || ahead.length) && !hasTime ? "\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E2A\u0E48\u0E40\u0E27\u0E25\u0E32 \u0E08\u0E36\u0E07\u0E08\u0E30\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E44\u0E14\u0E49 \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19 \u0E43\u0E2B\u0E49\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19" : "";
  return { onTime, ahead, at, issue };
}
const checkNotify = (rem, time) => notifyState(rem, !!time).issue;
function toggleOnTime(rem, on) {
  const L = remList(rem).map((r) => ({ ...r })), has = L.some((r) => r.k === "before" && r.m === 0);
  if (on) return has ? L : [{ k: "before", m: 0 }, ...L];
  return L.filter((r) => !(r.k === "before" && r.m === 0));
}
function toggleAhead(rem, m) {
  const L = remList(rem).map((r) => ({ ...r }));
  if (!Number.isInteger(m) || m <= 0) return L;
  const has = L.some((r) => r.k === "before" && r.m === m);
  return has ? L.filter((r) => !(r.k === "before" && r.m === m)) : [...L, { k: "before", m }];
}
function countNotifiable(items) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items) {
    if (!it || typeof it !== "object" || !Array.isArray(it.rem)) continue;
    const s = notifyState(it.rem, true);
    if (s.at.length || (s.onTime || s.ahead.length) && it.time) n++;
  }
  return n;
}
export {
  AHEAD_PRESETS,
  checkNotify,
  countNotifiable,
  defaultRem,
  isRemObj,
  notifyState,
  remList,
  toggleAhead,
  toggleOnTime
};

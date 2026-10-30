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
export {
  QUOTA_LOW,
  quotaShort,
  quotaState,
  resetClock,
  resetInAt,
  resetMs
};

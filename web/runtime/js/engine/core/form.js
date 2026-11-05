import { UNIT_TH, WD, MAX_REM } from "./constants.js";
import { parse } from "./dates.js";
import { remText } from "./schedule.js";
import { checkNotify } from "./notify.js";
const newDraftOf = (t, base) => ({ id: null, step: "form", open: "", type: t, title: "", subject: "", start: base, end: "", endMode: "never", time: "", timeEnd: "", unit: t === "habit" ? "day" : "none", every: 1, days: [], track: "check", target: 1, unitName: "", rem: [{ k: "before", m: 0 }], err: "" });
const draftFromOf = (it) => ({ id: it.id, step: "form", open: "", type: it.type, title: it.title, subject: it.subject, start: it.start, end: it.end, endMode: it.end ? "date" : "never", time: it.time, timeEnd: it.timeEnd, unit: it.repeat.unit, every: it.repeat.every, days: [...it.repeat.days], track: it.track === "none" ? "check" : it.track, target: it.target, unitName: it.unitName, rem: it.rem.map((r) => ({ ...r })), err: "" });
const everyTxtOf = (d) => d.every > 1 ? `\u0E17\u0E38\u0E01 ${d.every} ` : "\u0E17\u0E38\u0E01";
const repSumOf = (d) => d.unit === "none" ? "\u0E44\u0E21\u0E48\u0E0B\u0E49\u0E33" : d.unit === "week" ? `${everyTxtOf(d)}\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C${d.days.length ? ` \xB7 ${[...d.days].sort().map((x) => WD[x]).join(" ")}` : ""}` : `${everyTxtOf(d)}${UNIT_TH[d.unit]}`;
const remSumOf = (d) => d.rem.length ? d.rem.slice(0, 2).map(remText).join(", ") + (d.rem.length > 2 ? ` +${d.rem.length - 2}` : "") : "\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19";
const rangeSumOf = (d, today) => `${d.start === today ? "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49" : `\u0E40\u0E23\u0E34\u0E48\u0E21 ${d.start}`} \xB7 ${d.endMode === "date" && d.end ? `\u0E16\u0E36\u0E07 ${d.end}` : "\u0E44\u0E21\u0E48\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14"}`;
const notifyIssueOf = (d) => d.rem.some((r) => r.k === "before" && r.m >= 0) && !d.time ? "\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E2A\u0E48\u0E40\u0E27\u0E25\u0E32 \u0E08\u0E36\u0E07\u0E08\u0E30\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E44\u0E14\u0E49 \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19 \u0E43\u0E2B\u0E49\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19" : "";
function validateOf(d) {
  const T = d.type;
  if (!d.title.trim()) return "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2A\u0E48\u0E0A\u0E37\u0E48\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23";
  if (!d.start) return "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48";
  if (d.time && d.timeEnd && d.timeEnd <= d.time) return "\u0E40\u0E27\u0E25\u0E32\u0E08\u0E1A\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21";
  if (d.endMode === "date" && (!d.end || d.end < d.start)) return "\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21";
  {
    const ne = checkNotify(d.rem, d.time);
    if (ne) return ne;
  }
  if (T === "class" && !d.days.length) return "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E27\u0E31\u0E19";
  return "";
}
function buildItemOf(d, mk, old) {
  const T = d.type, week = T === "class" || d.unit === "week", days = week ? d.days.length ? [...d.days] : [parse(d.start).getDay()] : [];
  const unit = T === "task" ? "none" : T === "class" ? "week" : d.unit, multi = T === "habit" && d.track !== "check";
  return mk({
    id: d.id || Date.now(),
    type: T,
    title: d.title.trim(),
    subject: (d.subject || "").trim(),
    start: d.start,
    end: d.endMode === "date" && unit !== "none" ? d.end : "",
    time: d.time,
    timeEnd: T === "task" || T === "habit" ? "" : d.timeEnd,
    rem: d.rem.slice(0, MAX_REM).map((r) => ({ ...r })),
    repeat: { unit, every: Math.max(1, Math.round(+d.every || 1)), days },
    track: T === "habit" ? d.track : T === "task" ? "check" : "none",
    target: multi ? Math.max(1, Math.round(+d.target || 1)) : 1,
    unitName: multi ? (d.unitName || "").trim() : "",
    log: old ? old.log : {},
    skip: old ? old.skip : {}
  });
}
export {
  buildItemOf,
  draftFromOf,
  everyTxtOf,
  newDraftOf,
  notifyIssueOf,
  rangeSumOf,
  remSumOf,
  repSumOf,
  validateOf
};

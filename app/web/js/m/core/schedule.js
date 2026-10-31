import { DAY_MS, WD, addDays, esc, fmtDate, parse, ymd } from "./dates.js";
const UNIT_TH = { day: "\u0E27\u0E31\u0E19", week: "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C", month: "\u0E40\u0E14\u0E37\u0E2D\u0E19" };
const STREAK_LOOKBACK = 365, STAT_DAYS = 30;
const PERIODS = ["\u0E17\u0E31\u0E49\u0E07\u0E27\u0E31\u0E19", "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E0A\u0E49\u0E32", "\u0E0A\u0E48\u0E27\u0E07\u0E1A\u0E48\u0E32\u0E22", "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E22\u0E47\u0E19\u2013\u0E04\u0E48\u0E33"];
const TYPES = { habit: "\u0E01\u0E34\u0E08\u0E27\u0E31\u0E15\u0E23", task: "\u0E07\u0E32\u0E19", event: "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21", class: "\u0E04\u0E32\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E19" };
function occursOn(it, ds) {
  const d0 = parse(it.start), d = parse(ds), r = it.repeat;
  if (d < d0 || it.end && d > parse(it.end)) return false;
  if (r.unit === "none") return ds === it.start;
  if (r.unit === "day") return Math.round((d.getTime() - d0.getTime()) / DAY_MS) % r.every === 0;
  if (r.unit === "week") return r.days.includes(d.getDay()) && Math.floor(Math.round((d.getTime() - addDays(d0, -d0.getDay()).getTime()) / DAY_MS) / 7) % r.every === 0;
  return d.getDate() === d0.getDate() && ((d.getFullYear() - d0.getFullYear()) * 12 + d.getMonth() - d0.getMonth()) % r.every === 0;
}
const val = (it, ds) => it.log[ds] || 0;
const target = (it) => it.track === "count" || it.track === "timer" ? it.target : 1;
const tracked = (it) => it.track !== "none";
const isDone = (it, ds) => val(it, ds) >= target(it);
const skipped = (it, ds) => !!it.skip[ds];
const isFuture = (ds, today) => ds > today;
const onDate = (items, ds) => items.filter((it) => occursOn(it, ds)).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
const overdue = (items, today) => items.filter((it) => it.type === "task" && it.start < today && !isDone(it, it.start)).sort((a, b) => a.start.localeCompare(b.start));
function streak(it) {
  let n = 0;
  for (let i = 0; i < STREAK_LOOKBACK; i++) {
    const ds = ymd(addDays(/* @__PURE__ */ new Date(), -i));
    if (!occursOn(it, ds) || skipped(it, ds)) continue;
    if (isDone(it, ds)) n++;
    else if (i > 0) break;
  }
  return n;
}
function rate(it) {
  let t = 0, ok = 0;
  for (let i = 0; i < STAT_DAYS; i++) {
    const ds = ymd(addDays(/* @__PURE__ */ new Date(), -i));
    if (ds < it.start || !occursOn(it, ds) || skipped(it, ds)) continue;
    t++;
    if (isDone(it, ds)) ok++;
  }
  return t ? Math.round(100 * ok / t) : 0;
}
const remText = (r) => r.k === "at" ? `\u0E40\u0E27\u0E25\u0E32 ${r.t} \u0E19.` : r.m === 0 ? "\u0E15\u0E23\u0E07\u0E40\u0E27\u0E25\u0E32" : r.m % 1440 === 0 ? `\u0E01\u0E48\u0E2D\u0E19 ${r.m / 1440} \u0E27\u0E31\u0E19` : r.m % 60 === 0 ? `\u0E01\u0E48\u0E2D\u0E19 ${r.m / 60} \u0E0A\u0E21.` : `\u0E01\u0E48\u0E2D\u0E19 ${r.m} \u0E19\u0E32\u0E17\u0E35`;
function repeatText(it) {
  const r = it.repeat, tail = it.end ? ` \xB7 \u0E16\u0E36\u0E07 ${fmtDate(it.end)}` : "";
  if (r.unit === "none") return `\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27 \xB7 ${fmtDate(it.start)}`;
  const one = r.every === 1, u = UNIT_TH[r.unit];
  return (r.unit === "week" ? (one ? "\u0E17\u0E38\u0E01\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C" : `\u0E17\u0E38\u0E01 ${r.every} \u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C`) + ` \xB7 ${[...r.days].sort().map((d) => WD[d]).join(" ")}` : one ? `\u0E17\u0E38\u0E01${u}` : `\u0E17\u0E38\u0E01 ${r.every} ${u}`) + tail;
}
const timeText = (it) => it.time ? it.time + (it.timeEnd ? `\u2013${it.timeEnd}` : "") : "";
function periodOf(it) {
  if (!it.time) return 0;
  const h = +it.time.slice(0, 2);
  return h < 12 ? 1 : h < 17 ? 2 : 3;
}
const scheduled = (it, ds) => ds >= it.start && occursOn(it, ds);
function dayState(it, ds, today) {
  if (!scheduled(it, ds)) return "off";
  if (skipped(it, ds)) return "skip";
  if (isDone(it, ds)) return "done";
  if (val(it, ds) > 0) return "part";
  if (ds > today) return "future";
  return ds === today ? "today" : "miss";
}
function dayMenu(it, ds) {
  const sk = skipped(it, ds), v = val(it, ds), tg = target(it), multi = it.track !== "check", done = isDone(it, ds), out = [];
  if (sk) return [{ act: "dm-skip", id: `0|${ds}`, icon: "x", label: "\u0E40\u0E25\u0E34\u0E01\u0E02\u0E49\u0E32\u0E21" }];
  if (multi) out.push({ act: "dm-set", id: `${tg}|${ds}`, icon: "check", label: `\u0E17\u0E33\u0E04\u0E23\u0E1A\u0E40\u0E1B\u0E49\u0E32 (${tg} ${esc(it.unitName)})`, hint: done ? "\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19" : "" }, { act: "dm-num", id: ds, icon: "edit", label: "\u0E1B\u0E23\u0E31\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u2026", hint: `${v}/${tg}` }, { act: "dm-set", id: `0|${ds}`, icon: "x", label: "\u0E25\u0E49\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19 0" });
  else out.push({ act: "dm-set", id: `1|${ds}`, icon: "check", label: "\u0E17\u0E33\u0E41\u0E25\u0E49\u0E27", hint: done ? "\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19" : "" }, { act: "dm-set", id: `0|${ds}`, icon: "x", label: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E17\u0E33", hint: done ? "" : "\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19" });
  if (!done) out.push("-", { act: "dm-skip", id: `1|${ds}`, icon: "skip", label: "\u0E02\u0E49\u0E32\u0E21\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49 (\u0E44\u0E21\u0E48\u0E19\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E1E\u0E25\u0E32\u0E14)" });
  return out;
}
export {
  PERIODS,
  TYPES,
  dayMenu,
  dayState,
  isDone,
  isFuture,
  occursOn,
  onDate,
  overdue,
  periodOf,
  rate,
  remText,
  repeatText,
  scheduled,
  skipped,
  streak,
  target,
  timeText,
  tracked,
  val
};

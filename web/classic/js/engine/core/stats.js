import { TH_MON, WD, addDays, ymd } from "./dates.js";
import { isDone, occursOn, skipped } from "./schedule.js";
const ARC_C = 2 * Math.PI * 42;
const habits = (items) => items.filter((it) => it.type === "habit");
const typeIcon = (it) => it.track === "timer" ? "clock" : it.track === "count" ? "chart" : { habit: "check", task: "tasks", event: "bell", class: "cal" }[it.type];
function periodStats(it, days) {
  let t = 0, ok = 0;
  for (let i = 0; i < days; i++) {
    const ds = ymd(addDays(/* @__PURE__ */ new Date(), -i));
    if (ds < it.start || !occursOn(it, ds) || skipped(it, ds)) continue;
    t++;
    if (isDone(it, ds)) ok++;
  }
  return { t, ok };
}
function chartData(items, period) {
  const hs = habits(items), isM = period === "month", n = isM ? 4 : 7, size = isM ? 7 : 1, out = [];
  for (let k = 0; k < n; k++) {
    let t = 0, ok = 0, start = null;
    for (let j = 0; j < size; j++) {
      const d = addDays(/* @__PURE__ */ new Date(), -((n - 1 - k) * size + (size - 1 - j))), ds = ymd(d);
      if (j === 0) start = d;
      hs.forEach((h) => {
        if (ds < h.start || !occursOn(h, ds) || skipped(h, ds)) return;
        t++;
        if (isDone(h, ds)) ok++;
      });
    }
    const s = start;
    out.push({ t, ok, pct: t ? Math.round(100 * ok / t) : 0, label: isM ? `${s.getDate()} ${TH_MON[s.getMonth()]}` : WD[s.getDay()], today: !isM && k === n - 1 });
  }
  return out;
}
const totalDone = (it) => Object.keys(it.log).filter((ds) => occursOn(it, ds) && isDone(it, ds)).length;
import { streak } from "./schedule.js";
function buildStatsProps(items, period, today) {
  const hs = habits(items), isM = period === "month", days = isM ? 28 : 7;
  const per = hs.map((h) => [h, periodStats(h, days)]);
  const T = per.reduce((n, [, s]) => n + s.t, 0), K = per.reduce((n, [, s]) => n + s.ok, 0);
  const rate = T ? Math.round(100 * K / T) : 0, best = Math.max(0, ...hs.map(streak));
  const td = hs.filter((h) => occursOn(h, today) && !skipped(h, today)), tdDone = td.filter((h) => isDone(h, today)).length;
  const lv = (r) => r >= 80 ? "hi" : r >= 50 ? "mid" : "lo";
  const rows = per.map(([h, s]) => {
    const r = s.t ? Math.round(100 * s.ok / s.t) : 0, st = streak(h);
    return { id: h.id, title: h.title, sub: `${s.t ? `\u0E17\u0E33 ${s.ok} \u0E08\u0E32\u0E01 ${s.t} \u0E04\u0E23\u0E31\u0E49\u0E07` : "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E19\u0E35\u0E49"}${st ? ` \xB7 \u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07 ${st} \u0E27\u0E31\u0E19` : ""}`, full: r >= 100, pct: r, pctText: s.t ? r + "%" : "\u2013", lv: s.t ? lv(r) : "" };
  });
  return { isM, period, rate, arcC: ARC_C, K, T, best, tdDone, tdTotal: td.length, cols: chartData(items, period), rows };
}
import { TYPES, repeatText, timeText } from "./schedule.js";
function buildAllProps(items, type, iconOf) {
  const types = type === "all" ? Object.keys(TYPES) : [type], plus = iconOf("plus"), sections = [];
  for (const k of types) {
    const g = items.filter((it) => it.type === k);
    if (g.length) sections.push({ key: k, label: TYPES[k], count: g.length, plus, rows: g.map((it) => ({ id: it.id, icon: iconOf(typeIcon(it)), title: it.title, sub: `${repeatText(it)}${it.time ? ` \xB7 ${timeText(it)}` : ""}` })) });
  }
  return { sections };
}
export {
  ARC_C,
  buildAllProps,
  buildStatsProps,
  chartData,
  habits,
  periodStats,
  totalDone,
  typeIcon
};

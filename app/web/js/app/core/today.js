import { PERIODS, onDate, overdue, tracked, isDone, periodOf } from "./schedule.js";
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nowHMOf = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
function buildTodayProps(items, ui, today, now, fmt) {
  const ds = ui.date;
  const hello = (h) => h < 12 ? "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E15\u0E2D\u0E19\u0E40\u0E0A\u0E49\u0E32" : h < 17 ? "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E15\u0E2D\u0E19\u0E1A\u0E48\u0E32\u0E22" : "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E15\u0E2D\u0E19\u0E40\u0E22\u0E47\u0E19";
  const sub = ds === today ? hello(now.getHours()) : "\u0E22\u0E49\u0E2D\u0E19\u0E14\u0E39/\u0E27\u0E32\u0E07\u0E41\u0E1C\u0E19";
  const start = addDays(now, -now.getDay() + 7 * ui.weekOff);
  const week = Array.from({ length: 7 }, (_, i) => ymdOf(addDays(start, i)));
  const mid = /* @__PURE__ */ new Date(week[3] + "T00:00:00");
  const list = onDate(items, ds);
  const tr = list.filter(tracked);
  const done = tr.filter((it) => isDone(it, ds)).length;
  const pct = tr.length ? Math.round(100 * done / tr.length) : 0;
  const od = ds === today ? overdue(items, today) : [];
  const nextId = ds === today ? list.find((it) => it.time && it.time >= nowHMOf(now) && !(tracked(it) && isDone(it, ds)))?.id ?? null : null;
  const nextIt = list.find((it) => it.id === nextId) ?? null;
  let idx = 0;
  const groups = PERIODS.map((n, g) => [n, list.filter((it) => periodOf(it) === g)]).filter(([, l]) => l.length).map(([n, l]) => ({ name: n, rows: l.map((it) => ({ it, next: it.id === nextId, idx: idx++ })) }));
  return {
    empty: items.length === 0,
    dateLabel: fmt.fmtDate(ds),
    sub,
    hello: sub,
    week: week.map((w) => ({ ds: w, wd: fmt.WD[(/* @__PURE__ */ new Date(w + "T00:00:00")).getDay()], d: (/* @__PURE__ */ new Date(w + "T00:00:00")).getDate(), isSel: ui.date === w, isToday: w === today })),
    showTodayChip: ui.date !== today || ui.weekOff !== 0,
    monthLabel: fmt.TH_MONTH[mid.getMonth()],
    yearBE: mid.getFullYear() + 543,
    done,
    trackedTotal: tr.length,
    pct,
    nextItem: nextIt ? { time: nextIt.time, title: nextIt.title } : null,
    overdue: od.map((it, i) => ({ it, late: true, idx: i })),
    groups,
    mainRows: groups.flatMap((g) => g.rows)
  };
}
export {
  buildTodayProps,
  ymdOf
};

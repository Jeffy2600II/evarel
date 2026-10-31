import { addDays, ymd } from "./dates.js";
const mk = (today, o) => ({ id: o.id, type: "habit", title: "", subject: "", start: today, end: "", time: "", timeEnd: "", rem: [{ k: "before", m: 0 }], track: "none", target: 1, unitName: "", repeat: { unit: "none", every: 1, days: [] }, log: {}, skip: {}, ...o });
const fill = (n, v) => Object.fromEntries(Array.from({ length: n }, (_, i) => [ymd(addDays(/* @__PURE__ */ new Date(), -i - 1)), v]));
const daily = () => ({ unit: "day", every: 1, days: [] });
const weekly = (d) => ({ unit: "week", every: 1, days: d });
const cls = (today, id, d, t, te, title) => mk(today, { id, type: "class", title, time: t, timeEnd: te, repeat: weekly([d]) });
const seed = (today) => ({ items: [
  mk(today, { id: 1, title: "\u0E14\u0E37\u0E48\u0E21\u0E19\u0E49\u0E33", track: "count", target: 8, unitName: "\u0E41\u0E01\u0E49\u0E27", repeat: daily(), log: fill(6, 8), start: ymd(addDays(/* @__PURE__ */ new Date(), -10)) }),
  mk(today, { id: 2, title: "\u0E2D\u0E48\u0E32\u0E19\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D", time: "19:00", track: "timer", target: 30, unitName: "\u0E19\u0E32\u0E17\u0E35", repeat: daily(), log: fill(3, 30), start: ymd(addDays(/* @__PURE__ */ new Date(), -10)) }),
  mk(today, { id: 3, title: "\u0E19\u0E2D\u0E19\u0E01\u0E48\u0E2D\u0E19 22:00", time: "22:00", track: "check", repeat: daily(), log: fill(4, 1), start: ymd(addDays(/* @__PURE__ */ new Date(), -10)) }),
  mk(today, { id: 4, title: "\u0E27\u0E34\u0E48\u0E07", time: "17:00", track: "check", repeat: weekly([1, 3, 5]), start: ymd(addDays(/* @__PURE__ */ new Date(), -10)), log: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [ymd(addDays(/* @__PURE__ */ new Date(), -i * 2 - 1)), 1])) }),
  mk(today, { id: 5, type: "task", title: "\u0E01\u0E32\u0E23\u0E1A\u0E49\u0E32\u0E19\u0E04\u0E13\u0E34\u0E15\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C", subject: "\u0E04\u0E13\u0E34\u0E15", time: "16:00", track: "check" }),
  mk(today, { id: 6, type: "task", title: "\u0E17\u0E48\u0E2D\u0E07\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C Unit 4", subject: "\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29", time: "20:00", track: "check", start: ymd(addDays(/* @__PURE__ */ new Date(), -1)) }),
  mk(today, { id: 7, type: "task", title: "\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E27\u0E34\u0E17\u0E22\u0E32\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C", subject: "\u0E27\u0E34\u0E17\u0E22\u0E4C", track: "check", start: ymd(addDays(/* @__PURE__ */ new Date(), 2)) }),
  mk(today, { id: 8, type: "event", title: "\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E0A\u0E21\u0E23\u0E21", time: "16:30", timeEnd: "17:30", repeat: weekly([4]) }),
  cls(today, 9, 1, "08:30", "09:20", "\u0E04\u0E13\u0E34\u0E15\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C"),
  cls(today, 10, 1, "09:20", "10:10", "\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22"),
  cls(today, 11, 2, "08:30", "09:20", "\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29"),
  cls(today, 12, 3, "08:30", "09:20", "\u0E27\u0E34\u0E17\u0E22\u0E32\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C"),
  cls(today, 13, 4, "09:20", "10:10", "\u0E28\u0E34\u0E25\u0E1B\u0E30"),
  cls(today, 14, 5, "08:30", "09:20", "\u0E0A\u0E38\u0E21\u0E19\u0E38\u0E21")
] });
export {
  cls,
  daily,
  fill,
  mk,
  seed,
  weekly
};

import { pad, ymd, addDays } from "./dates.js";
import { scheduled, skipped, tracked, isDone } from "./schedule.js";
const addMin = (t, m) => {
  const [h, mi] = t.split(":").map(Number), x = Math.min(h * 60 + mi + m, 1439);
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
};
function occurrenceEventsOf(items, start, end) {
  const out = [];
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    const ds = ymd(d);
    items.forEach((it) => {
      if (!scheduled(it, ds) || skipped(it, ds) || it.type === "habit" && !it.time) return;
      const done = tracked(it) && isDone(it, ds), ev = { id: `${it.id}_${ds}`, title: it.title, classNames: [`ev-fc-${it.type}`, ...done ? ["is-done"] : []], extendedProps: { itemId: it.id } };
      if (it.time) {
        ev.start = `${ds}T${it.time}:00`;
        ev.end = `${ds}T${it.timeEnd || addMin(it.time, it.type === "habit" ? 30 : 60)}:00`;
      } else {
        ev.start = ds;
        ev.allDay = true;
      }
      out.push(ev);
    });
  }
  return out;
}
const dotsForOf = (items, ds) => {
  const ts = [...new Set(items.filter((it) => scheduled(it, ds) && !skipped(it, ds)).map((it) => it.type))].slice(0, 4);
  return ts.map((t) => `<i data-t="${t}"></i>`).join("");
};
export {
  addMin,
  dotsForOf,
  occurrenceEventsOf
};

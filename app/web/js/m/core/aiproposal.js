import { mk, daily } from "./store.js";
const remFrom = (a) => (Array.isArray(a) ? a : []).map(Number).filter((m) => m >= 0).map((m) => ({ k: "before", m }));
function applyProposalTo(items, c, ctx) {
  const a = c.args || {};
  const find = (id) => items.find((x) => x.id == id);
  switch (c.tool) {
    case "item_create": {
      const o = { ...a, id: ctx.id };
      if (a.rem) o.rem = remFrom(a.rem);
      if (!o.start) o.start = ctx.today;
      if (!o.track) o.track = o.type === "habit" || o.type === "task" ? "check" : "none";
      if (o.type === "habit" && !a.repeat) o.repeat = daily();
      items.push(mk(ctx.today, o));
      return true;
    }
    case "item_update": {
      const it = find(a.id);
      if (!it) return false;
      const { id, rem, ...rest } = a;
      Object.assign(it, rest);
      if (rem) it.rem = remFrom(rem);
      return true;
    }
    case "item_delete": {
      const i = items.findIndex((x) => x.id == a.id);
      if (i < 0) return false;
      items.splice(i, 1);
      return true;
    }
    case "log_set": {
      const it = find(a.id);
      if (!it) return false;
      it.log[a.date] = a.value;
      return true;
    }
    case "skip_set": {
      const it = find(a.id);
      if (!it) return false;
      it.skip[a.date] = true;
      return true;
    }
    case "reminder_set": {
      const it = find(a.id);
      if (!it) return false;
      it.rem = remFrom(a.rem);
      return true;
    }
  }
  return false;
}
export {
  applyProposalTo,
  remFrom
};

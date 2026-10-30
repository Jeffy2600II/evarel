function diffItems(prev, next) {
  const m = new Map(prev.map((x) => [x.id, JSON.stringify(x)])), ids = new Set(next.map((x) => x.id));
  return { upserts: next.filter((x) => m.get(x.id) !== JSON.stringify(x)), removes: prev.filter((x) => !ids.has(x.id)).map((x) => x.id) };
}
function planImport(list, serverItems, mode) {
  let nextId = Math.max(0, ...serverItems.map((x) => Number(x.id) || 0)) + 1;
  const taken = new Set(serverItems.map((x) => Number(x.id)));
  return list.map((it) => {
    const c = JSON.parse(JSON.stringify(it));
    if (mode === "append" && taken.has(Number(c.id))) {
      c.id = nextId++;
    } else if (mode === "append") {
      taken.add(Number(c.id));
    }
    return c;
  });
}
export {
  diffItems,
  planImport
};

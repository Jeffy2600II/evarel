function diffItems(prev, next) {
  const m = new Map(prev.map((x) => [x.id, JSON.stringify(x)])), ids = new Set(next.map((x) => x.id));
  return { upserts: next.filter((x) => m.get(x.id) !== JSON.stringify(x)), removes: prev.filter((x) => !ids.has(x.id)).map((x) => x.id) };
}
export {
  diffItems
};

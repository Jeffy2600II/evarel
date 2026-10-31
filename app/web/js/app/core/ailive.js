function aiAskOf(deps) {
  return async (text, history) => {
    const t = await deps.token(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 45e3);
    try {
      const r = await fetch(`${deps.api}/ai/chat`, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify({ text, history }) });
      let j = {};
      try {
        j = await r.json();
      } catch (e) {
      }
      if (r.status === 503) return { text: "", cards: [], notice: { kind: "limit", reason: "global" } };
      if (r.status === 401) throw new Error("auth");
      if (r.status === 429) {
        deps.quotaFromChat(j.quota, true);
        return { text: "", cards: [], notice: { kind: "limit", reason: "user", ...deps.quotaResetAt() ? { resetAt: deps.quotaResetAt() } : {} } };
      }
      if (!r.ok) return { text: "", cards: [], notice: { kind: "error" } };
      deps.quotaFromChat(j.quota, false);
      return { text: j.text || "", cards: (j.proposals || []).map((p) => ({ status: "pending", tool: p.tool, args: p.args, summary: p.summary, ...p.sensitive ? { sensitive: true } : {} })) };
    } catch (e) {
      return { text: "", cards: [], notice: { kind: "error" } };
    } finally {
      clearTimeout(tm);
    }
  };
}
function memCallOf(deps) {
  return async (c) => {
    const t = await deps.token(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15e3);
    try {
      const a = c.args || {}, body = c.tool === "memory_save" ? { op: "save", fact: a.fact, ...c.sensitive ? { confirmSensitive: true } : {} } : { op: "forget", id: a.id };
      const r = await fetch(`${deps.api}/ai/memory`, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify(body) });
      let j = {};
      try {
        j = await r.json();
      } catch (e) {
      }
      return r.ok && j.ok !== false;
    } catch (e) {
      return false;
    } finally {
      clearTimeout(tm);
    }
  };
}
export {
  aiAskOf,
  memCallOf
};

const AHEAD_PRESETS = [10, 30, 60, 1440];
const isRemObj = (r) => r && typeof r === "object" && !Array.isArray(r);
const remList = (rem) => Array.isArray(rem) ? rem.filter(isRemObj) : [];
const defaultRem = () => [{ k: "before", m: 0 }];
function notifyState(rem, hasTime) {
  const L = remList(rem), onTime = L.some((r) => r.k === "before" && r.m === 0);
  const ahead = [...new Set(L.filter((r) => r.k === "before" && Number.isInteger(r.m) && r.m > 0).map((r) => r.m))].sort((a, b) => a - b);
  const at = [...new Set(L.filter((r) => r.k === "at" && typeof r.t === "string").map((r) => r.t))].sort();
  const issue = (onTime || ahead.length) && !hasTime ? "\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E2A\u0E48\u0E40\u0E27\u0E25\u0E32 \u0E08\u0E36\u0E07\u0E08\u0E30\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E44\u0E14\u0E49 \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19 \u0E43\u0E2B\u0E49\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19" : "";
  return { onTime, ahead, at, issue };
}
const checkNotify = (rem, time) => notifyState(rem, !!time).issue;
function toggleOnTime(rem, on) {
  const L = remList(rem).map((r) => ({ ...r })), has = L.some((r) => r.k === "before" && r.m === 0);
  if (on) return has ? L : [{ k: "before", m: 0 }, ...L];
  return L.filter((r) => !(r.k === "before" && r.m === 0));
}
function toggleAhead(rem, m) {
  const L = remList(rem).map((r) => ({ ...r }));
  if (!Number.isInteger(m) || m <= 0) return L;
  const has = L.some((r) => r.k === "before" && r.m === m);
  return has ? L.filter((r) => !(r.k === "before" && r.m === m)) : [...L, { k: "before", m }];
}
function countNotifiable(items) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items) {
    if (!it || typeof it !== "object" || !Array.isArray(it.rem)) continue;
    const s = notifyState(it.rem, true);
    if (s.at.length || (s.onTime || s.ahead.length) && it.time) n++;
  }
  return n;
}
const PUSH_WHY = { unsupported: "\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A Push", denied: "\u0E16\u0E39\u0E01\u0E1B\u0E34\u0E14\u0E44\u0E27\u0E49 \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C\u0E02\u0E2D\u0E07\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C", "no-backend": "\u0E42\u0E2B\u0E21\u0E14\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E23\u0E30\u0E1A\u0E1A\u0E2B\u0E25\u0E31\u0E07\u0E1A\u0E49\u0E32\u0E19", "not-asked": "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15", auth: "\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19", "no-key": "\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E2A\u0E21\u0E31\u0E04\u0E23 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07", subscribe: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", server: "\u0E23\u0E30\u0E1A\u0E1A\u0E2B\u0E25\u0E31\u0E07\u0E1A\u0E49\u0E32\u0E19\u0E44\u0E21\u0E48\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E21\u0E31\u0E04\u0E23 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07", limit: "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E04\u0E23\u0E1A 5 \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E41\u0E25\u0E49\u0E27" };
const pushWhyTextOf = (w) => PUSH_WHY[w] || "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08";
function urlB64ToU8(b64) {
  if (typeof b64 !== "string" || !b64) throw new Error("empty key");
  const pad = "=".repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/")), out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
function pushSubscribeOf(deps) {
  return async (askPermission) => {
    if (!deps.supported()) return { ok: false, why: "unsupported" };
    if (!deps.api()) return { ok: false, why: "no-backend" };
    if (deps.permission() === "denied") return { ok: false, why: "denied" };
    if (deps.permission() !== "granted") {
      if (!askPermission) return { ok: false, why: "not-asked" };
      const p = await deps.requestPermission();
      if (p !== "granted") return { ok: false, why: p === "denied" ? "denied" : "not-asked" };
    }
    let t;
    try {
      t = await deps.token();
    } catch (e) {
      return { ok: false, why: "auth" };
    }
    let key;
    try {
      const r = await fetch(`${deps.api()}/push/key`);
      if (!r.ok) return { ok: false, why: "no-key" };
      key = (await r.json()).publicKey;
    } catch (e) {
      return { ok: false, why: "no-key" };
    }
    let sub;
    try {
      const reg = await deps.swReady();
      sub = await reg.pushManager.getSubscription();
      const want = urlB64ToU8(key);
      if (sub && sub.options && sub.options.applicationServerKey) {
        const have = new Uint8Array(sub.options.applicationServerKey);
        if (have.length !== want.length || have.some((v, i) => v !== want[i])) {
          await sub.unsubscribe();
          sub = null;
        }
      }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want });
    } catch (e) {
      return { ok: false, why: "subscribe" };
    }
    try {
      const r = await fetch(`${deps.api()}/push/subscribe`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify(sub.toJSON()) });
      if (r.status === 403) return { ok: false, why: "limit" };
      if (r.status === 401) return { ok: false, why: "auth" };
      if (!r.ok) return { ok: false, why: "server" };
    } catch (e) {
      return { ok: false, why: "server" };
    }
    deps.save({ at: Date.now(), endpoint: sub.endpoint });
    return { ok: true };
  };
}
export {
  AHEAD_PRESETS,
  PUSH_WHY,
  checkNotify,
  countNotifiable,
  defaultRem,
  isRemObj,
  notifyState,
  pushSubscribeOf,
  pushWhyTextOf,
  remList,
  toggleAhead,
  toggleOnTime,
  urlB64ToU8
};

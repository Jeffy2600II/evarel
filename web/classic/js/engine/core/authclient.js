const authErr = (code) => Object.assign(new Error(code), { code });
const SUPA_SESS = "evarel-session-v2";
const nowS = () => Math.floor(Date.now() / 1e3);
const supaLoad = () => {
  try {
    const v = localStorage.getItem(SUPA_SESS);
    return v == null ? null : JSON.parse(v);
  } catch (err) {
    return null;
  }
};
const supaSave = (t) => localStorage.setItem(SUPA_SESS, JSON.stringify(t));
const supaClear = () => localStorage.removeItem(SUPA_SESS);
const SupaCore = (api) => {
  const raw = async (path, { method = "GET", body, token: token2 } = {}) => {
    let r;
    try {
      r = await fetch(`${api}${path}`, { method, headers: { "Content-Type": "application/json", ...token2 ? { Authorization: "Bearer " + token2 } : {} }, body: body ? JSON.stringify(body) : void 0 });
    } catch (err) {
      throw authErr("network");
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(authErr(j.code || (r.status === 401 ? "invalid_credentials" : "unknown")), { status: r.status });
    return j;
  };
  let refreshing = null;
  const token = async () => {
    const s = supaLoad();
    if (!s) throw authErr("unverified");
    if (s.expires_at - nowS() > 60) return s.access_token;
    refreshing = refreshing || raw("/auth/refresh", { method: "POST", body: { refresh_token: s.refresh_token } }).then((n) => {
      supaSave(n);
      return n;
    }).catch((e) => {
      if (e.status === 401 || e.status === 400) supaClear();
      throw e;
    }).finally(() => {
      refreshing = null;
    });
    return (await refreshing).access_token;
  };
  const userOf = (s) => ({ id: s.user.id, name: s.user.name || (s.user.email || "").split("@")[0], email: s.user.email, provider: s.user.provider || "email" });
  return { raw, token, userOf };
};
const SUPA_HOST = "https://vdbmwmmsfrgpaauzspup.supabase.co";
const OAUTH_PARK = "evarel-oauth-park";
const OAUTH_ERR = "evarel-oauth-error";
const oauthParkRead = () => {
  try {
    const v = localStorage.getItem(OAUTH_PARK);
    return v ? JSON.parse(v) : null;
  } catch (err) {
    return null;
  }
};
const oauthParkWrite = (p) => {
  try {
    localStorage.setItem(OAUTH_PARK, JSON.stringify(p));
  } catch (err) {
  }
};
const oauthParkClear = () => {
  try {
    localStorage.removeItem(OAUTH_PARK);
  } catch (err) {
  }
};
const SupaAuth = (api) => {
  const c = SupaCore(api);
  let pending = null;
  const take = (s) => {
    supaSave({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: s.user });
    return c.userOf(s);
  };
  return {
    async session() {
      const s = supaLoad();
      if (!s) return null;
      try {
        await c.token();
        return c.userOf(supaLoad());
      } catch (err) {
        console.warn("session", err);
        return null;
      }
    },
    /* Google: เบราว์เซอร์ไปหน้า Google ผ่าน Supabase แล้วกลับมาพร้อม token ใน URL hash (ดู takeOAuthReturn) */
    async signInGoogle() {
      location.assign(`${SUPA_HOST}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + location.pathname)}`);
      return new Promise(() => {
      });
    },
    async takeOAuthReturn() {
      let oauthErr = "";
      try {
        oauthErr = sessionStorage.getItem(OAUTH_ERR) || "";
        sessionStorage.removeItem(OAUTH_ERR);
      } catch (err) {
      }
      if (oauthErr) throw authErr(oauthErr === "access_denied" ? "oauth_cancelled" : "oauth_failed");
      const h = new URLSearchParams(location.hash.replace(/^#/, ""));
      const inHash = !!h.get("access_token");
      const tok = inHash ? Object.fromEntries(h) : oauthParkRead();
      if (!tok || !tok.access_token) return null;
      if (inHash) {
        oauthParkWrite(tok);
        history.replaceState(null, "", location.pathname + location.search);
      }
      const ex = Number(tok.expires_at) || nowS() + (Number(tok.expires_in) || 0);
      const post = () => c.raw("/auth/session", { method: "POST", body: { access_token: String(tok.access_token), refresh_token: String(tok.refresh_token || ""), expires_at: ex } });
      try {
        let j;
        try {
          j = await post();
        } catch (err) {
          if (err && (err.code === "network" || !(err.status < 500))) {
            await new Promise((r) => setTimeout(r, 500));
            j = await post();
          } else throw err;
        }
        oauthParkClear();
        return take(j);
      } catch (err) {
        if (err && err.status && err.status < 500) oauthParkClear();
        throw authErr("oauth_failed");
      }
    },
    async signInEmail(email, pw) {
      return take(await c.raw("/auth/login", { method: "POST", body: { email, password: pw } }));
    },
    async signUp({ name, email, password }) {
      const j = await c.raw("/auth/signup", { method: "POST", body: { name, email, password } });
      if (j.status === "verify") {
        pending = { email, type: "signup" };
        throw authErr("verify_needed");
      }
      return take(j);
    },
    async sendReset(email) {
      await c.raw("/auth/forgot", { method: "POST", body: { email } });
      pending = { email, type: "recovery" };
    },
    async verifyCode(email, code, type) {
      return take(await c.raw("/auth/verify", { method: "POST", body: { email, code, type } }));
    },
    async resend(email, type) {
      await c.raw("/auth/resend", { method: "POST", body: { email, type } });
    },
    async setPassword(password) {
      await c.raw("/auth/password", { method: "POST", body: { password }, token: await c.token() });
    },
    async signOut() {
      supaClear();
      oauthParkClear();
    },
    /* ล้าง OAuth ที่จอดไว้ด้วย กันเซสชันค้างหลังออกจากระบบ */
    async deleteAccount(pw) {
      await c.raw("/auth/account", { method: "DELETE", body: { password: pw }, token: await c.token() });
      supaClear();
    }
  };
};
const SupaAdapter = (api) => {
  const c = SupaCore(api);
  const call = async (path, o = {}) => {
    const t = await c.token();
    const r = await fetch(`${api}${path}`, { ...o, headers: { "Content-Type": "application/json", Authorization: "Bearer " + t } });
    if (!r.ok) throw new Error(`${o.method || "GET"} ${path} ${r.status}`);
    return r;
  };
  return {
    token: c.token,
    async load() {
      return { items: (await (await call("/items")).json()).items };
    },
    async apply({ upserts, removes }) {
      await Promise.all([...upserts.map((it) => call(`/items/${it.id}`, { method: "PUT", body: JSON.stringify(it) })), ...removes.map((id) => call(`/items/${id}`, { method: "DELETE" }))]);
    }
  };
};
export {
  OAUTH_ERR,
  OAUTH_PARK,
  SUPA_HOST,
  SUPA_SESS,
  SupaAdapter,
  SupaAuth,
  SupaCore,
  authErr,
  nowS,
  oauthParkClear,
  oauthParkRead,
  oauthParkWrite,
  supaClear,
  supaLoad,
  supaSave
};

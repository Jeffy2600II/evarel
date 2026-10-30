const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PW_MIN = 8;
const MAIL_TYPO = { "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmil.com": "gmail.com", "hotmial.com": "hotmail.com", "yaho.com": "yahoo.com" };
function authValidate(kind, v) {
  const e = {}, em = (v.email || "").trim();
  if (!em) e.email = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E2D\u0E35\u0E40\u0E21\u0E25";
  else if (!EMAIL_RE.test(em)) e.email = "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 (\u0E40\u0E0A\u0E48\u0E19 name@gmail.com)";
  if (kind === "signup") {
    if (!(v.name || "").trim()) e.name = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D";
    if ((v.password || "").length < PW_MIN) e.password = `\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${PW_MIN} \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23`;
    if (!v.terms) e.terms = "\u0E15\u0E49\u0E2D\u0E07\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E01\u0E48\u0E2D\u0E19\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35";
  }
  if (kind === "login" && !v.password) e.password = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19";
  if (kind === "code") {
    delete e.email;
    if (!/^\d{6}$/.test((v.code || "").trim())) e.code = "\u0E43\u0E2A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 6 \u0E2B\u0E25\u0E31\u0E01";
  }
  if (kind === "newpw") {
    delete e.email;
    if ((v.password || "").length < PW_MIN) e.password = `\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${PW_MIN} \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23`;
  }
  return e;
}
function pwStrength(p) {
  const s = [p.length >= PW_MIN, p.length >= 12, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^\w]/.test(p)].filter(Boolean).length, lv = p.length < PW_MIN ? p ? 1 : 0 : Math.min(4, Math.max(1, s - 1));
  return { lv, label: p ? p.length < PW_MIN ? `\u0E2D\u0E35\u0E01 ${PW_MIN - p.length} \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E08\u0E36\u0E07\u0E08\u0E30\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49` : ["", "\u0E2D\u0E48\u0E2D\u0E19", "\u0E1E\u0E2D\u0E43\u0E0A\u0E49", "\u0E14\u0E35", "\u0E41\u0E02\u0E47\u0E07\u0E41\u0E23\u0E07"][lv] : "\u0E43\u0E0A\u0E49\u0E15\u0E31\u0E27\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E25\u0E47\u0E01-\u0E43\u0E2B\u0E0D\u0E48 \u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 \u0E41\u0E25\u0E30\u0E2A\u0E31\u0E0D\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E1C\u0E2A\u0E21\u0E01\u0E31\u0E19\u0E08\u0E30\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E02\u0E36\u0E49\u0E19" };
}
function coolView(n, screen) {
  return { disabled: n > 0, html: n > 0 ? `<span>\u0E2A\u0E48\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E44\u0E14\u0E49\u0E43\u0E19 ${n} \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35</span>` : `<span>${screen === "code" ? "\u0E2A\u0E48\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07" : "\u0E2A\u0E48\u0E07\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"}</span>` };
}
function mailHint(value) {
  const [u, dom] = value.trim().split("@"), fix = dom && MAIL_TYPO[dom.toLowerCase()];
  return fix ? { u, fix } : null;
}
const resendToast = (screen) => screen === "code" ? "\u0E2A\u0E48\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E25\u0E49\u0E27" : "\u0E2A\u0E48\u0E07\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E25\u0E49\u0E27";
export {
  EMAIL_RE,
  MAIL_TYPO,
  PW_MIN,
  authValidate,
  coolView,
  mailHint,
  pwStrength,
  resendToast
};

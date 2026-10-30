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
export {
  EMAIL_RE,
  MAIL_TYPO,
  PW_MIN,
  authValidate
};

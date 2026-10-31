import { esc } from "./dates.js";
const AV_HUES = [250, 268, 286, 306, 330, 352, 12, 24, 162, 176, 190, 204, 222], THAI_LEAD = /^[เแโใไ]+/;
const AV_LIGHT_FIX = { 162: 33, 176: 33, 190: 33 };
const hashStr = (s) => {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
function profileOfUser(U) {
  const user = U, name = (user?.name || "").trim(), seed = user?.id || user?.email || name || "?", src = (name || user?.email || "?").replace(THAI_LEAD, "") || "?", h = AV_HUES[hashStr(seed) % AV_HUES.length], L = AV_LIGHT_FIX[h] ?? 38;
  return { name: name || user?.email || "", letter: ([...src][0] || "?").toUpperCase(), bg: `linear-gradient(140deg,hsl(${h} 55% ${L}%),hsl(${(h + 26) % 360} 55% 28%))` };
}
function avatarHTMLOf(U, o = {}) {
  const p = profileOfUser(U), tag = o.tag === "button" ? "button" : "span", a = tag === "button" ? ` type="button" data-act="${o.act || "settings"}" aria-label="${o.label || "\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32"}"` : ` role="img" aria-label="${esc(p.name || "\u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C")}"`;
  return `<${tag} class="ev-avatar"${a} style="--av: ${p.bg};${o.size ? ` --sz: ${o.size}px;` : ""}">${esc(p.letter)}</${tag}>`;
}
const firstNameOf = (U) => (U?.name || "").trim().split(/\s+/)[0];
export {
  AV_HUES,
  THAI_LEAD,
  avatarHTMLOf,
  firstNameOf,
  hashStr,
  profileOfUser
};

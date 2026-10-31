const TH_MON = ["\u0E21.\u0E04.", "\u0E01.\u0E1E.", "\u0E21\u0E35.\u0E04.", "\u0E40\u0E21.\u0E22.", "\u0E1E.\u0E04.", "\u0E21\u0E34.\u0E22.", "\u0E01.\u0E04.", "\u0E2A.\u0E04.", "\u0E01.\u0E22.", "\u0E15.\u0E04.", "\u0E1E.\u0E22.", "\u0E18.\u0E04."];
const TH_DAY = ["\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C", "\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C", "\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23", "\u0E1E\u0E38\u0E18", "\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E2F", "\u0E28\u0E38\u0E01\u0E23\u0E4C", "\u0E40\u0E2A\u0E32\u0E23\u0E4C"];
const TH_MONTH = ["\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21", "\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C", "\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21", "\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19", "\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21", "\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19", "\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21", "\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21", "\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19", "\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21", "\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19", "\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21"];
const WD = ["\u0E2D\u0E32", "\u0E08", "\u0E2D", "\u0E1E", "\u0E1E\u0E24", "\u0E28", "\u0E2A"];
const DAY_MS = 864e5;
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => /* @__PURE__ */ new Date(`${s}T00:00:00`);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmtDate = (ds) => {
  const d = parse(ds);
  return `${TH_DAY[d.getDay()]}\u0E17\u0E35\u0E48 ${d.getDate()} ${TH_MON[d.getMonth()]}`;
};
const nowHM = () => {
  const d = /* @__PURE__ */ new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtClock = (ms) => {
  const s = Math.floor(ms / 1e3);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dayLab = (ds, today) => ds === today ? "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49" : ds === ymd(addDays(/* @__PURE__ */ new Date(), -1)) ? "\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E27\u0E32\u0E19" : ds === ymd(addDays(/* @__PURE__ */ new Date(), 1)) ? "\u0E1E\u0E23\u0E38\u0E48\u0E07\u0E19\u0E35\u0E49" : fmtDate(ds);
export {
  DAY_MS,
  TH_DAY,
  TH_MON,
  TH_MONTH,
  WD,
  addDays,
  dayLab,
  esc,
  fmtClock,
  fmtDate,
  nowHM,
  pad,
  parse,
  ymd
};

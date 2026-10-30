const pills = (act, opts, cur) => `<div class="ev-filters" role="group">${opts.map(([k, l]) => `<button aria-pressed="${cur === k}" data-act="${act}" data-id="${k}">${l}</button>`).join("")}</div>`;
const chips = (act, o, arr) => `<div class="ev-filters ev-wrap">${o.map(([k, l]) => `<button type="button" aria-pressed="${arr.includes(k)}" data-act="${act}" data-id="${k}">${l}</button>`).join("")}</div>`;
const skeleton = () => `<div class="ev-main" style="padding-top:var(--s4)"><div class="ev-skeleton"></div><div class="ev-skeleton"></div><div class="ev-skeleton"></div></div>`;
const stepper = (l, act, v, u) => `<div class="ev-stepper"><span>${l}</span><div class="ev-step"><button type="button" data-act="${act}" data-id="-1" aria-label="\u0E25\u0E14" ${v <= 1 ? "disabled" : ""}>\u2212</button><b>${v}</b><button type="button" data-act="${act}" data-id="1" aria-label="\u0E40\u0E1E\u0E34\u0E48\u0E21">+</button></div>${u}</div>`;
const fld = (label, name, type, extra = "", after = "") => `<div class="ev-ifield"><label for="f-${name}">${label}</label><div class="ev-pw"><input class="ev-input" id="f-${name}" name="${name}" type="${type}" ${extra}>${after}</div><div class="ev-field-err" id="e-${name}" hidden></div></div>`;
export {
  chips,
  fld,
  pills,
  skeleton,
  stepper
};

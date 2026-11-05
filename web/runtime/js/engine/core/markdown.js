const MD_ESC = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MD_SAFE_URL = /^(https?:\/\/|mailto:|tel:)/i;
function mdInline(src) {
  const slots = [];
  const hold = (h) => {
    slots.push(h);
    return "\0" + (slots.length - 1) + "\0";
  };
  let s = String(src ?? "");
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|~>])/g, (_, c) => hold(MD_ESC(c)));
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, c) => hold('<code class="ev-md-code">' + MD_ESC(c.trim()) + "</code>"));
  s = MD_ESC(s);
  s = s.replace(/\[([^\]\n]+)\]\(\s*([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g, (m, t, u, ti) => {
    const url = u.replace(/&amp;/g, "&");
    if (!MD_SAFE_URL.test(url)) return t;
    return hold('<a class="ev-md-a" href="' + MD_ESC(url) + '" target="_blank" rel="noopener noreferrer"' + (ti ? ' title="' + ti + '"' : "") + ">" + t + "</a>");
  });
  s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+[^\s<).,;:!?])/g, (m, p, u) => p + hold('<a class="ev-md-a" href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>"));
  s = s.replace(/\*\*\*([^\s*][\s\S]*?[^\s*]|[^\s*])\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*([^\s*][\s\S]*?[^\s*]|[^\s*])\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^\s_][\s\S]*?[^\s_]|[^\s_])__/g, "<strong>$1</strong>");
  s = s.replace(/~~([^\s~][\s\S]*?[^\s~]|[^\s~])~~/g, "<del>$1</del>");
  s = s.replace(/(^|[^\w*])\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*(?!\w)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^\w_])_([^\s_][^_\n]*?[^\s_]|[^\s_])_(?!\w)/g, "$1<em>$2</em>");
  s = s.replace(/(?: {2,}|\\)\n/g, "<br>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
}
function mdSplitRow(line) {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|") && !t.endsWith("\\|")) t = t.slice(0, -1);
  const out = [];
  let cur = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "\\" && t[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (c === "|") {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}
const MD_TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
function mdBlocks(lines) {
  const out = [];
  let i = 0;
  const isBlank = (l) => !l.trim();
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    let m = line.match(/^\s*(`{3,}|~{3,})\s*([\w+#.\-]*)[^\n]*$/);
    if (m) {
      const fence = m[1], lang = m[2];
      const body = [];
      i++;
      while (i < lines.length && !new RegExp("^\\s*" + fence[0] + "{" + fence.length + ",}\\s*$").test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push('<div class="ev-md-pre">' + (lang ? '<span class="ev-md-lang">' + MD_ESC(lang) + "</span>" : "") + "<pre><code>" + MD_ESC(body.join("\n")) + "</code></pre></div>");
      continue;
    }
    m = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) {
      const n = m[1].length;
      out.push("<h" + (n + 2 > 6 ? 6 : n + 2) + ' class="ev-md-h ev-md-h' + n + '">' + mdInline(m[2]) + "</h" + (n + 2 > 6 ? 6 : n + 2) + ">");
      i++;
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push('<hr class="ev-md-hr">');
      i++;
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && MD_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const head = mdSplitRow(line), seps = mdSplitRow(lines[i + 1]);
      const al = seps.map((c) => /^:-*:$/.test(c) ? "center" : /-:$/.test(c) ? "right" : /^:-/.test(c) ? "left" : "");
      i += 2;
      const rows = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|")) {
        rows.push(mdSplitRow(lines[i]));
        i++;
      }
      const cell = (t, k, tag) => "<" + tag + (al[k] ? ' style="text-align:' + al[k] + '"' : "") + ">" + mdInline(t) + "</" + tag + ">";
      out.push('<div class="ev-md-tablewrap"><table class="ev-md-table"><thead><tr>' + head.map((c, k) => cell(c, k, "th")).join("") + "</tr></thead><tbody>" + rows.map((r) => "<tr>" + head.map((_, k) => cell(r[k] ?? "", k, "td")).join("") + "</tr>").join("") + "</tbody></table></div>");
      continue;
    }
    if (/^\s{0,3}>/.test(line)) {
      const q = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        q.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i++;
      }
      out.push('<blockquote class="ev-md-quote">' + mdBlocks(q) + "</blockquote>");
      continue;
    }
    const LI = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
    if (LI.test(line)) {
      const res = mdList(lines, i);
      out.push(res.html);
      i = res.next;
      continue;
    }
    const para = [line];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !/^\s*(`{3,}|~{3,})/.test(lines[i]) && !/^\s{0,3}#{1,6}\s/.test(lines[i]) && !/^\s{0,3}>/.test(lines[i]) && !LI.test(lines[i]) && !/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && MD_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes("-"))) {
      para.push(lines[i]);
      i++;
    }
    out.push('<p class="ev-md-p">' + mdInline(para.join("\n").replace(/\n/g, "\n")) + "</p>");
  }
  return out.join("");
}
function mdList(lines, start) {
  const LI = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
  const first = lines[start].match(LI);
  const baseIndent = first[1].replace(/\t/g, "    ").length;
  const ordered = /\d/.test(first[2]);
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const items = [];
  let i = start;
  while (i < lines.length) {
    const mm = lines[i].match(LI);
    if (!mm) break;
    const ind = mm[1].replace(/\t/g, "    ").length;
    if (ind < baseIndent) break;
    if (ind > baseIndent && items.length === 0) break;
    if (ind > baseIndent) break;
    if (/\d/.test(mm[2]) !== ordered) break;
    let text = mm[3];
    i++;
    const sub = [];
    while (i < lines.length) {
      const nx = lines[i];
      if (!nx.trim()) {
        if (i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].match(/^(\s*)/)[1].replace(/\t/g, "    ").length > baseIndent) {
          sub.push("");
          i++;
          continue;
        }
        break;
      }
      const ni = nx.match(/^(\s*)/)[1].replace(/\t/g, "    ").length;
      if (ni > baseIndent) {
        sub.push(nx.slice(Math.min(ni, baseIndent + (ni - baseIndent >= 2 ? 2 : ni - baseIndent))));
        i++;
        continue;
      }
      break;
    }
    let box = "";
    const cb = text.match(/^\[( |x|X)\]\s+(.*)$/);
    if (cb) {
      box = '<input type="checkbox" class="ev-md-check" disabled' + (cb[1] !== " " ? " checked" : "") + ' aria-hidden="true">';
      text = cb[2];
    }
    const subHtml = sub.length ? mdBlocks(sub.map((l) => l.replace(/^ {0,4}/, ""))) : "";
    items.push('<li class="ev-md-li' + (cb ? " ev-md-task" : "") + '">' + box + mdInline(text) + subHtml + "</li>");
  }
  const tag = ordered ? "ol" : "ul";
  return { html: "<" + tag + ' class="ev-md-list"' + (ordered && startNum !== 1 ? ' start="' + startNum + '"' : "") + ">" + items.join("") + "</" + tag + ">", next: i };
}
const MD_CACHE = /* @__PURE__ */ new Map();
function mdToHtml(text) {
  const k = String(text ?? "");
  const hit = MD_CACHE.get(k);
  if (hit !== void 0) return hit;
  const html = mdBlocks(k.replace(/\r\n?/g, "\n").split("\n"));
  if (MD_CACHE.size > 200) MD_CACHE.delete(MD_CACHE.keys().next().value);
  MD_CACHE.set(k, html);
  return html;
}
export {
  mdToHtml
};

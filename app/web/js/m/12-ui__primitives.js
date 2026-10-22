"use strict";
/* ===== MODULE: ui/primitives ===== */
const empty = (ic, t, h) => `<div class="ev-empty"><div class="orb">${icon(ic)}</div><h3>${t}</h3><p>${h}</p></div>`;
const skeleton = () => `<div class="ev-main" style="padding-top:var(--s4)"><div class="ev-skeleton"></div><div class="ev-skeleton"></div><div class="ev-skeleton"></div></div>`;
const header = (sub, title) => `<header class="ev-header"><span class="ev-sub">${sub}</span><div class="ev-row" style="gap:10px"><button class="ev-ai-pill" data-act="ai" aria-label="ผู้ช่วย AI">${icon('chat')}ถาม AI</button>${avatarHTML({ tag: 'button' })}</div></header><h1 class="ev-title">${title}</h1>`;
const pills = (act, opts, cur) => `<div class="ev-filters" role="group">${opts.map(([k, l]) => `<button aria-pressed="${cur === k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
function itemRow(it, ds, i, opts = {}) {
    const v = val(it, ds), tg = target(it), done = tracked(it) && isDone(it, ds), multi = it.track === 'count' || it.track === 'timer', fut = isFuture(ds), sk = skipped(it, ds);
    const lead = it.track === 'check' ? `<button class="ev-check" role="checkbox" aria-checked="${done}" aria-label="ทำแล้ว: ${esc(it.title)}" data-act="check" data-id="${it.id}" data-date="${ds}"${UI.pop == it.id && done ? ' data-pop="true"' : ''}${fut ? ' disabled=""' : ''}>${icon('check')}</button>` : `<span class="ev-badge">${icon(it.track === 'timer' ? 'clock' : it.track === 'count' ? 'chart' : it.type === 'event' ? 'bell' : 'cal')}</span>`;
    const tail = it.track === 'count' ? `<div class="ev-step"><button data-act="dec" data-id="${it.id}" data-date="${ds}" aria-label="ลด"${v <= 0 || fut ? ' disabled=""' : ''}>−</button><button data-act="inc" data-id="${it.id}" data-date="${ds}" aria-label="เพิ่ม"${fut ? ' disabled=""' : ''}>+</button></div>`
        : it.track === 'timer' ? `<button class="ev-mini" data-tone="solid" data-act="timeropen" data-id="${it.id}" data-date="${ds}" aria-label="จับเวลา">${icon('play')}</button>` : '';
    const sub = [opts.late ? `เลยกำหนด ${fmtDate(it.start)}` : '', timeText(it) || 'ไม่ระบุเวลา', multi ? `${v}/${tg} ${esc(it.unitName)}` : esc(it.subject), sk ? 'ข้ามวันนี้' : ''].filter(Boolean).join(' · ');
    return `<li class="ev-list-item" data-state="${done ? 'done' : 'todo'}"${opts.next ? ` data-next="true"` : ''} style="--i:${i}">${lead}<div class="grow" role="button" tabindex="0" data-act="open" data-id="${it.id}" data-date="${ds}"><b>${esc(it.title)}</b><span class="ev-sub">${sub}</span>${multi ? `<div class="ev-bar"><i data-full="${v >= tg}" data-k="b-${it.id}-${ds}" data-to="${Math.min(100, Math.round(v / tg * 100))}"></i></div>` : ''}</div>${tail}</li>`;
}
/* moved by move_defs (evarel-ts-1f) */
function agendaHTML(ds) { const list = onDate(ds); return `<section class="ev-card"><div class="ev-sec-head"><h3 class="ev-group">${dayLab(ds)}<span>${fmtDate(ds)}</span></h3></div>${list.length ? `<ul>${list.map((it, i) => itemRow(it, ds, i)).join('')}</ul>` : empty('inbox', 'ไม่มีรายการในวันนี้', 'กดปุ่ม + เพื่อเพิ่มรายการ')}</section>`; }
/* ===== ui/patch (ตรงเดโมทุกกฎ): อัปเดต DOM เฉพาะส่วนที่เปลี่ยน — ของที่ไม่เปลี่ยนไม่ขยับ ของที่เปลี่ยนมี CSS transition ของที่เพิ่มใหม่เล่น .ev-in ครั้งเดียว =====
   ใช้ morphdom 2.7.4 (vendor/morphdom-umd.min.js เวอร์ชันเดียวกับเดโม) ไม่มี = innerHTML */
function patch(el, html, opt = {}) {
    if (!el)
        return;
    const md = window.morphdom;
    if (typeof md === 'undefined') {
        el.innerHTML = html;
        return;
    }
    const tmp = el.cloneNode(false);
    tmp.innerHTML = html;
    md(el, tmp, { childrenOnly: true, getNodeKey: (n) => n.id || n.dataset?.key || undefined,
        onBeforeElUpdated: (from, to) => {
            if (from.hasAttribute('data-keep'))
                return false;
            if (opt.skipReact && from.hasAttribute('data-react-mount'))
                return false; /* <main> ที่ React ถือ: ห้าม morphdom แตะ — ให้ React rerender เอง */
            if (to.hasAttribute('data-to'))
                to.setAttribute('style', from.getAttribute('style') || '');
            if (to.hasAttribute('data-count') && from.hasAttribute('data-count'))
                to.textContent = from.textContent;
            if ((from.tagName === 'TEXTAREA' || from.tagName === 'INPUT') && from.type !== 'checkbox' && (from === document.activeElement || from.id === 'aiText'))
                to.value = from.value;
            return true;
        },
        onNodeAdded: (n) => { if (n.nodeType !== 1 || n.parentElement?.closest('.ev-in'))
            return n; if (n.matches('svg,svg *,small,span,i,b,label,input,button,.ev-chip,.ev-sub,.ev-sheet-foot') || n.closest('button,.ev-set-row,#nav,nav,.ev-sheet-foot'))
            return n; n.classList.add('ev-in'); n.addEventListener('animationend', () => n.classList.remove('ev-in'), { once: true }); return n; } });
}
/* ===== MODULE: markdown (ตัวแสดงผลข้อความ AI แบบ Markdown เต็ม) =====
   หลักการ: ปลอดภัยโดยโครงสร้าง — ทุกข้อความ escape ก่อนครอบแท็ก ไม่มีทางส่ง HTML ดิบจากผู้ใช้/AI ผ่านได้ ลิงก์รับเฉพาะ http(s)/mailto/tel
   รองรับ: หัวข้อ # ถึง ######, **หนา**, *เอียง* หรือ _เอียง_, ***หนาเอียง***, ~~ขีดฆ่า~~, `โค้ดในบรรทัด`, ```บล็อกโค้ด+ภาษา```, > อ้างอิง (ซ้อนได้),
   ลิสต์ - * + และ 1. ซ้อนหลายชั้น, checklist - [ ] / - [x], ตาราง | a | b | พร้อมจัดชิด :--- :---: ---:, [ข้อความ](url), URL ลอย, เส้นคั่น --- *** ___, \ escape
   โครงสร้าง: แยกเป็นบล็อกก่อน (block) แล้วค่อยแปลงภายในบรรทัด (inline) · ส่งออกคลาส ev-md-* ให้ CSS จัดสไตล์ */
const MD_ESC = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MD_SAFE_URL = /^(https?:\/\/|mailto:|tel:)/i;
function mdInline(src) {
    /* 1) เก็บ inline code ไว้ก่อน (เนื้อในห้ามแปลงต่อ) แล้วแทนด้วยตัวยึด */
    const slots = [];
    const hold = (h) => { slots.push(h); return '\u0000' + (slots.length - 1) + '\u0000'; };
    let s = String(src ?? '');
    s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|~>])/g, (_, c) => hold(MD_ESC(c)));
    s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, c) => hold('<code class="ev-md-code">' + MD_ESC(c.trim()) + '</code>'));
    s = MD_ESC(s);
    /* 2) ลิงก์ [text](url "title") — เฉพาะ scheme ปลอดภัย */
    s = s.replace(/\[([^\]\n]+)\]\(\s*([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g, (m, t, u, ti) => { const url = u.replace(/&amp;/g, '&'); if (!MD_SAFE_URL.test(url))
        return t; return hold('<a class="ev-md-a" href="' + MD_ESC(url) + '" target="_blank" rel="noopener noreferrer"' + (ti ? ' title="' + ti + '"' : '') + '>' + t + '</a>'); });
    /* 3) URL ลอย */
    s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+[^\s<).,;:!?])/g, (m, p, u) => p + hold('<a class="ev-md-a" href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'));
    /* 4) ตัวอักษรตกแต่ง — ลำดับ: หนาเอียง > หนา > ขีดฆ่า > เอียง */
    s = s.replace(/\*\*\*([^\s*][\s\S]*?[^\s*]|[^\s*])\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^\s*][\s\S]*?[^\s*]|[^\s*])\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^\s_][\s\S]*?[^\s_]|[^\s_])__/g, '<strong>$1</strong>');
    s = s.replace(/~~([^\s~][\s\S]*?[^\s~]|[^\s~])~~/g, '<del>$1</del>');
    s = s.replace(/(^|[^\w*])\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^\w_])_([^\s_][^_\n]*?[^\s_]|[^\s_])_(?!\w)/g, '$1<em>$2</em>');
    /* 5) ขึ้นบรรทัดใหม่ (ท้ายบรรทัดมีช่องว่าง 2 ตัว หรือ \) */
    s = s.replace(/(?: {2,}|\\)\n/g, '<br>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
}
function mdSplitRow(line) { let t = line.trim(); if (t.startsWith('|'))
    t = t.slice(1); if (t.endsWith('|') && !t.endsWith('\\|'))
    t = t.slice(0, -1); const out = []; let cur = ''; for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '\\' && t[i + 1] === '|') {
        cur += '|';
        i++;
    }
    else if (c === '|') {
        out.push(cur.trim());
        cur = '';
    }
    else
        cur += c;
} out.push(cur.trim()); return out; }
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
        /* บล็อกโค้ด */
        let m = line.match(/^\s*(`{3,}|~{3,})\s*([\w+#.\-]*)[^\n]*$/);
        if (m) {
            const fence = m[1], lang = m[2];
            const body = [];
            i++;
            while (i < lines.length && !new RegExp('^\\s*' + fence[0] + '{' + fence.length + ',}\\s*$').test(lines[i])) {
                body.push(lines[i]);
                i++;
            }
            i++;
            out.push('<div class="ev-md-pre">' + (lang ? '<span class="ev-md-lang">' + MD_ESC(lang) + '</span>' : '') + '<pre><code>' + MD_ESC(body.join('\n')) + '</code></pre></div>');
            continue;
        }
        /* หัวข้อ */
        m = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (m) {
            const n = m[1].length;
            out.push('<h' + (n + 2 > 6 ? 6 : n + 2) + ' class="ev-md-h ev-md-h' + n + '">' + mdInline(m[2]) + '</h' + (n + 2 > 6 ? 6 : n + 2) + '>');
            i++;
            continue;
        }
        /* เส้นคั่น */
        if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
            out.push('<hr class="ev-md-hr">');
            i++;
            continue;
        }
        /* ตาราง */
        if (line.includes('|') && i + 1 < lines.length && MD_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
            const head = mdSplitRow(line), seps = mdSplitRow(lines[i + 1]);
            const al = seps.map(c => /^:-*:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : /^:-/.test(c) ? 'left' : '');
            i += 2;
            const rows = [];
            while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|')) {
                rows.push(mdSplitRow(lines[i]));
                i++;
            }
            const cell = (t, k, tag) => '<' + tag + (al[k] ? ' style="text-align:' + al[k] + '"' : '') + '>' + mdInline(t) + '</' + tag + '>';
            out.push('<div class="ev-md-tablewrap"><table class="ev-md-table"><thead><tr>' + head.map((c, k) => cell(c, k, 'th')).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + head.map((_, k) => cell(r[k] ?? '', k, 'td')).join('') + '</tr>').join('') + '</tbody></table></div>');
            continue;
        }
        /* อ้างอิง (ซ้อนได้ — ถอด > แล้วแปลงเนื้อในซ้ำ) */
        if (/^\s{0,3}>/.test(line)) {
            const q = [];
            while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
                q.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
                i++;
            }
            out.push('<blockquote class="ev-md-quote">' + mdBlocks(q) + '</blockquote>');
            continue;
        }
        /* ลิสต์ (ซ้อนตามการย่อหน้า) */
        const LI = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
        if (LI.test(line)) {
            const res = mdList(lines, i);
            out.push(res.html);
            i = res.next;
            continue;
        }
        /* ย่อหน้า: รวมบรรทัดต่อเนื่องจนเจอบล็อกอื่น */
        const para = [line];
        i++;
        while (i < lines.length && !isBlank(lines[i]) && !/^\s*(`{3,}|~{3,})/.test(lines[i]) && !/^\s{0,3}#{1,6}\s/.test(lines[i]) && !/^\s{0,3}>/.test(lines[i]) && !LI.test(lines[i]) && !/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && MD_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-'))) {
            para.push(lines[i]);
            i++;
        }
        out.push('<p class="ev-md-p">' + mdInline(para.join('\n').replace(/\n/g, '\n')) + '</p>');
    }
    return out.join('');
}
function mdList(lines, start) {
    const LI = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
    const first = lines[start].match(LI);
    const baseIndent = first[1].replace(/\t/g, '    ').length;
    const ordered = /\d/.test(first[2]);
    const startNum = ordered ? parseInt(first[2], 10) : 1;
    const items = [];
    let i = start;
    while (i < lines.length) {
        const mm = lines[i].match(LI);
        if (!mm)
            break;
        const ind = mm[1].replace(/\t/g, '    ').length;
        if (ind < baseIndent)
            break;
        if (ind > baseIndent && items.length === 0)
            break;
        if (ind > baseIndent)
            break;
        if (/\d/.test(mm[2]) !== ordered)
            break;
        let text = mm[3];
        i++;
        const sub = [];
        while (i < lines.length) {
            const nx = lines[i];
            if (!nx.trim()) { /* บรรทัดว่างคั่น: ต่อได้ถ้าบรรทัดถัดไปยังย่อหน้าลึกกว่า */
                if (i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].match(/^(\s*)/)[1].replace(/\t/g, '    ').length > baseIndent) {
                    sub.push('');
                    i++;
                    continue;
                }
                break;
            }
            const ni = nx.match(/^(\s*)/)[1].replace(/\t/g, '    ').length;
            if (ni > baseIndent) {
                sub.push(nx.slice(Math.min(ni, baseIndent + (ni - baseIndent >= 2 ? 2 : ni - baseIndent))));
                i++;
                continue;
            }
            break;
        }
        let box = '';
        const cb = text.match(/^\[( |x|X)\]\s+(.*)$/);
        if (cb) {
            box = '<input type="checkbox" class="ev-md-check" disabled' + (cb[1] !== ' ' ? ' checked' : '') + ' aria-hidden="true">';
            text = cb[2];
        }
        const subHtml = sub.length ? mdBlocks(sub.map(l => l.replace(/^ {0,4}/, ''))) : '';
        items.push('<li class="ev-md-li' + (cb ? ' ev-md-task' : '') + '">' + box + mdInline(text) + subHtml + '</li>');
    }
    const tag = ordered ? 'ol' : 'ul';
    return { html: '<' + tag + ' class="ev-md-list"' + (ordered && startNum !== 1 ? ' start="' + startNum + '"' : '') + '>' + items.join('') + '</' + tag + '>', next: i };
}
/* จุดเข้าเดียว: ข้อความดิบ -> HTML ปลอดภัย · แคชผลล่าสุดกัน render ซ้ำเมื่อ React/patch เรียกถี่ */
const MD_CACHE = new Map();
function mdToHtml(text) {
    const k = String(text ?? '');
    const hit = MD_CACHE.get(k);
    if (hit !== undefined)
        return hit;
    const html = mdBlocks(k.replace(/\r\n?/g, '\n').split('\n'));
    if (MD_CACHE.size > 200)
        MD_CACHE.delete(MD_CACHE.keys().next().value);
    MD_CACHE.set(k, html);
    return html;
}
Object.assign(window, { mdToHtml });
Object.assign(window, { empty, skeleton, header, pills, itemRow, agendaHTML, patch });

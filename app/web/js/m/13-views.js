"use strict";
/* ===== MODULE: views ===== */
function statsClassic() {
    const hs = habits(), isM = UI.period === 'month', days = isM ? 28 : 7;
    if (!hs.length)
        return `${header('ความต่อเนื่องของคุณ', 'สถิติ')}<main class="ev-main">${empty('chart', 'ยังไม่มีกิจวัตร', 'สร้างกิจวัตรเพื่อดูสถิติและ streak')}</main>`;
    const per = hs.map(h => [h, periodStats(h, days)]), T = per.reduce((n, [, s]) => n + s.t, 0), K = per.reduce((n, [, s]) => n + s.ok, 0), rate = T ? Math.round(100 * K / T) : 0, best = Math.max(0, ...hs.map(streak));
    const td = hs.filter(h => occursOn(h, TODAY) && !skipped(h, TODAY)), tdDone = td.filter(h => isDone(h, TODAY)).length, cols = chartData();
    const lv = r => r >= 80 ? 'hi' : r >= 50 ? 'mid' : 'lo';
    const row = ([h, s]) => { const r = s.t ? Math.round(100 * s.ok / s.t) : 0, st = streak(h); return `<li class="ev-list-item"><div class="grow" role="button" tabindex="0" data-act="detail" data-id="${h.id}"><b>${esc(h.title)}</b><span class="ev-sub">${s.t ? `ทำ ${s.ok} จาก ${s.t} ครั้ง` : 'ไม่มีกำหนดในช่วงนี้'}${st ? ` · ต่อเนื่อง ${st} วัน` : ''}</span><div class="ev-bar"><i data-full="${r >= 100}" data-k="sb-${h.id}-${UI.period}" data-to="${r}"></i></div></div><span class="ev-pct" data-lv="${s.t ? lv(r) : ''}">${s.t ? r + '%' : '–'}</span>${icon('chev')}</li>`; };
    return `${header('ความต่อเนื่องของคุณ', 'สถิติ')}<div class="ev-main" style="padding-bottom:12px">${seg('period', [['week', '7 วันล่าสุด'], ['month', '4 สัปดาห์ล่าสุด']], UI.period)}</div>
  <main class="ev-main"><section class="ev-card ev-sum ev-sum-row" data-tone="ink"><div class="ev-ringbox"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ev-arc-bg" cx="50" cy="50" r="42"/><circle class="ev-arc" data-kind="arc" data-k="ring-${UI.period}" data-to="${rate}" cx="50" cy="50" r="42" stroke-dasharray="${ARC_C}" stroke-dashoffset="${ARC_C}"/></svg><div class="ev-ringnum"><span><span data-count="${rate}">0</span><small>%</small></span></div></div>
   <div><div style="font-size:18px;font-weight:600;line-height:1.35">ทำแล้ว ${K} จาก ${T} ครั้ง</div><div class="ev-sum-lab" style="margin-top:4px">ที่ตั้งไว้ใน${isM ? ' 4 สัปดาห์' : ' 7 วัน'}ที่ผ่านมา</div></div></section>
  <div class="ev-row2"><section class="ev-card"><div class="ev-sub">ต่อเนื่องสูงสุด</div><div class="ev-big"><span data-count="${best}">0</span><small> วัน</small></div></section><section class="ev-card"><div class="ev-sub">วันนี้ทำแล้ว</div><div class="ev-big"><span data-count="${tdDone}">0</span><small> / ${td.length}</small></div></section></div>
  <section class="ev-card"><h3 class="ev-group" style="padding-top:0">${isM ? 'รายสัปดาห์' : 'รายวัน'}</h3><p class="ev-sub">ความสูง = % ที่ทำสำเร็จ${isM ? 'ในสัปดาห์นั้น (เริ่มวันที่ใต้แท่ง)' : 'ในวันนั้น'}</p><div class="ev-chart">${cols.map((c, i) => `<div class="ev-col" data-today="${c.today}" data-empty="${!c.t}"><span class="ev-col-v">${c.t ? c.pct + '%' : '–'}</span><div class="ev-col-track"><i data-kind="col" data-k="col-${UI.period}-${i}" data-to="${c.pct}"></i></div><span class="ev-col-l">${c.label}</span></div>`).join('')}</div></section>
  <section class="ev-card"><h3 class="ev-group" style="padding-top:0">รายกิจวัตร · แตะเพื่อดูปฏิทิน</h3><ul>${per.map(row).join('')}</ul></section></main>`;
}
function allClassic() {
    const types = UI.type === 'all' ? Object.keys(TYPES) : [UI.type];
    const row = it => `<li class="ev-list-item"><span class="ev-badge">${icon(typeIcon(it))}</span><div class="grow" role="button" tabindex="0" data-act="detail" data-id="${it.id}"><b>${esc(it.title)}</b><span class="ev-sub">${repeatText(it)}${it.time ? ` · ${timeText(it)}` : ''}</span></div>${icon('chev')}</li>`;
    const sec = k => { const g = S.items.filter(it => it.type === k); return g.length ? `<section class="ev-card"><div class="ev-sec-head"><h3 class="ev-group">${TYPES[k]}<span>${g.length}</span></h3><button class="ev-link-btn" data-act="add-type" data-id="${k}" aria-label="เพิ่ม${TYPES[k]}">${icon('plus')}</button></div><ul>${g.map(row).join('')}</ul></section>` : ''; };
    const body = types.map(sec).join('');
    return `${header(`${S.items.length} รายการที่ตั้งไว้`, 'รายการ')}${pills('type', [['all', 'ทั้งหมด'], ...Object.entries(TYPES)], UI.type)}<main class="ev-main">${body || `<section class="ev-card">${empty('inbox', 'ยังไม่มีรายการ', 'กดปุ่ม + เพื่อสร้างรายการแรก')}</section>`}</main>`;
}
const VIEWS = {
    today() {
        if (!S.items.length)
            return `${header(fmtDate(TODAY), 'ยินดีต้อนรับ')}<main class="ev-main"><section class="ev-card">${empty('inbox', 'ยังไม่มีอะไรเลย', 'เริ่มจากสร้างกิจวัตรแรกของคุณ')}<div class="ev-form"><button class="ev-btn-primary ev-btn-block" data-act="add">สร้างรายการแรก</button></div></section></main>`;
        const ds = UI.date, list = onDate(ds), tr = list.filter(tracked), done = tr.filter(it => isDone(it, ds)).length, p = tr.length ? Math.round(100 * done / tr.length) : 0, od = ds === TODAY ? overdue() : [];
        const start = addDays(new Date(), -new Date().getDay() + 7 * UI.weekOff), week = Array.from({ length: 7 }, (_, i) => ymd(addDays(start, i)));
        const nextId = ds === TODAY ? (list.find(it => it.time && it.time >= nowHM() && !(tracked(it) && isDone(it, ds))))?.id : null;
        const nextIt = list.find(it => it.id === nextId);
        let idx = 0;
        const groups = PERIODS.map((n, g) => [n, list.filter(it => periodOf(it) === g)]).filter(([, l]) => l.length);
        const hello = ds === TODAY ? (() => { const h = new Date().getHours(); return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'; })() : fmtDate(ds);
        /* S4 route วันนี้: React ผลิตเนื้อ <main> จากของดิบล้วน (core/today.buildTodayProps) ส่วน header กับ weekbar/week เป็น HTML เดิมต่อ string เอง */
        const R = window.EvarelPages?.today;
        const head = `${header(fmtDate(ds), ds === TODAY ? hello : 'ย้อนดู/วางแผน')}
  <div class="ev-weekbar"><b>${TH_MONTH[parse(week[3]).getMonth()]} ${parse(week[3]).getFullYear() + 543}</b><div class="ev-row" style="gap:4px">${UI.date !== TODAY || UI.weekOff ? '<button class="ev-chip-btn" data-act="today">วันนี้</button>' : ''}<button class="ev-icon-btn" data-flat data-act="wk" data-id="-1" aria-label="สัปดาห์ก่อน">${icon('back')}</button><button class="ev-icon-btn ev-flip" data-flat data-act="wk" data-id="1" aria-label="สัปดาห์ถัดไป">${icon('back')}</button></div></div>
  <div class="ev-week" role="group" aria-label="เลือกวัน" data-dir="${UI.weekDir}">${week.map(d => `<button aria-pressed="${UI.date === d}" data-today="${d === TODAY}" data-act="date" data-id="${d}">${WD[parse(d).getDay()]}<b>${parse(d).getDate()}</b></button>`).join('')}</div>
  `;
        const main = () => `<main class="ev-main" id="main"><section class="ev-card ev-sum" data-tone="ink"><div class="ev-sum-top"><div><div class="ev-sum-num"><span data-count="${done}">0</span><small>/${tr.length}</small></div><div class="ev-sum-lab">${tr.length ? (done === tr.length ? 'ครบทุกอย่างแล้ว' : 'ทำแล้ววันนี้') : 'วันนี้ไม่มีสิ่งต้องติ๊ก'}</div></div><div class="ev-sum-lab">${p}%</div></div><div class="ev-prog"><i data-k="p-today" data-to="${p}"></i></div>${nextIt ? `<div class="ev-next"><span class="ev-chip">ถัดไป</span>${nextIt.time} · ${esc(nextIt.title)}</div>` : ''}</section>
  ${od.length ? `<section class="ev-card" data-tone="warn"><b>ค้างอยู่ ${od.length} งาน</b><ul>${od.map((it, i) => itemRow(it, it.start, i, { late: true })).join('')}</ul></section>` : ''}
  <section class="ev-card">${list.length ? groups.map(([n, l]) => `<h3 class="ev-group">${n}</h3><ul>${l.map(it => itemRow(it, ds, idx++, { next: it.id === nextId })).join('')}</ul>`).join('') : empty('inbox', 'วันนี้ยังว่างอยู่', 'กดปุ่ม + เพื่อเพิ่มสิ่งที่อยากทำ')}</section></main>`;
        if (typeof R === 'function') {
            try {
                const m = R({ items: S.items, ui: { date: UI.date, weekOff: UI.weekOff, weekDir: UI.weekDir }, today: TODAY, now: new Date() });
                if (typeof m === 'string')
                    return head + m;
            }
            catch (err) {
                console.warn('today react', err);
            }
        }
        return head + main();
    },
    all() {
        const R = window.EvarelPages?.all;
        if (typeof R !== 'function' || !S.items.length)
            return allClassic();
        try { /* คำนวณทั้งหมดอยู่ใน React (core/stats.buildAllProps) ฝั่งนี้ส่งข้อมูลดิบกับตัวสร้างไอคอน (ตาราง ICONS ยังอยู่ฝั่งนี้) */
            const types = UI.type === 'all' ? Object.keys(TYPES) : [UI.type];
            if (!types.some(k => S.items.some(it => it.type === k)))
                return allClassic();
            const main = R({ items: S.items, type: UI.type, iconOf: icon }).replace(/<\/li>/g, icon('chev') + '</li>');
            return `${header(`${S.items.length} รายการที่ตั้งไว้`, 'รายการ')}${pills('type', [['all', 'ทั้งหมด'], ...Object.entries(TYPES)], UI.type)}` + main;
        }
        catch (e) {
            console.warn('all react', e);
            return allClassic();
        }
    },
    calendar() {
        const isM = UI.calView === 'dayGridMonth';
        return `${header('ทุกอย่างในที่เดียว', 'ปฏิทิน')}<div class="ev-main" style="padding-bottom:12px"><div class="ev-cal-top"><div class="ev-row" style="gap:2px"><button class="ev-icon-btn" data-flat data-act="cal-nav" data-id="prev" aria-label="ก่อนหน้า">${icon('back')}</button><b id="calTitle" class="ev-cal-title">&nbsp;</b><button class="ev-icon-btn ev-flip" data-flat data-act="cal-nav" data-id="next" aria-label="ถัดไป">${icon('back')}</button></div><button class="ev-chip-btn" data-act="cal-nav" data-id="today">วันนี้</button></div>${seg('cal-view', [['dayGridMonth', 'เดือน'], ['timeGridWeek', 'สัปดาห์']], UI.calView)}</div>
  <main class="ev-main"><section class="ev-card ev-fc-wrap"><div id="fcMain"></div></section><div id="agenda">${isM ? agendaHTML(UI.calSel) : ''}</div></main>`;
    },
    stats() {
        const R = window.EvarelPages?.stats;
        if (typeof R !== 'function')
            return statsClassic();
        const hs = habits();
        if (!hs.length)
            return statsClassic();
        try { /* คำนวณทั้งหมดอยู่ใน React (core/stats.buildStatsProps) ฝั่งนี้ส่งแค่ข้อมูลดิบ */
            const main = R({ items: S.items, period: UI.period, today: TODAY }).replace(/<\/li>/g, icon('chev') + '</li>');
            return header('ความต่อเนื่องของคุณ', 'สถิติ') + `<div class="ev-main" style="padding-bottom:12px">${seg('period', [['week', '7 วันล่าสุด'], ['month', '4 สัปดาห์ล่าสุด']], UI.period)}</div>\n  ` + main;
        }
        catch (e) {
            console.warn('stats react', e);
            return statsClassic();
        }
    }
};
Object.assign(window, { VIEWS, statsClassic, allClassic });

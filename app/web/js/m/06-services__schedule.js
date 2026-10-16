"use strict";
/* ===== MODULE: services/schedule ===== */
function occursOn(it, ds) {
    const d0 = parse(it.start), d = parse(ds), r = it.repeat;
    if (d < d0 || (it.end && d > parse(it.end)))
        return false;
    if (r.unit === 'none')
        return ds === it.start;
    if (r.unit === 'day')
        return Math.round((d - d0) / DAY_MS) % r.every === 0;
    if (r.unit === 'week')
        return r.days.includes(d.getDay()) && Math.floor(Math.round((d - addDays(d0, -d0.getDay())) / DAY_MS) / 7) % r.every === 0;
    return d.getDate() === d0.getDate() && ((d.getFullYear() - d0.getFullYear()) * 12 + d.getMonth() - d0.getMonth()) % r.every === 0;
}
const val = (it, ds) => it.log[ds] || 0, target = it => it.track === 'count' || it.track === 'timer' ? it.target : 1, tracked = it => it.track !== 'none';
const isDone = (it, ds) => val(it, ds) >= target(it), skipped = (it, ds) => !!it.skip[ds], isFuture = ds => ds > TODAY;
const onDate = ds => S.items.filter(it => occursOn(it, ds)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
const overdue = () => S.items.filter(it => it.type === 'task' && it.start < TODAY && !isDone(it, it.start)).sort((a, b) => a.start.localeCompare(b.start));
function streak(it) { let n = 0; for (let i = 0; i < STREAK_LOOKBACK; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (!occursOn(it, ds) || skipped(it, ds))
        continue;
    if (isDone(it, ds))
        n++;
    else if (i > 0)
        break;
} return n; }
function rate(it) { let t = 0, ok = 0; for (let i = 0; i < STAT_DAYS; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (ds < it.start || !occursOn(it, ds) || skipped(it, ds))
        continue;
    t++;
    if (isDone(it, ds))
        ok++;
} return t ? Math.round(100 * ok / t) : 0; }
const remText = r => r.k === 'at' ? `เวลา ${r.t} น.` : r.m === 0 ? 'ตรงเวลา' : r.m % 1440 === 0 ? `ก่อน ${r.m / 1440} วัน` : r.m % 60 === 0 ? `ก่อน ${r.m / 60} ชม.` : `ก่อน ${r.m} นาที`;
function repeatText(it) {
    const r = it.repeat, tail = it.end ? ` · ถึง ${fmtDate(it.end)}` : '';
    if (r.unit === 'none')
        return `ครั้งเดียว · ${fmtDate(it.start)}`;
    const one = r.every === 1, u = UNIT_TH[r.unit];
    return (r.unit === 'week' ? (one ? 'ทุกสัปดาห์' : `ทุก ${r.every} สัปดาห์`) + ` · ${[...r.days].sort().map(d => WD[d]).join(' ')}` : one ? `ทุก${u}` : `ทุก ${r.every} ${u}`) + tail;
}
const timeText = it => it.time ? it.time + (it.timeEnd ? `–${it.timeEnd}` : '') : '';
function periodOf(it) { if (!it.time)
    return 0; const h = +it.time.slice(0, 2); return h < 12 ? 1 : h < 17 ? 2 : 3; }
const PERIODS = ['ทั้งวัน', 'ช่วงเช้า', 'ช่วงบ่าย', 'ช่วงเย็น–ค่ำ'];
/* moved by move_defs (evarel-ts-1f) */
const scheduled = (it, ds) => ds >= it.start && occursOn(it, ds);
function dayState(it, ds) { if (!scheduled(it, ds))
    return 'off'; if (skipped(it, ds))
    return 'skip'; if (isDone(it, ds))
    return 'done'; if (val(it, ds) > 0)
    return 'part'; if (ds > TODAY)
    return 'future'; return ds === TODAY ? 'today' : 'miss'; }
function dayMenu(it, ds) {
    const sk = skipped(it, ds), v = val(it, ds), tg = target(it), multi = it.track !== 'check', done = isDone(it, ds), out = [];
    if (sk)
        return [{ act: 'dm-skip', id: `0|${ds}`, icon: 'x', label: 'เลิกข้าม' }];
    if (multi)
        out.push({ act: 'dm-set', id: `${tg}|${ds}`, icon: 'check', label: `ทำครบเป้า (${tg} ${esc(it.unitName)})`, hint: done ? 'ปัจจุบัน' : '' }, { act: 'dm-num', id: ds, icon: 'edit', label: 'ปรับจำนวน…', hint: `${v}/${tg}` }, { act: 'dm-set', id: `0|${ds}`, icon: 'x', label: 'ล้างเป็น 0' });
    else
        out.push({ act: 'dm-set', id: `1|${ds}`, icon: 'check', label: 'ทำแล้ว', hint: done ? 'ปัจจุบัน' : '' }, { act: 'dm-set', id: `0|${ds}`, icon: 'x', label: 'ยังไม่ทำ', hint: done ? '' : 'ปัจจุบัน' });
    if (!done)
        out.push('-', { act: 'dm-skip', id: `1|${ds}`, icon: 'skip', label: 'ข้ามวันนี้ (ไม่นับเป็นพลาด)' });
    return out;
}
Object.assign(window, { occursOn, val, target, tracked, isDone, skipped, isFuture, onDate, overdue, streak, rate, remText, repeatText, timeText, periodOf, PERIODS, scheduled, dayState, dayMenu });

import { TH_MON, WD } from './01-core__constants.js';
import { addDays, ymd } from './02-core__dates.js';
import { S, UI } from './05-data__auth.js';
import { isDone, occursOn, skipped } from './06-services__schedule.js';
/* ===== MODULE: services/stats (นับจากรายการที่ "ตั้งไว้" จริง ไม่รวมวันที่ข้าม) ===== */
export const habits = () => S.items.filter(it => it.type === 'habit');
export const typeIcon = it => it.track === 'timer' ? 'clock' : it.track === 'count' ? 'chart' : ({ habit: 'check', task: 'tasks', event: 'bell', class: 'cal' })[it.type];
export function periodStats(it, days) { let t = 0, ok = 0; for (let i = 0; i < days; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (ds < it.start || !occursOn(it, ds) || skipped(it, ds))
        continue;
    t++;
    if (isDone(it, ds))
        ok++;
} return { t, ok }; }
export const ARC_C = 2 * Math.PI * 42;
export function chartData() {
    const hs = habits(), isM = UI.period === 'month', n = isM ? 4 : 7, size = isM ? 7 : 1, out = [];
    for (let k = 0; k < n; k++) {
        let t = 0, ok = 0, start = null;
        for (let j = 0; j < size; j++) {
            const d = addDays(new Date(), -((n - 1 - k) * size + (size - 1 - j))), ds = ymd(d);
            if (j === 0)
                start = d;
            hs.forEach(h => { if (ds < h.start || !occursOn(h, ds) || skipped(h, ds))
                return; t++; if (isDone(h, ds))
                ok++; });
        }
        out.push({ t, ok, pct: t ? Math.round(100 * ok / t) : 0, label: isM ? `${start.getDate()} ${TH_MON[start.getMonth()]}` : WD[start.getDay()], today: !isM && k === n - 1 });
    }
    return out;
}
export const totalDone = it => Object.keys(it.log).filter(ds => occursOn(it, ds) && isDone(it, ds)).length;
Object.assign(window, { habits, typeIcon, periodStats, ARC_C, chartData, totalDone });

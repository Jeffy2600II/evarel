/**
 * หน้าสถิติของ Evarel (ชั้นที่ 1 ของกล่อง stats) ผลิตเฉพาะ <main> ให้ VIEWS.stats ส่งกลับเป็น string
 * ประกอบชิ้นส่วนใน parts/ ตามลำดับเดิมทุกจุด: ชิ้นส่วนถูกเรียกเป็นฟังก์ชัน (ไม่ใช่ component) เพื่อไม่ให้เกิดชั้น element เพิ่มที่ทำให้ HTML ต่างจากเดิม
 * ข้อมูลทั้งหมดมาจาก prepare (ถาด stats.tray.js) กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { StatsSummary } from './parts/StatsSummary.jsx';
import { StatsRecords } from './parts/StatsRecords.jsx';
import { StatsChart } from './parts/StatsChart.jsx';
import { StatsHabits } from './parts/StatsHabits.jsx';
import { prepareStats } from './stats.tray.js';

export default function StatsPage(p) {
  const { isM, period, rate, arcC, K, T, best, tdDone, tdTotal, cols, rows } = p;
  return h(Fragment, null, [
    h('main', { key: 'main', className: 'ev-main' }, [
      StatsSummary({ isM, period, rate, arcC, K, T }),
      StatsRecords({ best, tdDone, tdTotal }),
      StatsChart({ isM, period, cols }),
      StatsHabits({ period, rows }),
    ]),
  ]);
}

export const prepare = prepareStats;

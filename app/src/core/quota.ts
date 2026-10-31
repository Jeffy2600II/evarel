/* ชั้นฐาน (ES module จริง): ตรรกะโควตา AI บริสุทธิ์ (สถานะ/ข้อความสั้น/นาฬิการีเซ็ต/เวลาที่เหลือ) ไม่แตะ DOM, ST, เครือข่าย และไม่อ่านเวลาเอง
   ตัดวางจาก m/16-services__ai-quota ตรงตัวอักษร ต่างแค่ export และ resetInAt(iso, now) ที่รับเวลาจากผู้เรียก (เดิม resetIn เรียก Date.now() เอง)
   โมดูลเดิมห่อ resetIn(iso) = resetInAt(iso, Date.now()) เพื่อให้เวลาปัจจุบันยังอยู่ฝั่งแอป ตรรกะชุดเดียวไม่มีสองสำเนา */
import { pad } from './dates.js';

export const QUOTA_LOW = 0.2;
export const resetMs=(iso:any)=>{const v=+new Date(iso);return Number.isFinite(v)?v:NaN};
export function quotaState(q:any){if(!q||q.unknown||!q.calls||!q.tokens||!(q.calls.limit>0)||!(q.tokens.limit>0))return null;if(q.blocked||q.calls.remaining<=0||q.tokens.remaining<=0)return 'out';const r=Math.min(q.calls.remaining/q.calls.limit,q.tokens.remaining/q.tokens.limit);return r<=QUOTA_LOW?'low':'ok'}
export function quotaShort(q:any){const st=quotaState(q);if(st==='out')return 'โควตาหมด';
 const cr=q.calls.remaining/q.calls.limit,tr=q.tokens.remaining/q.tokens.limit;
 if(tr<=QUOTA_LOW&&tr<cr)return 'ใกล้ถึงขีดจำกัดวันนี้';
 return `เหลือ ${q.calls.remaining} จาก ${q.calls.limit} ครั้ง`}
export function resetClock(iso:any){const d=new Date(iso);if(isNaN(d.getTime()))return '';const b=new Date(+d+7*3600000);return `${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`}
export function resetInAt(iso:any,now:number){const ms=resetMs(iso)-now;if(!(ms>0))return 'ในอีกสักครู่';const m=Math.ceil(ms/60000),h=Math.floor(m/60);return h>=1?`อีก ${h} ชม. ${m%60} นาที`:`อีก ${m} นาที`}

/* ===== ส่วนที่เหลือของ m/16 (ตัดวางตรงตัวอักษร 31 ต.ค. 2026): การดึงโควตา ข้อมูลล็อก แถบเตือน สถานะจาก /chat และหน้าชีต =====
   ตรรกะชุดเดียว: โมดูลเดิมเรียกใช้ที่นี่ผ่านตัวห่อที่ส่ง deps/พารามิเตอร์เข้ามา (enabled api token | notice quota | icon + เวลา | qc + โควตาเดิม + เวลา)
   คงพฤติกรรมตรงตัวทุกจุด: fail-open QUOTA_UNKNOWN, ลำดับตรวจ, ข้อความและปุ่มเดิม | สิ่งที่ผูก DOM/ST/timer (quotaPaint quotaRefresh quotaSheet) อยู่ฝั่งตัวห่อ */
export const QUOTA_UNKNOWN=Object.freeze({unknown:true,blocked:false});
export type QuotaFetchDeps = { enabled: () => boolean; api: () => string; token: () => Promise<string> };
export function quotaFetchOf(deps: QuotaFetchDeps) {
  return async () => { if (!deps.enabled()) return null;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 6000);
    try { const t = await deps.token(), r = await fetch(`${deps.api()}/ai/quota`, { signal: ctl.signal, headers: { Authorization: 'Bearer ' + t } });
      if (!r.ok) return QUOTA_UNKNOWN; const j = await r.json();
      if (j && j.unknown) return QUOTA_UNKNOWN;
      if (!j || typeof j !== 'object' || !j.calls || !j.tokens || !(j.calls.limit > 0) || !(j.tokens.limit > 0)) return QUOTA_UNKNOWN;
      return j }
    catch (e) { return QUOTA_UNKNOWN } finally { clearTimeout(tm) } };
}
/* ข้อมูลล็อกปัจจุบัน: notice kind=limit มาก่อน มิฉะนั้นดูจากสถานะโควตา (out) — พารามิเตอร์ = ST.AI.notice กับ ST.QUOTA ของผู้เรียก */
export function aiLockInfoOf(notice:any, quota:any) { if (notice && notice.kind === 'limit') return notice; const v = quota; return quotaState(v) === 'out' ? { reason: (v && v.reason) || 'calls', resetAt: v && v.resetAt } : null }
/* limitBanner ตามเดโม v24: แถบเตือนเมื่อถึงขีดจำกัด (notice kind limit หรือโควตา out) | icon เป็นพารามิเตอร์ (primitive ของ m/12 ปักบน window ห้าม import ข้ามไฟล์ m) เวลาปัจจุบันรับจากผู้เรียก */
export function limitBannerOf(L:any, icon:any, now:number) { if (!L) return ''; const g = L.reason === 'global';
  const title = g ? 'ตอนนี้มีผู้ใช้จำนวนมาก' : L.reason === 'tokens' ? 'บทสนทนายาวถึงขีดจำกัดของวันนี้แล้ว' : 'ถึงขีดจำกัดการถามของวันนี้แล้ว';
  const sub = g ? 'ระบบเต็มชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่' : `ใช้ได้อีกครั้ง ${resetInAt(L.resetAt, now)} (${resetClock(L.resetAt)} น.)`;
  return `<div class="ev-limit" role="status" data-key="limit"><span class="ev-limit-ic">${icon('clock')}</span><div class="grow"><b>${title}</b><span>${sub}</span></div>${g ? '<button type="button" class="ev-btn-ghost ev-btn-sm" data-act="ai-retry-global">ลองใหม่</button>' : '<button type="button" class="ev-btn-ghost ev-btn-sm" data-act="ai-usage">รายละเอียด</button>'}</div>` }
/* ใช้ค่าที่ /chat คืน (สำหรับสำเร็จหรือ 429) คืนอ็อบเจ็กต์ QUOTA ใหม่ (ไม่แตะ ST/DOM) | คืน undefined เมื่อ qc ใช้ไม่ได้ (ผู้เรียกต้อง return ก่อนแตะสถานะอื่น เหมือนเดิม) */
export function quotaFromChatState(qc:any, hit429:any, prev:any, now:number) { if (!qc || !(qc.limit > 0)) return undefined; const tl = qc.tokens && qc.tokens.limit > 0 ? qc.tokens : { used: 0, limit: (prev && prev.tokens?.limit) || 60000 };
  const out = hit429 || qc.used >= qc.limit || tl.used >= tl.limit;
  return { day: '', resetAt: qc.resetAt || prev?.resetAt || new Date(now + 3600000).toISOString(), blocked: out, ...(out ? { reason: qc.reason || (qc.used >= qc.limit ? 'calls' : 'tokens') } : {}),
    calls: { used: qc.used, limit: qc.limit, remaining: Math.max(0, qc.limit - qc.used) }, tokens: { used: tl.used, limit: tl.limit, remaining: Math.max(0, tl.limit - tl.used) } } }
/* หน้าชีตโควตา: HTML บริสุทธิ์จากค่าโควตา + เวลาปัจจุบัน (แถบบาร์/จำนวน/เวลารีเซ็ต) */
export function quotaSheetHTMLOf(q:any, now:number) { if (!q || q.unknown) return ''; const bar = (u:any, l:any, lb:any) => `<div class="ev-qbar" role="progressbar" aria-label="${lb}" aria-valuemin="0" aria-valuemax="${l}" aria-valuenow="${Math.min(u, l || 0)}"><i style="--p:${l > 0 ? Math.min(1, u / l).toFixed(3) : '0'}"></i></div>`;
  return `<div class="ev-qrow"><div class="ev-row"><b>จำนวนครั้ง</b><span class="ev-sub">${q.calls.used} / ${q.calls.limit}</span></div>${bar(q.calls.used, q.calls.limit, 'จำนวนครั้งที่ใช้วันนี้')}</div>
 <div class="ev-qrow"><div class="ev-row"><b>ปริมาณการคิด</b><span class="ev-sub">${q.tokens.used.toLocaleString('en-US')} / ${q.tokens.limit.toLocaleString('en-US')}</span></div>${bar(q.tokens.used, q.tokens.limit, 'ปริมาณการคิดที่ใช้วันนี้')}</div>
 <p class="ev-sub" style="margin-top:12px">${q.blocked ? 'ตอนนี้ใช้ครบแล้ว ' : ''}รีเซ็ตเวลา ${resetClock(q.resetAt)} น. (${resetInAt(q.resetAt, now)})</p>` }

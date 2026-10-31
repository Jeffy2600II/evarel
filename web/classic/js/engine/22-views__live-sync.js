"use strict";
/* ===== MODULE: services/live-sync (ซิงก์ข้ามอุปกรณ์) | แยกจาก 22-views__auth เพราะเป็นระบบเรียลไทม์ ไม่ใช่หน้าล็อกอิน (F6) ===== */
/* ===== ซิงก์ข้ามอุปกรณ์ (เปิดเฉพาะโหมด Supabase) =====
   ต้นฉบับอยู่ที่ Supabase: ดึงใหม่เมื่อกลับมาเห็นหน้าจอ/กลับมาออนไลน์ และทุก LIVE_MS ขณะเปิดอยู่
   เทียบลายนิ้วมือข้อมูลก่อน ไม่เปลี่ยนก็ไม่วาดซ้ำ; ข้ามรอบถ้ากำลังบันทึก (PENDING) หรือกำลังพิมพ์ในฟอร์ม */
let liveBusy = false;
const sigOf = items => { const t = JSON.stringify([...items].sort((a, b) => a.id - b.id).map(i => [i.id, i.type, i.title, i.subject, i.time, i.timeEnd, i.track, i.target, i.unitName, i.repeat, i.start, i.end, i.log, i.skip, i.rem])); let h = 5381; for (let i = 0; i < t.length; i++)
    h = ((h << 5) + h + t.charCodeAt(i)) | 0; return h + ':' + items.length; };
const typingNow = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !!a.closest('#sheet,#dialog,#page'); };
async function liveRefresh() {
    if (!SUPA_API || liveBusy || SYNC.pending > 0 || UI.auth.status !== 'in' || UI.loading || document.hidden || typingNow())
        return;
    liveBusy = true;
    try {
        const w0 = SYNC.writes, r = await ST.Repo.load();
        if (SYNC.pending > 0 || SYNC.writes !== w0)
            return;
        if (sigOf(r.items) !== sigOf(S.items)) {
            S.items = r.items;
            ST._render();
        }
    }
    catch (err) {
        console.warn('live refresh', err);
    }
    finally {
        liveBusy = false;
    }
}
/* Realtime: ฟังการเปลี่ยนแปลงตาราง items ผ่าน WebSocket ของ Supabase (กุญแจสาธารณะ + JWT ของผู้ใช้ → RLS กรองให้เห็นเฉพาะของตัวเอง)
   เหตุการณ์ที่มาแค่ "กระตุ้น" liveRefresh (ดึงแล้วเทียบลายนิ้วมือ) → ตรรกะตัดสินความถูกต้องอยู่จุดเดียว ไม่มีข้อมูลซ้ำ/ตีกันกับการแก้ในเครื่อง */
const SUPA_PK = 'sb_publishable_91KcKgK7ujojcnIynSoXyQ_8f85NcBL';
let rtWs = null, rtOn = false, rtRef = 0, rtHb = null, rtRetry = 0, rtTimer = null, rtDeb = null, rtTokT = null;
const rtSend = (topic, event, payload) => { try {
    rtWs && rtWs.readyState === 1 && rtWs.send(JSON.stringify({ topic, event, payload, ref: String(++rtRef) }));
}
catch (e) {
    console.warn('rt send', e);
} };
const rtKick = () => { clearTimeout(rtDeb); rtDeb = setTimeout(liveRefresh, 250); };
async function rtConnect() {
    if (!rtOn || rtWs)
        return;
    let tok;
    try {
        tok = await ST.Repo.token();
    }
    catch (e) {
        rtSchedule();
        return;
    }
    let ws;
    try {
        ws = new WebSocket(SUPA_HOST.replace('https', 'wss') + '/realtime/v1/websocket?apikey=' + SUPA_PK + '&vsn=1.0.0');
    }
    catch (e) {
        rtSchedule();
        return;
    }
    rtWs = ws;
    ws.onopen = () => {
        rtSend('realtime:evarel-items', 'phx_join', { config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table: 'items' }] }, access_token: tok });
        clearInterval(rtHb);
        rtHb = setInterval(() => rtSend('phoenix', 'heartbeat', {}), 25000);
        clearInterval(rtTokT);
        rtTokT = setInterval(async () => { try {
            rtSend('realtime:evarel-items', 'access_token', { access_token: await ST.Repo.token() });
        }
        catch (e) {
            console.warn('rt token', e);
        } }, 10 * 60 * 1000);
    };
    ws.onmessage = m => {
        let d;
        try {
            d = JSON.parse(m.data);
        }
        catch (e) {
            return;
        }
        if (d.event === 'phx_reply' && d.topic === 'realtime:evarel-items') {
            if (d.payload?.status === 'ok') {
                rtRetry = 0;
                rtKick();
            }
            else {
                console.warn('rt join', d.payload);
                try {
                    ws.close();
                }
                catch (e) { }
            }
        }
        else if (d.event === 'postgres_changes')
            rtKick();
        else if (d.event === 'phx_error' || d.event === 'phx_close') {
            try {
                ws.close();
            }
            catch (e) { }
        }
    };
    ws.onclose = () => { if (rtWs === ws)
        rtWs = null; clearInterval(rtHb); clearInterval(rtTokT); rtSchedule(); };
    ws.onerror = () => { try {
        ws.close();
    }
    catch (e) { } };
}
function rtSchedule() { if (!rtOn || rtTimer)
    return; const wait = Math.min(30000, 1000 * Math.pow(2, rtRetry++)); rtTimer = setTimeout(() => { rtTimer = null; rtConnect(); }, wait); }
function startLiveSync() { if (!SUPA_API)
    return; stopLiveSync(); rtOn = true; rtRetry = 0; rtConnect(); }
function stopLiveSync() { rtOn = false; clearTimeout(rtTimer); rtTimer = null; clearTimeout(rtDeb); clearInterval(rtHb); clearInterval(rtTokT); const w = rtWs; rtWs = null; if (w) {
    w.onclose = null;
    try {
        w.close();
    }
    catch (e) { }
} }
const rtResume = () => { if (rtOn && !rtWs) {
    clearTimeout(rtTimer);
    rtTimer = null;
    rtRetry = 0;
    rtConnect();
} liveRefresh(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden)
    rtResume(); });
window.addEventListener('online', rtResume);
window.addEventListener('focus', rtResume);
Object.assign(window, { liveBusy, sigOf, typingNow, liveRefresh, SUPA_PK, rtWs, rtOn, rtRef, rtHb, rtRetry, rtTimer, rtDeb, rtTokT, rtSend, rtKick, rtConnect, rtSchedule, startLiveSync, stopLiveSync, rtResume });

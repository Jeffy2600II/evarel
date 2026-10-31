/* ชั้นฐาน (ES module จริง): ค่าคงที่และตัวช่วยข้อมูลล้วนของแอป ต้นฉบับเดียวของ DAY_MS WD TH_MON TH_DAY TH_MONTH (core/dates import จากที่นี่)
   โมดูลเดิม 01-core__constants ส่งออกชื่อเดิมต่อและลงทะเบียนบน window เหมือนเดิม */
/* ===== MODULE: core/constants ===== */
export const STORE_KEY='evarel-demo-v3',TIMER_KEY='evarel-timer-v3',THEME_KEY='evarel-theme-v3';
export const DAY_MS=86400000,TOAST_MS=5000,SKELETON_MS=450,STREAK_LOOKBACK=365,STAT_DAYS=30,DRAG_CLOSE_PX=110,DRAG_CLOSE_V=.6,HAPTIC_MS=10,LONG_PRESS_MS=450,LAYER_ANIM_MS=420,MAX_REM=8;
export const TYPES={habit:'กิจวัตร',task:'งาน',event:'กิจกรรม',class:'คาบเรียน'};
export const TABS=[['today','วันนี้','home'],['all','รายการ','tasks'],['calendar','ปฏิทิน','cal'],['stats','สถิติ','chart']];
export const WD=['อา','จ','อ','พ','พฤ','ศ','ส'],WEEK_OPTS=WD.map((l,i)=>[i,l]);
export const TH_MON=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],TH_DAY=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสฯ','ศุกร์','เสาร์'];
export const UNIT_TH={day:'วัน',week:'สัปดาห์',month:'เดือน'};
export const REM_PRESETS=[0,10,30,60,1440],TRACK_OPTS=[['check','ติ๊ก'],['count','นับเป้า'],['timer','ระยะเวลา']];
export const HHMM=/^([01]\d|2[0-3]):[0-5]\d$/;
export const ICONS={home:'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',tasks:'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9',cal:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',chart:'M5 20V10M12 20V4M19 20v-7',spark:'M12 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',plus:'M12 5v14M5 12h14',x:'M6 6l12 12M18 6L6 18',check:'M6.5 12.5l3.5 3.5 7.5-8',play:'M7.5 5l10 7-10 7z',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',pause:'M8 5v14M16 5v14',stop:'M7 7h10v10H7z',more:'M12 5.5v.01M12 12v.01M12 18.5v.01',edit:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',copy:'M9 9h11v11H9zM5 15V5h10',trash:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',skip:'M5 5l10 7-10 7zM19 5v14',bell:'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4',back:'M14.5 5l-7 7 7 7',chev:'M9 6l6 6-6 6',pin:'M9 4h6l-1 5 3 4H7l3-4zM12 13v7',chat:'M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',list:'M4 7h16M4 12h16M4 17h10',send:'M4 12l16-8-6 16-3-7z',mail:'M4 6h16v12H4zM4 7.5l8 6 8-6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',eyeoff:'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.7C3.9 8.5 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',alert:'M12 8.5v4.5M12 16.4v.01M12 3.5l9.5 16.5h-19z',gear:'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4z',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2',inbox:'M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5',thumbup:'M7 11v9H4v-9zM7 11l3.5-7a2 2 0 0 1 2.3 2.4L12.2 10H19a2 2 0 0 1 2 2.3l-1.3 6.4A2 2 0 0 1 17.7 20H7',thumbdown:'M7 13V4H4v9zM7 13l3.5 7a2 2 0 0 0 2.3-2.4L12.2 14H19a2 2 0 0 0 2-2.3l-1.3-6.4A2 2 0 0 0 17.7 4H7'};

/* moved by move_defs (evarel-ts-1f) */
export const seg=(act:string,o:Array<[string|number,string]>,cur:unknown)=>`<div class="ev-seg">${o.map(([k,l])=>`<button type="button" aria-pressed="${cur===k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
export const CHATS_KEY='evarel-chats-v3';
export const AI_TOOL_LABEL={item_create:'เพิ่ม',item_update:'แก้ไข',item_delete:'ลบ',log_set:'บันทึก',skip_set:'ข้าม',reminder_set:'ตั้งเตือน',memory_save:'จำไว้',memory_forget:'ลืม'};
export const isMemTool=(t:string)=>t==='memory_save'||t==='memory_forget';
export const AI_PLACEHOLDER='ถาม AI…';
export const TH_MONTH=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
export const NR='nr';
/* moved by move_defs (evarel-ts-1f) */
export const icon=(n:string)=>`<svg class="ev-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${(ICONS as Record<string,string>)[n]}"/></svg>`;

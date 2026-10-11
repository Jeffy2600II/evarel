
/* Path: design/master-demo-v3.html (ส่วน JS) | Purpose: ตรรกะ + UX ระดับแอป ในไฟล์เดียว
   Used by: agent ย้ายเข้า app/js/ — แต่ละหัวข้อ "MODULE:" = 1 ไฟล์ | Layer: core → services → ui(layers) → views → actions */


const ST={sheetMode:'',drag:null,popBtn:null,D:{},TM:null,focusId:null,CH:{list:[],cur:null},DETAIL:null,DV:null,swipeX:null};
/* hook for render (evarel-ts-1g): ผู้เรียกชั้นล่างเรียกผ่าน _render เพื่อไม่ชี้ย้อนทิศไปไฟล์ที่ประกาศ render */
let _render=()=>{};

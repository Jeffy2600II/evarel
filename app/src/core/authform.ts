/* ชั้นฐาน (ES module จริง): ตรรกะตรวจฟอร์มล็อกอินล้วน (รูปแบบอีเมล ความยาวรหัสผ่าน ตารางเดาโดเมนพิมพ์ผิด) ไม่แตะ DOM ไม่แตะสถานะกลาง
   ตัดวางจาก m/22-views__auth ตรงตัวอักษร ต่างแค่ export และชนิด (e:Record v:any kind:string ให้ tsc ยอมให้ออกไฟล์) RESEND_SEC คงไว้ที่ m/ เพราะเป็นของตัวนับถอยหลังที่ผูก DOM
   โมดูลเดิม import กลับและคงชื่อทั้งหมดบน window เหมือนเดิม (authSubmit ใน m/24 เรียก authValidate ผ่าน window) */
export const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,PW_MIN=8;
export const MAIL_TYPO:Record<string,string>={'gmial.com':'gmail.com','gmai.com':'gmail.com','gamil.com':'gmail.com','gmail.co':'gmail.com','gmail.con':'gmail.com','gmil.com':'gmail.com','hotmial.com':'hotmail.com','yaho.com':'yahoo.com'};

export function authValidate(kind:string,v:any){const e:Record<string,string>={},em=(v.email||'').trim();if(!em)e.email='กรุณากรอกอีเมล';else if(!EMAIL_RE.test(em))e.email='รูปแบบอีเมลไม่ถูกต้อง (เช่น name@gmail.com)';
 if(kind==='signup'){if(!(v.name||'').trim())e.name='กรุณากรอกชื่อ';if((v.password||'').length<PW_MIN)e.password=`รหัสผ่านอย่างน้อย ${PW_MIN} ตัวอักษร`;if(!v.terms)e.terms='ต้องยอมรับข้อกำหนดก่อนสร้างบัญชี'}
 if(kind==='login'&&!v.password)e.password='กรุณากรอกรหัสผ่าน';
 if(kind==='code'){delete e.email;if(!/^\d{6}$/.test((v.code||'').trim()))e.code='ใส่ตัวเลข 6 หลัก'}
 if(kind==='newpw'){delete e.email;if((v.password||'').length<PW_MIN)e.password=`รหัสผ่านอย่างน้อย ${PW_MIN} ตัวอักษร`}return e}

/* ===== F6 (ส่วนคำนวณของฟอร์มล็อกอินที่เคยปนกับ DOM ใน m/22-views__auth) ตัดวางนิพจน์ตรงตัวอักษร ไม่แตะ DOM ไม่แตะสถานะกลาง =====
   m/ ยังถือการเขียนลง DOM (dataset, innerHTML, setAttribute) แล้วเรียกฟังก์ชันเหล่านี้เอาค่าไปเขียน */
/** ระดับความแข็งแรงรหัสผ่านกับข้อความใต้มิเตอร์ (lv 0..4) เดิมคำนวณในตัวฟัง input */
export function pwStrength(p:string):{lv:number;label:string}{const s=[p.length>=PW_MIN,p.length>=12,/[a-z]/.test(p)&&/[A-Z]/.test(p),/\d/.test(p),/[^\w]/.test(p)].filter(Boolean).length,lv=p.length<PW_MIN?(p?1:0):Math.min(4,Math.max(1,s-1));
 return {lv,label:p?(p.length<PW_MIN?`อีก ${PW_MIN-p.length} ตัวอักษรจึงจะใช้ได้`:['','อ่อน','พอใช้','ดี','แข็งแรง'][lv]):'ใช้ตัวพิมพ์เล็ก-ใหญ่ ตัวเลข และสัญลักษณ์ผสมกันจะปลอดภัยขึ้น'}}
/** ปุ่มส่งซ้ำ: n=วินาทีที่เหลือ, screen=หน้าปัจจุบัน -> disabled กับ HTML ในปุ่ม เดิมอยู่ใน paintCool */
export function coolView(n:number,screen:string):{disabled:boolean;html:string}{return {disabled:n>0,html:n>0?`<span>ส่งอีกครั้งได้ใน ${n} วินาที</span>`:`<span>${screen==='code'?'ส่งรหัสอีกครั้ง':'ส่งลิงก์อีกครั้ง'}</span>`}}
/** คำแนะนำอีเมลพิมพ์ผิด: คืน {u,fix} เมื่อโดเมนอยู่ในตารางเดา ไม่เช่นนั้น null เดิมอยู่ในตัวฟัง focusout */
export function mailHint(value:string):{u:string;fix:string}|null{const [u,dom]=value.trim().split('@'),fix=dom&&MAIL_TYPO[dom.toLowerCase()];return fix?{u,fix}:null}
/** ข้อความ toast หลังส่งรหัส/ลิงก์ซ้ำสำเร็จ */
export const resendToast=(screen:string):string=>screen==='code'?'ส่งรหัสอีกครั้งแล้ว':'ส่งลิงก์อีกครั้งแล้ว';

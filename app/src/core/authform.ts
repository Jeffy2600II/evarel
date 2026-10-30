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

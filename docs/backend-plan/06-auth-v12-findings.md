# 06 | ผลสำรวจ v12 + ระบบสมัคร/ล็อกอิน (10 ต.ค. 2026) | สถานะ: ข้อเท็จจริงเท่านั้น ยังไม่ใช่แผนลงมือ

## A. เดโม v12 เทียบ v11 (ตรวจจากไฟล์จริง)
- v12 เพิ่มโมดูล `data/auth` (MockAuth/HttpAuth, จุดต่อ backend) + `views/auth` (welcome/login/signup/forgot/sent)
- หน้าตั้งค่าใหม่: การ์ดโปรไฟล์ (ชื่อ/อีเมล/ป้าย Google|อีเมล), ธีม, แจ้งเตือน, "ข้อมูลของคุณ" (สำรอง/นำเข้า/รีเซ็ต), "บัญชี" (ออกจากระบบ/ลบบัญชี)
- โมดูลอื่นชื่อตรง v11 ทั้งหมด (ยังไม่ได้ diff ระดับบรรทัด)
- สัญญา Auth ของเดโม: session, signInGoogle, signInEmail, signUp, sendReset, signOut, deleteAccount | error code: invalid_credentials|email_taken|network|unknown
- เดโม **ไม่มี** หน้ากรอกรหัสยืนยัน (OTP) และหน้าตั้งรหัสผ่านใหม่หลังกดลิงก์รีเซ็ต

## B. Resend (อ่านจาก resend.com/pricing + docs, 10 ต.ค. 2026)
- Free: 100 ฉบับ/วัน, custom domain 3, ข้อมูลย้อนหลัง 30 วัน, webhook 1 endpoint
- เอกสาร: ต้องมี **โดเมนของตัวเองที่ยืนยันแล้ว** + API key ก่อนส่ง
- SDK/ภาษา: Node.js, Next.js, Express, Python, PHP, Laravel, Ruby, Go, Rust, Elixir, Java, .NET + REST + SMTP
- ต่อกับ Supabase ได้ 2 ทาง: (1) SMTP: host smtp.resend.com พอร์ต 465 user=resend pass=API key ตั้งใน Supabase > Authentication > SMTP (2) Send Email Hook เรียก REST เอง

## C. Supabase Auth (อ่านจาก docs)
- OTP อีเมล 6 หลักมีในตัว: signInWithOtp / verifyOtp(type:'email') ปรับรูปแบบเมลที่เทมเพลตด้วย {{ .Token }} | หมดอายุเริ่มต้น 1 ชม. | ขอซ้ำได้ทุก 60 วินาที
- SMTP ของ Supabase เอง: ส่งได้เฉพาะอีเมลสมาชิกทีมโปรเจกต์ ใช้จริงไม่ได้ ต้องตั้ง custom SMTP
- ผูกบัญชีอัตโนมัติ: Google ที่อีเมลเดียวกับบัญชีอีเมลเดิม จะผูกเป็นผู้ใช้คนเดียวกัน (ปลอดภัยเมื่ออีเมลเดิมยืนยันแล้วเท่านั้น)
- สมัครอีเมลซ้ำกับบัญชี Google: ตอบแบบปกปิด ไม่ส่งเมลยืนยัน (กันเดาอีเมล)
- เพิ่มรหัสผ่านให้บัญชี Google ได้ด้วย updateUser({password})

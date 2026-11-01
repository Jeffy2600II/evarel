# ย้ายโดเมนทั้งระบบไป Ordivel

สถานะ ณ 1 พ.ย. 2026: **โค้ดพร้อมแล้ว แต่ยังไม่สลับ** เพราะโดเมนใหม่ยังไม่มีอยู่จริง
(ตรวจแล้ว `ordivel-app-forge` และ `ordivel-api-forge` ตอบ 404)

## 1. ของเดิมและของใหม่

| ชั้น | เดิม (forge = พัฒนา) | ใหม่ | เดิม (production) | ใหม่ |
|---|---|---|---|---|
| หน้าเว็บ | `evarel-app-forge.nontakorn2600.workers.dev` | `ordivel-app-forge.nontakorn2600.workers.dev` | `evarel-app.nontakorn2600.workers.dev` | `ordivel-app.nontakorn2600.workers.dev` |
| API | `evarel-api-forge.nontakorn2600.workers.dev` | `ordivel-api-forge.nontakorn2600.workers.dev` | `evarel-api.nontakorn2600.workers.dev` | `ordivel-api.nontakorn2600.workers.dev` |

`nontakorn2600` คือซับโดเมนระดับบัญชี Cloudflare (ใช้ร่วมกับ worker ทุกตัวในบัญชี) เปลี่ยนได้ที่แดชบอร์ดครั้งเดียว
แต่จะมีผลกับทุก worker ไม่ใช่เฉพาะโปรเจกต์นี้ จึงแยกเป็นการตัดสินใจของเจ้าของบัญชี

## 2. ทำไมต้องมีลำดับ (สำคัญที่สุด)

`scripts/build-next.mjs` ฝัง URL ของ API ลง `index.html` ตอน build และ CI `deploy-forge` ทำงานทันทีที่ push ขึ้น `develop`
ถ้า merge ก่อนที่ API worker ใหม่จะมีอยู่ แอปฝั่ง forge จะชี้ไป `ordivel-api-forge` ที่ยังไม่มี → ล็อกอินและข้อมูลทั้งหมดล้มทันที

**ลำดับที่ถูก**
1. ให้ API worker ชื่อใหม่มีอยู่จริงพร้อมความลับครบ (ดูข้อ 3)
2. ทดสอบ API ใหม่ด้วยคำขอจริง 1 ครั้ง (ข้อ 4)
3. merge PR โดเมน → CI deploy หน้าเว็บไปชื่อใหม่ให้เอง
4. อัปเดตคอนโซลภายนอก (ข้อ 5)
5. เก็บกวาด worker เก่า (ข้อ 7)

## 3. สร้าง API worker ชื่อใหม่ (ต้องทำก่อนทุกอย่าง)

worker API ใช้ความลับ 7 ตัวที่**อ่านกลับไม่ได้**จาก Cloudflare (เขียนได้อย่างเดียว) และในเครื่องพัฒนามีเพียง `SUPABASE_SERVICE_KEY`
จึงต้องเลือกทางใดทางหนึ่ง

**ทาง A: คัดลอกด้วยคำสั่ง (ต้องมีค่าความลับ)**
```
cd backend/api
npx wrangler deploy --env forge            # สร้าง ordivel-api-forge
npx wrangler secret put SUPABASE_URL --env forge
npx wrangler secret put SUPABASE_SERVICE_KEY --env forge
npx wrangler secret put GROQ_API_KEY --env forge
npx wrangler secret put OPENROUTER_API_KEY --env forge
npx wrangler secret put MEMORYLAKE_API_KEY --env forge
npx wrangler secret put MEMORYLAKE_WORKSPACE_ID --env forge
npx wrangler secret put VAPID_KEYS_JSON --env forge
npx wrangler secret put VAPID_CONTACT --env forge
```

**ทาง B: ใช้โดเมนของตัวเองแทน (ไม่ต้องคัดลอกความลับเลย)**
ผูก custom domain เข้ากับ worker **ตัวเดิม** เช่น `app.ordivel.com` และ `api.ordivel.com`
ในแดชบอร์ด Cloudflare → Workers → worker เดิม → Settings → Domains & Routes → Add custom domain
ของเดิมไม่ต้องรื้อ ความลับไม่ต้องย้าย แล้วแก้ URL ปลายทางใน `scripts/build-next.mjs` `scripts/build-web.mjs`
`scripts/deploy.mjs` และ `backend/api/wrangler.toml` (ALLOWED_ORIGIN) ให้เป็นโดเมนใหม่

## 4. ทดสอบก่อนสลับ

```
curl -s -o /dev/null -w '%{http_code}\n' https://ordivel-api-forge.nontakorn2600.workers.dev/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://ordivel-app-forge.nontakorn2600.workers.dev/
node tests/live_user.mjs            # ล็อกอินผู้ใช้ทดสอบผ่าน API ใหม่ (แก้ค่าคงที่ในไฟล์แล้ว)
```

## 5. คอนโซลภายนอก (เจ้าของบัญชีเท่านั้นที่แก้ได้)

**Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client (Web)**
- Authorized JavaScript origins: เพิ่ม `https://ordivel-app-forge.nontakorn2600.workers.dev` (และตัว production)
- Authorized redirect URIs: ต้องตรงกับที่ Supabase ใช้callback คือ
  `https://vdbmwmmsfrgpaauzspup.supabase.co/auth/v1/callback` (โดเมน Supabase ไม่เปลี่ยน จึงมักไม่ต้องแก้ฝั่งนี้)
- ถ้าใช้ custom domain ให้เพิ่ม origin ของโดเมนนั้นด้วย

**Supabase → Authentication → URL Configuration**
- Site URL: เปลี่ยนเป็นโดเมนใหม่
- Redirect URLs (allow list): เพิ่ม `https://ordivel-app-forge.nontakorn2600.workers.dev/**` และของ production
- ถ้าไม่แก้ข้อนี้ ล็อกอินด้วย Google จะเด้งกลับไปโดเมนเก่าหรือถูกปฏิเสธ

## 6. สิ่งที่ผู้ใช้จะเจอตอนสลับ (ต้องบอกล่วงหน้า)

- **ต้องล็อกอินใหม่**: ข้อมูลในเครื่อง (เซสชัน การตั้งค่า ธีม) เก็บแยกตามโดเมน โดเมนใหม่จึงเริ่มจากศูนย์
  ส่วนข้อมูลจริงทั้งหมดอยู่ใน Supabase ไม่หายและไม่ต้องย้าย
- **PWA ที่ติดตั้งไว้ต้องติดตั้งใหม่**: ไอคอนเดิมผูกกับโดเมนเก่า
- service worker แคชแยกตามโดเมน ออฟไลน์บนโดเมนใหม่จะเริ่มสะสมใหม่

## 7. เก็บกวาดหลังนิ่งแล้ว

1. `npx wrangler delete --name evarel-app-forge` (และคู่ API) เมื่อไม่มีผู้ใช้เหลือ
2. เก็บโดเมนเก่าไว้ตอบ 301 ไปโดเมนใหม่ก่อนลบ ถ้าต้องการให้ผู้ใช้เก่าตามมาเอง
3. `docs/ops/DOMAIN-MIGRATION.md` นี้ถือเป็นบันทึกการย้าย อัปเดตเมื่อปิดงาน

## 8. ด่านกันชื่อเก่ากลับมา

`node tests/domains.test.mjs` วิ่งใน CI แล้ว (งาน factory) ตรวจทุกไฟล์ที่ส่งถึงผู้ใช้และไฟล์ตั้งค่า
ถ้าใครก๊อปโค้ดยุคเก่ากลับมา จะตกพร้อมบอกไฟล์และบรรทัด ไม่ปล่อยให้ยิงไปโดเมนที่ปิดไปแล้วแบบเงียบ ๆ

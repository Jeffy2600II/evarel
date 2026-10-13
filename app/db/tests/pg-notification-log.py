# พิสูจน์ว่า notification_log กันแจ้งซ้ำได้จริงบน Postgres จริง (pip install pgserver) | รัน: python3 app/db/tests/pg-notification-log.py
# ข้อควรรู้: pgserver.psql คืนสตริงว่างเมื่อ SQL ผิดพลาด จึงจับ error ผ่านฟังก์ชัน zz_try ที่คืนผลเป็นข้อมูล
import pgserver, tempfile, threading, sys, uuid, os
srv = pgserver.get_server(tempfile.mkdtemp(prefix='pgnl_'), cleanup_mode='delete')
run = srv.psql
run("create role service_role; create schema auth; create table auth.users (id uuid primary key);")
sch = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'schema.sql'), encoding='utf-8').read()
i = sch.index('create table if not exists public.notification_log'); j = sch.index(');', i) + 2
run(sch[i:j])   # ใช้นิยามจริงจาก schema.sql ไม่เขียนซ้ำ
run("create or replace function public.zz_claim(p_uid uuid, p_key text) returns text language plpgsql as $f$ begin perform pg_sleep(0.2); insert into public.notification_log(user_id,key) values (p_uid,p_key); return 'CLAIMED'; exception when unique_violation then return 'DUP'; when others then return 'ERR:' || sqlerrm; end $f$;")
def val(sql):
    ls = [l.strip() for l in run(sql).strip().split('\n')]; return ls[2] if len(ls) > 2 else ''
U = str(uuid.uuid4()); run(f"insert into auth.users values ('{U}');")
res = []
def worker(): res.append(val(f"select public.zz_claim('{U}','1|2026-10-14|before:0|abc123');"))
th = [threading.Thread(target=worker) for _ in range(10)]
[t.start() for t in th]; [t.join() for t in th]
rows = val(f"select count(*) from public.notification_log where user_id='{U}';")
ok1 = res.count('CLAIMED') == 1 and res.count('DUP') == 9 and rows == '1'
print(('PASS' if ok1 else 'FAIL'), '1 จองคีย์เดียวกันขนาน 10 เธรดจริง -> ได้ 1 ชนะ 9 ชน', f'CLAIMED={res.count("CLAIMED")} DUP={res.count("DUP")} แถว={rows} อื่น={[r for r in res if r not in ("CLAIMED","DUP")]}')
r2 = val(f"select public.zz_claim('{U}','1|2026-10-14|before:0|OTHERDEVICE');")
print(('PASS' if r2 == 'CLAIMED' else 'FAIL'), '2 คีย์ต่างเครื่องไม่ชนกัน ->', r2)
U2 = str(uuid.uuid4()); run(f"insert into auth.users values ('{U2}');")
r3 = val(f"select public.zz_claim('{U2}','1|2026-10-14|before:0|abc123');")
print(('PASS' if r3 == 'CLAIMED' else 'FAIL'), '3 ผู้ใช้อื่นใช้คีย์ข้อความเดียวกันได้ (คีย์ผูก user_id) ->', r3)
run(f"delete from public.notification_log where user_id='{U}' and key='1|2026-10-14|before:0|abc123';")
r4 = val(f"select public.zz_claim('{U}','1|2026-10-14|before:0|abc123');")
print(('PASS' if r4 == 'CLAIMED' else 'FAIL'), '4 คืนการจอง (ลบ) แล้วจองใหม่ได้ ->', r4)
sys.exit(0 if (ok1 and r2 == 'CLAIMED' and r3 == 'CLAIMED' and r4 == 'CLAIMED') else 1)

# พิสูจน์ migrations-005-push-limit.sql กับ Postgres จริง (pip install pgserver) | รัน: python3 app/db/tests/pg005-push-limit.py
# ข้อควรรู้: pgserver.psql คืนสตริงว่างเมื่อ SQL ผิดพลาด (error ไป stderr) จึงจับ error ผ่านฟังก์ชัน zz_try ที่คืนผลเป็นข้อมูล
# พิสูจน์ migration 005 กับ Postgres จริง (pgserver) ไม่ใช่ตัวจำลอง: trigger atomic ภายใต้การยิงขนานจริง
import pgserver, tempfile, threading, sys, re, uuid
srv = pgserver.get_server(tempfile.mkdtemp(prefix='pg005_'), cleanup_mode='delete')
run = srv.psql
run("create role service_role; create role anon; create role authenticated;")
# จำลอง schema ของ Supabase เท่าที่ migration ต้องใช้: auth.users, auth.uid() และตาราง push_subscriptions ตามคอลัมน์จริงที่อ่านมา
run("""create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.push_subscriptions (id bigint generated always as identity primary key, user_id uuid references auth.users(id), endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz default now());
grant usage on schema public, auth to anon, authenticated, service_role;
grant all on public.push_subscriptions to authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;""")
mig = open('' + __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'migrations-005-push-limit.sql') + '', encoding='utf-8').read()
# แถวจาก PoC ที่ user_id เป็น null (เหมือนของจริง) ต้องอยู่รอดไม่ถูกแตะ
run("insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values (null,'https://fcm.googleapis.com/poc-row','p','a');")
o1 = run(mig); print('โหลด migration:', 'ERROR' if 'ERROR' in o1 else 'ok')
if 'ERROR' in o1: print(o1[:700]); sys.exit(1)
o2 = run(mig); print('รันซ้ำได้ (idempotent):', 'ERROR' not in o2)
res = []
def ok(n, c, v=''): res.append(c); print(('PASS ' if c else 'FAIL ') + n + (' | ' + str(v) if v else ''))
run("create or replace function public.zz_try(p_stmt text) returns text language plpgsql as $f$ begin execute p_stmt; return 'OK'; exception when others then return 'ERR:' || sqlerrm; end $f$;")
def tryq(stmt): return val("select public.zz_try($zq$" + stmt + "$zq$);")
def val(sql):
    o = run(sql); ls = [l.strip() for l in o.strip().split('\n')]; return ls[2] if len(ls) > 2 else o.strip()
A, B = str(uuid.uuid4()), str(uuid.uuid4())
run(f"insert into auth.users values ('{A}'),('{B}');")
ins = lambda u, i: tryq(f"insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('{u}','https://fcm.googleapis.com/{u[:4]}-{i}','p','a')")
for i in range(5): ins(A, i)
r6 = ins(A, 6)
ok('1 เครื่องที่ 6 ถูกปฏิเสธด้วย push_subscriptions_limit', 'push_subscriptions_limit' in r6, r6[:90])
ok('2 ยังมี 5 แถว (ไม่เพิ่ม)', val(f"select count(*) from public.push_subscriptions where user_id='{A}';") == '5')
ins(B, 1); ok('3 ผู้ใช้อื่นไม่ถูกกระทบ', val(f"select count(*) from public.push_subscriptions where user_id='{B}';") == '1')
ok('4 แถว PoC (user_id null) รอดไม่ถูกแตะ', val("select count(*) from public.push_subscriptions where user_id is null;") == '1')
r_null = tryq("insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values (null,'https://fcm.googleapis.com/another-null','p','a')")
ok('5 แถว user_id null ไม่ถูกนับ/กั้น (ไม่ error)', r_null == 'OK', r_null)
run(f"delete from public.push_subscriptions where user_id='{A}' and endpoint like '%-0';"); r_back = ins(A, 7)
ok('6 ลบ 1 แล้วเพิ่มได้อีก 1 (ไม่ล็อกถาวร)', r_back == 'OK' and val(f"select count(*) from public.push_subscriptions where user_id='{A}';") == '5')
# ยิงขนานจริง: บังคับให้ "ช่วงอ่านจำนวน -> เขียน" ซ้อนกันจริงด้วย pg_sleep ในฟังก์ชันที่นับแล้วค่อยแทรก
# (psql แต่ละครั้งเปิดโปรเซสใหม่ ช้าเกินกว่าธุรกรรมจะซ้อนกันเอง จึงต้องขยายช่องว่างให้เห็นการแข่งจริง)
C = str(uuid.uuid4()); run(f"insert into auth.users values ('{C}');")
run("""create or replace function public.zz_slow_insert(p_uid uuid, p_ep text) returns text language plpgsql as $f$
begin
  perform pg_sleep(0.4);                      -- ขยายช่องว่างก่อน insert: trigger (ถ้ามีล็อก) ต้องทำให้คนอื่นรอจนเสร็จ
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values (p_uid,p_ep,'p','a');
  return 'OK';
exception when others then return 'ERR:' || sqlerrm; end $f$;""")
errs = []
def worker(i):
    try:
        o = val("select public.zz_slow_insert('" + C + "','https://fcm.googleapis.com/race-" + str(i) + "');")
        errs.append('ok' if o == 'OK' else ('limit' if 'push_subscriptions_limit' in o else 'other:' + o[:60]))
    except Exception as e: errs.append('exc:' + str(e)[:60])
th = [threading.Thread(target=worker, args=(i,)) for i in range(14)]
[x.start() for x in th]; [x.join() for x in th]
cnt = val(f"select count(*) from public.push_subscriptions where user_id='{C}';")
ok('7 ยิงขนาน 14 เธรดจริง (ซ้อนกันด้วย pg_sleep) เพดาน 5 -> ได้ 5 แถวพอดี', cnt == '5', f'แถวจริง={cnt} ok={errs.count("ok")} limit={errs.count("limit")} อื่น={[e for e in errs if e not in ("ok","limit")]}')
# RLS จริง: authenticated เห็นเฉพาะของตัวเอง
def as_user(u, sql): return run(f"begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '{u}'; {sql}; commit;")
o = as_user(B, "select count(*) from public.push_subscriptions")
vis = [l.strip() for l in o.strip().split('\n') if l.strip().isdigit()]
ok('8 RLS: ผู้ใช้ B เห็นแค่ 1 แถวของตัวเอง ไม่เห็นของ A/C/PoC', vis[:1] == ['1'], vis)
o = as_user(B, f"delete from public.push_subscriptions where user_id='{A}'")
ok('9 RLS: B ลบของ A ไม่ได้ (A ยังมี 5)', val(f"select count(*) from public.push_subscriptions where user_id='{A}';") == '5')
run(f"create or replace function public.zz_as(p_uid text, p_stmt text) returns text language plpgsql as $f$ begin set local role authenticated; perform set_config('request.jwt.claim.sub', p_uid, true); execute p_stmt; return 'OK'; exception when others then return 'ERR:' || sqlerrm; end $f$;")
o = val(f"select public.zz_as('{B}', $zq$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('{A}','https://fcm.googleapis.com/forge-by-B','p','a')$zq$);")
ok('10 RLS: B เพิ่มแถวในนามของ A ไม่ได้ (with check)', 'row-level security' in o.lower(), o[:100])
ok('10b และแถวปลอมไม่ถูกสร้างจริง', val("select count(*) from public.push_subscriptions where endpoint like '%forge-by-B%';") == '0')
print('\nผ่าน', sum(res), '| ตก', len(res) - sum(res)); sys.exit(0 if all(res) else 1)

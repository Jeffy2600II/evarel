-- migration 001: v11 ใช้ track='none' กับคาบเรียน/กิจกรรม (ไม่ติดตามผล) แต่ schema แรกอนุญาตแค่ check|count|timer
-- รันครั้งเดียวใน Supabase SQL Editor (ปลอดภัย: แค่ขยายค่าที่อนุญาต ไม่แตะข้อมูลเดิม)
alter table public.items drop constraint if exists items_track_check;
alter table public.items add constraint items_track_check check (track in ('check','count','timer','none'));

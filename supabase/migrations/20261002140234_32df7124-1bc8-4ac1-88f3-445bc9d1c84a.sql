
create type public.app_role as enum ('student','faculty');
create type public.avail_status as enum ('available','busy','cancelled');
create type public.appt_status as enum ('pending','accepted','rejected','cancelled');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);
grant select on public.departments to anon, authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "departments readable" on public.departments for select to anon, authenticated using (true);

create table public.profiles (
  id uuid primary key,
  full_name text not null,
  email text,
  roll_no text,
  department_id uuid references public.departments(id),
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  full_name text not null,
  email text,
  designation text not null default 'Assistant Professor',
  department_id uuid references public.departments(id),
  subjects text[] not null default '{}',
  cabin text,
  phone text,
  bio text,
  created_at timestamptz not null default now()
);
grant select, update on public.faculty to authenticated;
grant all on public.faculty to service_role;
alter table public.faculty enable row level security;
create policy "faculty readable" on public.faculty for select to authenticated using (true);
create policy "faculty edit own" on public.faculty for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.owns_faculty(_fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.faculty where id = _fid and user_id = auth.uid())
$$;

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6),
  start_time time not null,
  end_time time not null,
  subject text not null,
  room text,
  section text
);
grant select, insert, update, delete on public.timetable_slots to authenticated;
grant all on public.timetable_slots to service_role;
alter table public.timetable_slots enable row level security;
create policy "slots readable" on public.timetable_slots for select to authenticated using (true);
create policy "slots insert own" on public.timetable_slots for insert to authenticated with check (public.owns_faculty(faculty_id));
create policy "slots update own" on public.timetable_slots for update to authenticated using (public.owns_faculty(faculty_id)) with check (public.owns_faculty(faculty_id));
create policy "slots delete own" on public.timetable_slots for delete to authenticated using (public.owns_faculty(faculty_id));

create table public.availability_updates (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  status public.avail_status not null,
  location text,
  reason text,
  valid_until timestamptz not null,
  notify boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.availability_updates to authenticated;
grant all on public.availability_updates to service_role;
alter table public.availability_updates enable row level security;
create policy "avail readable" on public.availability_updates for select to authenticated using (true);
create policy "avail insert own" on public.availability_updates for insert to authenticated with check (public.owns_faculty(faculty_id));
create policy "avail update own" on public.availability_updates for update to authenticated using (public.owns_faculty(faculty_id)) with check (public.owns_faculty(faculty_id));

create table public.follows (
  student_id uuid not null,
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, faculty_id)
);
grant select, insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "follows own read" on public.follows for select to authenticated using (student_id = auth.uid());
create policy "follows own insert" on public.follows for insert to authenticated with check (student_id = auth.uid() and public.has_role(auth.uid(),'student'));
create policy "follows own delete" on public.follows for delete to authenticated using (student_id = auth.uid());

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid,
  student_name text not null,
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  reason text not null,
  appt_date date not null,
  start_time time not null,
  end_time time not null,
  note text,
  status public.appt_status not null default 'pending',
  faculty_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "appt student read" on public.appointments for select to authenticated using (student_id = auth.uid() or public.owns_faculty(faculty_id));
create policy "appt student insert" on public.appointments for insert to authenticated with check (student_id = auth.uid() and status = 'pending' and public.has_role(auth.uid(),'student'));
create policy "appt update" on public.appointments for update to authenticated using (student_id = auth.uid() or public.owns_faculty(faculty_id)) with check (student_id = auth.uid() or public.owns_faculty(faculty_id));

create or replace function public.guard_appointment_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.student_id is distinct from old.student_id or new.faculty_id <> old.faculty_id
     or new.appt_date <> old.appt_date or new.start_time <> old.start_time or new.end_time <> old.end_time
     or new.reason <> old.reason or new.student_name <> old.student_name then
    raise exception 'Appointment details cannot be changed';
  end if;
  if public.owns_faculty(old.faculty_id) then
    if new.status not in ('accepted','rejected') or old.status not in ('pending','accepted') then
      raise exception 'Faculty can only accept or reject open requests';
    end if;
  elsif old.student_id = auth.uid() then
    if new.status <> 'cancelled' or old.status not in ('pending','accepted') then
      raise exception 'You can only cancel pending or accepted appointments';
    end if;
    if new.faculty_response is distinct from old.faculty_response then
      raise exception 'Not allowed';
    end if;
  else
    raise exception 'Not allowed';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_guard_appt before update on public.appointments for each row execute function public.guard_appointment_update();

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy "ann readable" on public.announcements for select to authenticated using (true);
create policy "ann insert own" on public.announcements for insert to authenticated with check (public.owns_faculty(faculty_id));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Notification triggers
create or replace function public.notify_availability()
returns trigger language plpgsql security definer set search_path = public as $$
declare fname text; t text; b text; ty text;
begin
  if not new.notify then return new; end if;
  select full_name into fname from public.faculty where id = new.faculty_id;
  if new.status = 'available' then ty := 'available'; t := fname || ' is now available';
  elsif new.status = 'cancelled' then ty := 'cancelled'; t := fname || ': class cancelled';
  else ty := 'busy'; t := fname || ' is busy'; end if;
  b := concat_ws(' · ', nullif(new.location,''), 'Until ' || to_char(new.valid_until at time zone 'Asia/Kolkata', 'HH12:MI AM'), nullif(new.reason,''));
  insert into public.notifications (user_id, type, title, body, link)
  select f.student_id, ty, t, b, '/faculty/' || new.faculty_id from public.follows f where f.faculty_id = new.faculty_id;
  return new;
end $$;
create trigger trg_notify_avail after insert on public.availability_updates for each row execute function public.notify_availability();

create or replace function public.notify_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
declare fname text;
begin
  select full_name into fname from public.faculty where id = new.faculty_id;
  insert into public.notifications (user_id, type, title, body, link)
  select f.student_id, 'announcement', 'Update from ' || fname, new.message, '/faculty/' || new.faculty_id
  from public.follows f where f.faculty_id = new.faculty_id;
  return new;
end $$;
create trigger trg_notify_ann after insert on public.announcements for each row execute function public.notify_announcement();

create or replace function public.notify_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare fuser uuid; fname text;
begin
  select user_id, full_name into fuser, fname from public.faculty where id = new.faculty_id;
  if tg_op = 'INSERT' then
    if fuser is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (fuser, 'appointment_request', 'New appointment request', new.student_name || ' · ' || new.reason || ' · ' || to_char(new.appt_date,'Dy DD Mon') || ' ' || to_char(new.start_time,'HH12:MI AM'), '/requests');
    end if;
  elsif new.status <> old.status and new.student_id is not null then
    if new.status = 'accepted' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.student_id, 'appointment_accepted', 'Appointment confirmed', fname || ' · ' || to_char(new.appt_date,'Dy DD Mon') || ' ' || to_char(new.start_time,'HH12:MI AM') || coalesce(' · ' || nullif(new.faculty_response,''), ''), '/appointments');
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.student_id, 'appointment_rejected', 'Appointment declined', fname || coalesce(' · ' || nullif(new.faculty_response,''), ''), '/appointments');
    elsif new.status = 'cancelled' and fuser is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (fuser, 'appointment_cancelled', 'Appointment cancelled', new.student_name || ' cancelled ' || to_char(new.appt_date,'Dy DD Mon'), '/requests');
    end if;
  end if;
  return new;
end $$;
create trigger trg_notify_appt after insert or update on public.appointments for each row execute function public.notify_appointment();

-- Registration completion (idempotent)
create or replace function public.complete_registration(
  p_role public.app_role, p_full_name text, p_department_id uuid, p_roll_no text default null,
  p_claim_faculty_id uuid default null, p_designation text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); uemail text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.user_roles where user_id = uid) then return; end if;
  if length(trim(coalesce(p_full_name,''))) = 0 then raise exception 'Name required'; end if;
  select email into uemail from auth.users where id = uid;
  insert into public.profiles (id, full_name, email, roll_no, department_id)
  values (uid, trim(p_full_name), uemail, p_roll_no, p_department_id)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (uid, p_role);
  if p_role = 'faculty' then
    if p_claim_faculty_id is not null then
      update public.faculty set user_id = uid, email = coalesce(email, uemail)
      where id = p_claim_faculty_id and user_id is null;
      if not found then raise exception 'That faculty profile is already claimed'; end if;
    else
      insert into public.faculty (user_id, full_name, email, department_id, designation)
      values (uid, trim(p_full_name), uemail, p_department_id, coalesce(nullif(p_designation,''),'Assistant Professor'));
    end if;
  end if;
end $$;
grant execute on function public.complete_registration(public.app_role, text, uuid, text, uuid, text) to authenticated;

-- list of unclaimed faculty for registration (public, names only)
create or replace function public.unclaimed_faculty()
returns table (id uuid, full_name text, department_code text)
language sql stable security definer set search_path = public as $$
  select f.id, f.full_name, d.code from public.faculty f left join public.departments d on d.id = f.department_id
  where f.user_id is null order by f.full_name
$$;
grant execute on function public.unclaimed_faculty() to anon, authenticated;

-- Seed data
insert into public.departments (id, code, name) values
 ('11111111-0000-0000-0000-000000000001','CSE','Computer Science & Engineering'),
 ('11111111-0000-0000-0000-000000000002','IT','Information Technology'),
 ('11111111-0000-0000-0000-000000000003','ECE','Electronics & Communication Engineering'),
 ('11111111-0000-0000-0000-000000000004','EEE','Electrical & Electronics Engineering'),
 ('11111111-0000-0000-0000-000000000005','CSM','CSE (AI & Machine Learning)');

insert into public.faculty (id, full_name, email, designation, department_id, subjects, cabin, bio) values
 ('22222222-0000-0000-0000-000000000001','Dr. K. Lakshmi Prasanna','lakshmi.p@gvpcew.ac.in','Professor & HoD','11111111-0000-0000-0000-000000000001','{DBMS,"Data Mining"}','CSE Staff Room, Block A','Research in databases and data mining. 18 years of teaching.'),
 ('22222222-0000-0000-0000-000000000002','Dr. P. Ramesh Babu','ramesh.b@gvpcew.ac.in','Associate Professor','11111111-0000-0000-0000-000000000001','{"Operating Systems","Computer Networks"}','Cabin 204, Block A','Systems and networking. Project guide for final-year students.'),
 ('22222222-0000-0000-0000-000000000003','Mrs. S. Anitha Rani','anitha.s@gvpcew.ac.in','Assistant Professor','11111111-0000-0000-0000-000000000002','{"Web Technologies","Java Programming"}','IT Staff Room','Full-stack development and Java.'),
 ('22222222-0000-0000-0000-000000000004','Dr. M. Srinivas Rao','srinivas.m@gvpcew.ac.in','Professor','11111111-0000-0000-0000-000000000003','{"Digital Signal Processing","VLSI Design"}','ECE Block, Room 112','Signal processing and VLSI.'),
 ('22222222-0000-0000-0000-000000000005','Ms. G. Divya Sri','divya.g@gvpcew.ac.in','Assistant Professor','11111111-0000-0000-0000-000000000005','{"Machine Learning","Python Programming"}','CSM Staff Room','Applied machine learning.'),
 ('22222222-0000-0000-0000-000000000006','Mr. V. Naveen Kumar','naveen.v@gvpcew.ac.in','Assistant Professor','11111111-0000-0000-0000-000000000004','{"Power Systems","Electrical Machines"}','EEE Block, Cabin 3','Power systems and machines.');

-- Timetable: days 1..6 (Mon..Sat)
insert into public.timetable_slots (faculty_id, day_of_week, start_time, end_time, subject, room, section)
select f.fid, d.day, s.st::time, s.et::time, s.subj, s.room, s.sec
from (values
 ('22222222-0000-0000-0000-000000000001'::uuid, 'DBMS','Data Mining','Room 301','Room 305'),
 ('22222222-0000-0000-0000-000000000002'::uuid, 'Operating Systems','Computer Networks','Room 204','Lab 2'),
 ('22222222-0000-0000-0000-000000000003'::uuid, 'Web Technologies','Java Programming','Room 110','Lab 4'),
 ('22222222-0000-0000-0000-000000000004'::uuid, 'Digital Signal Processing','VLSI Design','ECE 201','VLSI Lab'),
 ('22222222-0000-0000-0000-000000000005'::uuid, 'Machine Learning','Python Programming','Room 402','AI Lab'),
 ('22222222-0000-0000-0000-000000000006'::uuid, 'Power Systems','Electrical Machines','EEE 105','Machines Lab')
) as f(fid, s1, s2, r1, r2)
cross join generate_series(1,6) as d(day)
cross join lateral (values
 (case when d.day % 2 = 1 then '09:00' else '10:00' end, case when d.day % 2 = 1 then '10:00' else '11:00' end, f.s1, f.r1, 'III Year A'),
 ('11:00','12:00', f.s2, f.r2, 'II Year B'),
 (case when d.day % 2 = 1 then '13:30' else '14:30' end, case when d.day % 2 = 1 then '14:30' else '15:30' end, f.s1, f.r1, 'III Year B')
) as s(st, et, subj, room, sec)
where not (d.day = 6 and s.st in ('13:30','14:30'));

insert into public.announcements (faculty_id, message) values
 ('22222222-0000-0000-0000-000000000001','Department meeting at 4 PM in the seminar hall. Project reviews move to Thursday.'),
 ('22222222-0000-0000-0000-000000000002','Mid-term OS lab records due by Friday.');

insert into public.appointments (student_id, student_name, faculty_id, reason, appt_date, start_time, end_time, note, status) values
 (null,'Ektha','22222222-0000-0000-0000-000000000001','Project Discussion', current_date + 1, '14:00','14:15','I need guidance on my project.','pending'),
 (null,'Rahul','22222222-0000-0000-0000-000000000001','Placement Guidance', current_date + 2, '15:00','15:15',null,'pending'),
 (null,'Sravani','22222222-0000-0000-0000-000000000002','Lab Doubt Clarification', current_date + 1, '12:00','12:15',null,'pending'),
 (null,'Meghana','22222222-0000-0000-0000-000000000001','Internship Letter', current_date - 3, '10:00','10:15',null,'accepted');

alter publication supabase_realtime add table public.notifications;

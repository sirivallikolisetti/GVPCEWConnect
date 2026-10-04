ALTER TABLE public.profiles ADD COLUMN year smallint, ADD COLUMN section text;
ALTER TABLE public.appointments ADD COLUMN student_class text;

DROP FUNCTION public.complete_registration(app_role, text, uuid, text, uuid, text);
CREATE FUNCTION public.complete_registration(p_role app_role, p_full_name text, p_department_id uuid, p_roll_no text DEFAULT NULL, p_claim_faculty_id uuid DEFAULT NULL, p_designation text DEFAULT NULL, p_year smallint DEFAULT NULL, p_section text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); uemail text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.user_roles where user_id = uid) then return; end if;
  if length(trim(coalesce(p_full_name,''))) = 0 then raise exception 'Name required'; end if;
  if p_year is not null and (p_year < 1 or p_year > 4) then raise exception 'Invalid year'; end if;
  select email into uemail from auth.users where id = uid;
  insert into public.profiles (id, full_name, email, roll_no, department_id, year, section)
  values (uid, trim(p_full_name), uemail, p_roll_no, p_department_id, p_year, nullif(upper(trim(coalesce(p_section,''))),''))
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
end $function$;

CREATE OR REPLACE FUNCTION public.set_student_class()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare y smallint; s text; d text;
begin
  new.student_class := null;
  if new.student_id is not null then
    select p.year, p.section, dp.code into y, s, d
    from public.profiles p left join public.departments dp on dp.id = p.department_id
    where p.id = new.student_id;
    if y is not null then
      new.student_class := y::text || coalesce(d,'') || coalesce(s,'');
    end if;
  end if;
  return new;
end $function$;

CREATE TRIGGER appointments_set_class BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_student_class();

CREATE OR REPLACE FUNCTION public.notify_appointment()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare fuser uuid; fname text; who text;
begin
  select user_id, full_name into fuser, fname from public.faculty where id = new.faculty_id;
  who := new.student_name || coalesce(' (' || new.student_class || ')', '');
  if tg_op = 'INSERT' then
    if fuser is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (fuser, 'appointment_request', 'New appointment request', who || ' · ' || new.reason || ' · ' || to_char(new.appt_date,'Dy DD Mon') || ' ' || to_char(new.start_time,'HH12:MI AM'), '/requests');
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
      values (fuser, 'appointment_cancelled', 'Appointment cancelled', who || ' cancelled ' || to_char(new.appt_date,'Dy DD Mon'), '/requests');
    end if;
  end if;
  return new;
end $function$;

revoke execute on function public.guard_appointment_update() from public, anon, authenticated;
revoke execute on function public.notify_availability() from public, anon, authenticated;
revoke execute on function public.notify_announcement() from public, anon, authenticated;
revoke execute on function public.notify_appointment() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.owns_faculty(uuid) from public, anon;
revoke execute on function public.complete_registration(public.app_role, text, uuid, text, uuid, text) from public, anon;

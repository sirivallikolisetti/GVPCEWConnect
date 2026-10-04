REVOKE EXECUTE ON FUNCTION public.set_student_class() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_registration(app_role, text, uuid, text, uuid, text, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_registration(app_role, text, uuid, text, uuid, text, smallint, text) TO authenticated;
-- Las funciones de los triggers solo las debe ejecutar la base de datos,
-- no los usuarios desde la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
-- is_admin() la necesitan las reglas de acceso de usuarios con sesión,
-- pero no los visitantes anónimos.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Se quitan los mentores de demostración: la plataforma queda solo con usuarios reales.
-- (Al borrar el usuario se borran en cascada su perfil, temas, disponibilidad y sesiones.)
delete from auth.users u
using public.profiles p
where p.id = u.id and p.is_demo;

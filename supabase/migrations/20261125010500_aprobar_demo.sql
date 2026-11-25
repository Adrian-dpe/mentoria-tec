-- Los mentores demo se crearon antes de ajustar la protección de perfiles
-- y su estado quedó en 'none'. Se aprueban aquí.
update public.profiles set mentor_status = 'approved' where is_demo and is_mentor;

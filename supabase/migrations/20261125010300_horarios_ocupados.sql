-- Horarios ocupados de un mentor (sin decir con quién), para que el
-- estudiante solo vea horarios libres al solicitar una sesión.
create or replace function public.mentor_busy(p_mentor uuid)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select s.starts_at, s.starts_at + make_interval(mins => s.duration_min)
  from public.sessions s
  where s.mentor_id = p_mentor
    and s.status in ('pending', 'accepted')
    and s.starts_at > now() - interval '1 day';
$$;
revoke execute on function public.mentor_busy(uuid) from public, anon;
grant execute on function public.mentor_busy(uuid) to authenticated;

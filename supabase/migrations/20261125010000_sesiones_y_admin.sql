-- =====================================================================
-- Reglas de sesiones, estadísticas y funciones de administración
-- =====================================================================

-- Respuesta del estudiante cuando el mentor pide más información.
alter table public.sessions add column student_reply text;
-- Marca los perfiles de demostración para poder borrarlos de un clic.
alter table public.profiles add column is_demo boolean not null default false;

-- ---------- Validar una nueva solicitud ----------
create or replace function public.validate_session_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  m public.profiles;
  inicio_local timestamp;
  fin_local timestamp;
  n int;
begin
  select * into m from public.profiles where id = new.mentor_id;
  if m.id is null or not m.is_mentor or m.mentor_status <> 'approved' or m.is_blocked then
    raise exception 'Este mentor no está disponible';
  end if;
  if (select is_blocked from public.profiles where id = new.student_id) then
    raise exception 'Tu cuenta está bloqueada';
  end if;
  if new.starts_at < now() + interval '1 hour' then
    raise exception 'Elige un horario con al menos 1 hora de anticipación';
  end if;

  inicio_local := new.starts_at at time zone 'America/Monterrey';
  fin_local := inicio_local + make_interval(mins => new.duration_min);

  if exists (select 1 from public.blocked_dates b
             where b.mentor_id = new.mentor_id and b.date = inicio_local::date) then
    raise exception 'El mentor no está disponible ese día';
  end if;

  if fin_local::date <> inicio_local::date or not exists (
    select 1 from public.availability a
    where a.mentor_id = new.mentor_id
      and a.weekday = extract(dow from inicio_local)
      and inicio_local::time >= a.start_time
      and fin_local::time <= a.end_time
  ) then
    raise exception 'Ese horario está fuera de la disponibilidad del mentor';
  end if;

  select count(*) into n from public.sessions s
  where s.mentor_id = new.mentor_id
    and s.status in ('pending', 'accepted', 'reschedule_proposed', 'info_requested')
    and date_trunc('week', s.starts_at at time zone 'America/Monterrey') = date_trunc('week', inicio_local);
  if n >= m.max_sessions_per_week then
    raise exception 'El mentor ya alcanzó su límite de sesiones esa semana';
  end if;

  if exists (
    select 1 from public.sessions s
    where s.mentor_id = new.mentor_id
      and s.status in ('pending', 'accepted')
      and tstzrange(s.starts_at, s.starts_at + make_interval(mins => s.duration_min))
       && tstzrange(new.starts_at, new.starts_at + make_interval(mins => new.duration_min))
  ) then
    raise exception 'Ese horario ya está ocupado';
  end if;

  new.status := 'pending';
  return new;
end;
$$;
create trigger sessions_validate_insert before insert on public.sessions
  for each row execute function public.validate_session_insert();

-- ---------- Validar cambios de estado ----------
-- Mentor: aceptar, rechazar, proponer otro horario, pedir información, marcar realizada.
-- Estudiante: aceptar el horario propuesto, responder información, marcar realizada.
-- Ambos: cancelar.
create or replace function public.validate_session_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  es_mentor boolean := uid = old.mentor_id;
  es_estudiante boolean := uid = old.student_id;
begin
  if uid is null or public.is_admin() then
    return new;
  end if;

  new.student_id := old.student_id;
  new.mentor_id := old.mentor_id;
  new.created_at := old.created_at;

  if new.status is distinct from old.status then
    if new.status = 'cancelled' then
      if old.status in ('rejected', 'cancelled', 'completed') then
        raise exception 'Esta sesión ya no se puede cancelar';
      end if;
      new.cancelled_by := uid;
    elsif new.status = 'completed' then
      if old.status <> 'accepted' or old.starts_at > now() then
        raise exception 'Solo puedes marcar como realizada una sesión aceptada que ya pasó';
      end if;
    elsif es_mentor then
      if new.status in ('accepted', 'rejected', 'info_requested')
         and old.status in ('pending', 'info_requested', 'reschedule_proposed') then
        null;
      elsif new.status = 'reschedule_proposed'
         and old.status in ('pending', 'info_requested', 'reschedule_proposed', 'accepted') then
        if new.proposed_starts_at is null or new.proposed_starts_at < now() then
          raise exception 'Indica un nuevo horario en el futuro';
        end if;
      else
        raise exception 'Cambio de estado no permitido';
      end if;
    elsif es_estudiante then
      if new.status = 'accepted' and old.status = 'reschedule_proposed' then
        new.starts_at := old.proposed_starts_at;
        new.proposed_starts_at := null;
      elsif new.status = 'pending' and old.status = 'info_requested' then
        null;
      else
        raise exception 'Cambio de estado no permitido';
      end if;
    end if;
  end if;

  -- Cada quien solo puede editar sus propios campos.
  if es_estudiante and not es_mentor then
    new.mentor_message := old.mentor_message;
    new.meeting_link := old.meeting_link;
    new.duration_min := old.duration_min;
    new.modality := old.modality;
    new.topic_id := old.topic_id;
    new.description := old.description;
    if not (new.status = 'accepted' and old.status = 'reschedule_proposed') then
      new.starts_at := old.starts_at;
      new.proposed_starts_at := old.proposed_starts_at;
    end if;
  elsif es_mentor then
    new.description := old.description;
    new.student_reply := old.student_reply;
    new.starts_at := old.starts_at;
    new.duration_min := old.duration_min;
    new.modality := old.modality;
    new.topic_id := old.topic_id;
  end if;
  return new;
end;
$$;
create trigger sessions_validate_update before update on public.sessions
  for each row execute function public.validate_session_update();

-- Solo el estudiante, una vez, y solo de sesiones realizadas (ya lo exige la policy).
-- ---------- Estadísticas públicas de mentores ----------
create or replace function public.mentor_stats()
returns table (mentor_id uuid, sesiones int, minutos int, personas int, temas int)
language sql stable security definer set search_path = ''
as $$
  select s.mentor_id,
         count(*)::int,
         coalesce(sum(s.duration_min), 0)::int,
         count(distinct s.student_id)::int,
         count(distinct s.topic_id)::int
  from public.sessions s
  where s.status = 'completed'
  group by s.mentor_id;
$$;

-- ---------- Funciones solo para administradores ----------
-- Lista de usuarios con su correo (el correo no es público para los demás).
create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, career text, is_mentor boolean,
               mentor_status text, is_admin boolean, is_blocked boolean, is_demo boolean,
               created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo administradores';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.career, p.is_mentor, p.mentor_status,
           p.is_admin, p.is_blocked, p.is_demo, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

-- Borra todos los perfiles de demostración.
create or replace function public.admin_delete_demo()
returns int language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores';
  end if;
  delete from auth.users u using public.profiles p where p.id = u.id and p.is_demo;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.validate_session_insert() from public, anon, authenticated;
revoke execute on function public.validate_session_update() from public, anon, authenticated;
revoke execute on function public.mentor_stats() from public, anon;
grant execute on function public.mentor_stats() to authenticated;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;
revoke execute on function public.admin_delete_demo() from public, anon;
grant execute on function public.admin_delete_demo() to authenticated;

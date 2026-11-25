-- =====================================================================
-- Completa los requisitos faltantes: foto, objetivos, visibilidad por
-- campo, mensajería, seguimiento, tema abordado y reconocimientos.
-- =====================================================================

-- Objetivos del estudiante (para el matching) y campos que el usuario oculta.
alter table public.profiles add column goals text;
alter table public.profiles add column hidden_fields text[] not null default '{}';

-- Seguimiento del mentor después de la sesión (siguientes pasos).
alter table public.sessions add column followup text;

-- Tema realmente abordado en la sesión (retroalimentación).
alter table public.feedback add column topic_covered text;

-- El estudiante no puede editar el seguimiento del mentor.
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

  if es_estudiante and not es_mentor then
    new.mentor_message := old.mentor_message;
    new.meeting_link := old.meeting_link;
    new.followup := old.followup;
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
revoke execute on function public.validate_session_update() from public, anon, authenticated;

-- ---------- Mensajería interna por sesión ----------
create table public.messages (
  id bigserial primary key,
  session_id bigint not null references public.sessions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index messages_session_idx on public.messages (session_id, created_at);

create policy "ver mensajes de mis sesiones" on public.messages for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id
    and (s.student_id = (select auth.uid()) or s.mentor_id = (select auth.uid())))
    or (select public.is_admin()));
create policy "escribir en mis sesiones" on public.messages for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (
    select 1 from public.sessions s where s.id = session_id
      and (s.student_id = (select auth.uid()) or s.mentor_id = (select auth.uid()))
      and s.status not in ('rejected', 'cancelled')));

-- ---------- Reconocimientos otorgados por la administración ----------
create table public.recognitions (
  id bigserial primary key,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.recognitions enable row level security;
create policy "reconocimientos visibles" on public.recognitions for select to authenticated using (true);
create policy "admin da reconocimientos" on public.recognitions for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));
create policy "admin quita reconocimientos" on public.recognitions for delete to authenticated
  using ((select public.is_admin()));

-- ---------- Fotos de perfil ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada quien solo sube, cambia o borra fotos dentro de su propia carpeta (su id).
create policy "subir mi foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cambiar mi foto" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "borrar mi foto" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

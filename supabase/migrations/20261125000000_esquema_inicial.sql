-- =====================================================================
-- Esquema inicial de Mentoría Tec
-- Cada "create table" es una tabla (como una hoja de Excel) donde se
-- guarda un tipo de información. Las "policies" (RLS) son las reglas de
-- quién puede ver o cambiar cada fila: la base de datos las aplica sola,
-- así que aunque alguien intente saltarse la app, no puede ver datos ajenos.
-- =====================================================================

-- ---------- Correos permitidos ----------
-- Solo pueden registrarse correos del Tec (@tec.mx y subdominios como
-- @exatec.tec.mx). Esta tabla permite agregar excepciones a mano
-- (por ejemplo, tu correo personal para pruebas).
create table public.allowed_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;

-- ---------- Perfiles ----------
-- Un perfil por usuario. Una persona puede ser estudiante y mentor a la vez.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  photo_url text,
  career text,
  semester int check (semester between 1 and 12),
  graduation_year int check (graduation_year between 1950 and 2100),
  is_alumni boolean not null default false,
  bio text,
  -- Mentor
  is_mentor boolean not null default false,
  mentor_status text not null default 'none'
    check (mentor_status in ('none', 'pending', 'approved', 'rejected')),
  experience_academic text,
  experience_professional text,
  certifications text[] not null default '{}',
  tools text[] not null default '{}',
  industries text[] not null default '{}',
  exchanges text,
  has_international_experience boolean not null default false,
  languages text[] not null default '{}',
  modality text not null default 'virtual'
    check (modality in ('virtual', 'presencial', 'ambas')),
  session_duration_min int not null default 30 check (session_duration_min between 15 and 180),
  max_sessions_per_week int not null default 3 check (max_sessions_per_week between 0 and 50),
  -- Administración
  is_admin boolean not null default false,
  is_blocked boolean not null default false,
  accepted_code_of_conduct_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- LinkedIn va en su propia tabla para que el mentor decida si es visible.
create table public.profile_links (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://([a-z]+\.)?linkedin\.com/'),
  linkedin_visible boolean not null default true
);
alter table public.profile_links enable row level security;

-- ---------- Temas de mentoría ----------
create table public.topics (
  id serial primary key,
  name text not null unique,
  category text not null,
  is_active boolean not null default true
);
alter table public.topics enable row level security;

-- Temas que cada persona ofrece (mentor) o busca (estudiante).
create table public.profile_topics (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  topic_id int not null references public.topics (id) on delete cascade,
  kind text not null check (kind in ('offer', 'seek')),
  primary key (profile_id, topic_id, kind)
);
alter table public.profile_topics enable row level security;

-- ---------- Disponibilidad ----------
-- weekday: 0 = domingo ... 6 = sábado. Horas en hora del centro de México.
create table public.availability (
  id bigserial primary key,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
alter table public.availability enable row level security;

create table public.blocked_dates (
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  primary key (mentor_id, date)
);
alter table public.blocked_dates enable row level security;

-- ---------- Sesiones (solicitudes + sesiones agendadas) ----------
-- Una solicitud ES una sesión en estado "pending". Al aceptarla pasa a
-- "accepted"; si el mentor propone otro horario pasa a "reschedule_proposed"; etc.
create table public.sessions (
  id bigserial primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  topic_id int references public.topics (id) on delete set null,
  description text not null check (char_length(description) between 10 and 2000),
  starts_at timestamptz not null,
  duration_min int not null check (duration_min between 15 and 180),
  modality text not null check (modality in ('virtual', 'presencial')),
  status text not null default 'pending' check (status in (
    'pending', 'accepted', 'rejected', 'reschedule_proposed',
    'info_requested', 'cancelled', 'completed'
  )),
  mentor_message text,
  proposed_starts_at timestamptz,
  meeting_link text,
  cancelled_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (student_id <> mentor_id)
);
alter table public.sessions enable row level security;
create index sessions_mentor_idx on public.sessions (mentor_id, starts_at);
create index sessions_student_idx on public.sessions (student_id, starts_at);

-- ---------- Retroalimentación ----------
create table public.feedback (
  session_id bigint primary key references public.sessions (id) on delete cascade,
  usefulness int not null check (usefulness between 1 and 5),
  clarity int not null check (clarity between 1 and 5),
  attitude int not null check (attitude between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;

-- ---------- Favoritos ----------
create table public.favorites (
  student_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, mentor_id)
);
alter table public.favorites enable row level security;

-- ---------- Reportes ----------
create table public.reports (
  id bigserial primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid references public.profiles (id) on delete set null,
  session_id bigint references public.sessions (id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

-- =====================================================================
-- Funciones de apoyo
-- =====================================================================

-- ¿El usuario actual es administrador?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Al registrarse alguien: valida el correo y crea su perfil vacío.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  correo text := lower(new.email);
begin
  if not (
    correo like '%@tec.mx'
    or correo like '%.tec.mx'
    or exists (select 1 from public.allowed_emails a where lower(a.email) = correo)
  ) then
    raise exception 'Solo se permiten correos institucionales del Tec';
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.profile_links (profile_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene updated_at al día.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();

-- Impide que un usuario normal se haga admin, se desbloquee o se apruebe
-- a sí mismo como mentor.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.is_admin := old.is_admin;
    new.is_blocked := old.is_blocked;
    if new.mentor_status is distinct from old.mentor_status
       and not (old.mentor_status in ('none', 'rejected') and new.mentor_status = 'pending') then
      new.mentor_status := old.mentor_status;
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- =====================================================================
-- Reglas de acceso (RLS)
-- =====================================================================

-- Perfiles: cualquier usuario con sesión iniciada ve los perfiles no bloqueados.
create policy "perfiles visibles" on public.profiles for select to authenticated
  using (not is_blocked or id = (select auth.uid()) or (select public.is_admin()));
create policy "editar mi perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- LinkedIn: visible si el dueño lo permite.
create policy "linkedin visible" on public.profile_links for select to authenticated
  using (linkedin_visible or profile_id = (select auth.uid()) or (select public.is_admin()));
create policy "editar mi linkedin" on public.profile_links for update to authenticated
  using (profile_id = (select auth.uid()));

-- Temas: todos los leen; solo admin los administra.
create policy "temas visibles" on public.topics for select to authenticated using (true);
create policy "admin temas" on public.topics for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "temas de perfiles visibles" on public.profile_topics for select to authenticated using (true);
create policy "mis temas" on public.profile_topics for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- Disponibilidad: todos la ven; cada mentor edita la suya.
create policy "disponibilidad visible" on public.availability for select to authenticated using (true);
create policy "mi disponibilidad" on public.availability for all to authenticated
  using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));
create policy "fechas bloqueadas visibles" on public.blocked_dates for select to authenticated using (true);
create policy "mis fechas bloqueadas" on public.blocked_dates for all to authenticated
  using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));

-- Sesiones: solo las ven el estudiante, el mentor y admin.
create policy "ver mis sesiones" on public.sessions for select to authenticated
  using (student_id = (select auth.uid()) or mentor_id = (select auth.uid()) or (select public.is_admin()));
create policy "solicitar sesion" on public.sessions for insert to authenticated
  with check (student_id = (select auth.uid()) and status = 'pending');
create policy "actualizar mis sesiones" on public.sessions for update to authenticated
  using (student_id = (select auth.uid()) or mentor_id = (select auth.uid()));

-- Retroalimentación: la escribe el estudiante de la sesión; la ven ambos y admin.
create policy "ver feedback" on public.feedback for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id
    and (s.student_id = (select auth.uid()) or s.mentor_id = (select auth.uid())))
    or (select public.is_admin()));
create policy "dar feedback" on public.feedback for insert to authenticated
  with check (exists (select 1 from public.sessions s where s.id = session_id
    and s.student_id = (select auth.uid()) and s.status = 'completed'));

-- Favoritos: privados de cada estudiante.
create policy "mis favoritos" on public.favorites for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- Reportes: cualquiera reporta; solo admin los ve y gestiona.
create policy "crear reporte" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "admin reportes" on public.reports for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- allowed_emails: solo admin.
create policy "admin correos" on public.allowed_emails for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- =====================================================================
-- Temas iniciales
-- =====================================================================
insert into public.topics (name, category) values
  ('Datos y analítica', 'Tecnología'),
  ('Inteligencia Artificial', 'Tecnología'),
  ('Desarrollo de software', 'Tecnología'),
  ('Nube', 'Tecnología'),
  ('Ciberseguridad', 'Tecnología'),
  ('Procesos y automatización', 'Tecnología'),
  ('Tecnología', 'Tecnología'),
  ('Negocios', 'Negocios'),
  ('Emprendimiento', 'Negocios'),
  ('Empleabilidad', 'Carrera profesional'),
  ('Preparación de CV y LinkedIn', 'Carrera profesional'),
  ('Entrevistas', 'Carrera profesional'),
  ('Certificaciones profesionales', 'Carrera profesional'),
  ('Prácticas profesionales', 'Carrera profesional'),
  ('Internships', 'Carrera profesional'),
  ('Proyectos académicos', 'Vida académica'),
  ('Selección de materias', 'Vida académica'),
  ('Retos con empresas', 'Vida académica'),
  ('Servicio social', 'Vida académica'),
  ('Intercambios académicos', 'Internacional'),
  ('Experiencias internacionales', 'Internacional'),
  ('Vida universitaria', 'Comunidad'),
  ('Asociaciones estudiantiles', 'Comunidad'),
  ('Otras experiencias relevantes', 'Comunidad');

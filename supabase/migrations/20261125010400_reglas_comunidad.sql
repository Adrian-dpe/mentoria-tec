-- Reglas de la comunidad, editables desde la consola de administración.
create table public.community_rules (
  id serial primary key,
  text text not null check (char_length(text) between 5 and 500),
  position int not null default 0
);
alter table public.community_rules enable row level security;

create policy "reglas visibles" on public.community_rules for select to authenticated using (true);
create policy "admin reglas insert" on public.community_rules for insert to authenticated
  with check ((select public.is_admin()));
create policy "admin reglas update" on public.community_rules for update to authenticated
  using ((select public.is_admin()));
create policy "admin reglas delete" on public.community_rules for delete to authenticated
  using ((select public.is_admin()));

insert into public.community_rules (text, position) values
  ('La mentoría es voluntaria y entre pares: no es asesoría profesional oficial ni sustituye los canales institucionales del Tec.', 1),
  ('Trata a todas las personas con respeto, sin discriminación ni acoso de ningún tipo.', 2),
  ('Mantén las conversaciones enfocadas en la mentoría. No se permite vender productos o servicios.', 3),
  ('Cuida la información personal de los demás: no la compartas fuera de la plataforma sin permiso.', 4),
  ('Si no puedes asistir, cancela o reprograma con anticipación.', 5),
  ('Reporta cualquier situación inapropiada; un administrador la revisará.', 6);

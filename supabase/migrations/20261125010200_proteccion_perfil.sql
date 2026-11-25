-- La protección de campos de perfil solo aplica a usuarios de la app.
-- Los cambios hechos directamente en la base (sin usuario, auth.uid() nulo)
-- como asignar el primer administrador, sí se permiten.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.is_blocked := old.is_blocked;
    new.is_demo := old.is_demo;
    if new.mentor_status is distinct from old.mentor_status
       and not (old.mentor_status in ('none', 'rejected') and new.mentor_status = 'pending') then
      new.mentor_status := old.mentor_status;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;

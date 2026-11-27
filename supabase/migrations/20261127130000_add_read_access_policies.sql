-- Accès en lecture minimaux. Les écritures métier restent réservées aux RPC et
-- Edge Functions à venir : aucun client authentifié ne peut modifier les tables.

create function public.current_user_school_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select school_id
  from public.profiles
  where id = auth.uid()
    and active
  limit 1;
$$;

create function public.current_user_has_role_in_school(required_role public.user_role, required_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and school_id = required_school_id
      and role = required_role
      and active
  );
$$;

create function public.current_user_is_parent_of(required_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.parent_students relation on relation.parent_id = profile.id
    where profile.id = auth.uid()
      and profile.role = 'PARENT'
      and profile.active
      and relation.student_id = required_student_id
  );
$$;

revoke all on function public.current_user_school_id() from public;
revoke all on function public.current_user_has_role_in_school(public.user_role, uuid) from public;
revoke all on function public.current_user_is_parent_of(uuid) from public;
grant execute on function public.current_user_school_id() to authenticated;
grant execute on function public.current_user_has_role_in_school(public.user_role, uuid) to authenticated;
grant execute on function public.current_user_is_parent_of(uuid) to authenticated;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.schools, public.profiles, public.classes, public.students,
  public.parent_students, public.checkpoints, public.itineraries, public.time_windows
  to authenticated;

create policy "responsables lisent leur établissement"
on public.schools for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', id));

create policy "utilisateurs lisent leur profil"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "responsables lisent les profils de leur établissement"
on public.profiles for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', school_id));

create policy "responsables lisent les classes de leur établissement"
on public.classes for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', school_id));

create policy "responsables lisent les élèves de leur établissement"
on public.students for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', school_id));

create policy "parents lisent uniquement leurs enfants"
on public.students for select to authenticated
using (public.current_user_is_parent_of(id));

create policy "responsables lisent les rattachements de leur établissement"
on public.parent_students for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', school_id));

create policy "parents lisent uniquement leurs rattachements"
on public.parent_students for select to authenticated
using (parent_id = auth.uid());

create policy "responsables et agents lisent les points de leur établissement"
on public.checkpoints for select to authenticated
using (
  public.current_user_has_role_in_school('MANAGER', school_id)
  or public.current_user_has_role_in_school('AGENT', school_id)
);

create policy "responsables lisent les itinéraires de leur établissement"
on public.itineraries for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', school_id));

create policy "responsables lisent les fenêtres de leur établissement"
on public.time_windows for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', school_id));

create function public.notifier_parents_apres_anomalie()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.preparer_messages_anomalie(new.id);
  return new;
end;
$$;

create trigger anomalies_notifier_parents
after insert on public.anomalies
for each row execute function public.notifier_parents_apres_anomalie();

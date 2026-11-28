create function public.preparer_messages_anomalie(anomaly_uuid uuid) returns integer language plpgsql security definer set search_path=public as $$
declare a public.anomalies%rowtype; plafond integer; total integer; parent record; nombre integer:=0;
begin
 select * into a from anomalies where id=anomaly_uuid; if a.id is null then raise exception 'Anomalie introuvable'; end if;
 select daily_message_limit into plafond from schools where id=a.school_id;
 for parent in select parent_id from parent_students where student_id=a.student_id loop
  select count(*) into total from outgoing_messages where student_id=a.student_id and day=a.day and status in ('PENDING','SIMULATED');
  insert into outgoing_messages(school_id,student_id,parent_id,anomaly_id,day,text,status,suppression_reason) values(a.school_id,a.student_id,parent.parent_id,a.id,a.day,'Une situation nécessite votre attention. Veuillez contacter l’établissement.',case when total<plafond then 'PENDING'::public.outgoing_message_status else 'SUPPRESSED'::public.outgoing_message_status end,case when total<plafond then null else 'Plafond quotidien atteint' end) on conflict(anomaly_id,parent_id) do nothing;
  nombre:=nombre+1;
 end loop; return nombre;
end; $$;
create function public.notifier_parents_apres_anomalie() returns trigger language plpgsql security definer set search_path=public as $$ begin perform preparer_messages_anomalie(new.id); return new; end; $$;
create trigger anomalies_notifier_parents after insert on public.anomalies for each row execute function public.notifier_parents_apres_anomalie();

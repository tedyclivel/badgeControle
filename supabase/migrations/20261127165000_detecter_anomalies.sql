-- Détection centralisée des anomalies de passage.
create function public.detecter_anomalies_passage() returns trigger language plpgsql set search_path=public as $$
declare jour_local date := (new.effective_time at time zone 'Africa/Douala')::date; heure_locale time := (new.effective_time at time zone 'Africa/Douala')::time; fenetre public.time_windows%rowtype;
begin
  if new.validation_status <> 'ACCEPTED' then return new; end if;
  select w.* into fenetre from itineraries i join time_windows w on w.itinerary_id=i.id where i.student_id=new.student_id and i.active and jour_local between i.valid_from and coalesce(i.valid_until,'infinity'::date) and extract(isodow from jour_local)::smallint=any(w.weekdays) and w.checkpoint_id=new.checkpoint_id limit 1;
  if fenetre.id is null then insert into anomalies(school_id,student_id,passage_id,day,type,dedup_key) values(new.school_id,new.student_id,new.id,jour_local,'UNEXPECTED_CHECKPOINT','unexpected:'||new.id) on conflict do nothing;
  elsif heure_locale < fenetre.starts_at or heure_locale > fenetre.ends_at then insert into anomalies(school_id,student_id,passage_id,time_window_id,day,type,dedup_key) values(new.school_id,new.student_id,new.id,fenetre.id,jour_local,'OUTSIDE_WINDOW','outside:'||new.id) on conflict do nothing; end if;
  if exists(select 1 from passages p where p.badge_id=new.badge_id and p.id<>new.id and p.validation_status='ACCEPTED' and abs(extract(epoch from p.local_time-new.local_time))<60) then insert into anomalies(school_id,student_id,passage_id,day,type,dedup_key) values(new.school_id,new.student_id,new.id,jour_local,'DUPLICATE_SCAN','duplicate:'||new.id) on conflict do nothing; end if;
  if new.clock_status='UNRELIABLE' then insert into anomalies(school_id,student_id,passage_id,day,type,dedup_key) values(new.school_id,new.student_id,new.id,jour_local,'UNRELIABLE_CLOCK','clock:'||new.id) on conflict do nothing; end if;
  return new;
end; $$;
create trigger passages_detecter_anomalies after insert on public.passages for each row execute function public.detecter_anomalies_passage();

create function public.detecter_passages_manquants(moment_detection timestamptz default now()) returns integer language plpgsql set search_path=public as $$
declare nombre integer;
begin
 with candidats as (select i.school_id,i.student_id,w.id fenetre_id,(moment_detection at time zone s.timezone)::date jour from itineraries i join time_windows w on w.itinerary_id=i.id join schools s on s.id=i.school_id where i.active and (moment_detection at time zone s.timezone)::date between i.valid_from and coalesce(i.valid_until,'infinity'::date) and extract(isodow from moment_detection at time zone s.timezone)::smallint=any(w.weekdays) and (moment_detection at time zone s.timezone)::time>=w.ends_at), ins as (insert into anomalies(school_id,student_id,time_window_id,day,type,dedup_key) select c.school_id,c.student_id,c.fenetre_id,c.jour,'MISSING','missing:'||c.student_id||':'||c.fenetre_id||':'||c.jour from candidats c where not exists(select 1 from schedule_exceptions e where e.school_id=c.school_id and e.day=c.jour and (e.student_id is null or e.student_id=c.student_id)) and not exists(select 1 from passages p join time_windows w on w.id=c.fenetre_id where p.student_id=c.student_id and p.checkpoint_id=w.checkpoint_id and p.validation_status='ACCEPTED' and (p.effective_time at time zone 'Africa/Douala')::date=c.jour) on conflict(school_id,dedup_key) do nothing returning id) select count(*) into nombre from ins; return nombre;
end; $$;

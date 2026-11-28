-- Lecture métier : les parents reçoivent des projections sûres plutôt qu'un
-- accès direct aux preuves cryptographiques des passages.

grant select on public.devices, public.badges, public.qr_codes, public.qr_attempts,
  public.passages, public.schedule_exceptions, public.anomalies, public.outgoing_messages,
  public.daily_summaries, public.ai_call_logs, public.ai_budgets, public.audit_logs to authenticated;

create policy "responsables lisent les appareils de leur établissement" on public.devices for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "agents lisent leurs appareils actifs" on public.devices for select to authenticated using (agent_id = auth.uid() and active);

create policy "responsables lisent les badges de leur établissement" on public.badges for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les QR de leur établissement" on public.qr_codes for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les tentatives QR de leur établissement" on public.qr_attempts for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les passages de leur établissement" on public.passages for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les exceptions de leur établissement" on public.schedule_exceptions for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les anomalies de leur établissement" on public.anomalies for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les messages de leur établissement" on public.outgoing_messages for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les synthèses de leur établissement" on public.daily_summaries for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les journaux IA de leur établissement" on public.ai_call_logs for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent les budgets IA de leur établissement" on public.ai_budgets for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));
create policy "responsables lisent l'audit de leur établissement" on public.audit_logs for select to authenticated using (public.current_user_has_role_in_school('MANAGER', school_id));

create view public.parent_passages
with (security_invoker = false)
as select id, student_id, checkpoint_id, local_time, server_received_at, effective_time, clock_status, validation_status
from public.passages
where public.current_user_is_parent_of(student_id);

create view public.parent_anomalies
with (security_invoker = false)
as select id, student_id, passage_id, time_window_id, day, type, status, detected_at, resolved_at
from public.anomalies
where public.current_user_is_parent_of(student_id);

revoke all on public.parent_passages, public.parent_anomalies from anon;
grant select on public.parent_passages, public.parent_anomalies to authenticated;

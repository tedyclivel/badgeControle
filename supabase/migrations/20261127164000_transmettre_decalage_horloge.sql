create or replace function public.synchroniser_passage_serveur(
  p_identifiant_evenement_local uuid, p_identifiant_code_qr uuid,
  p_identifiant_appareil uuid, p_identifiant_point_controle uuid,
  p_identifiant_agent uuid, p_heure_locale timestamptz,
  p_reference_serveur timestamptz, p_decalage_horloge_secondes integer
)
returns public.resultat_synchronisation
language plpgsql
security definer
set search_path = public
as $$
declare resultat public.resultat_synchronisation;
begin
  resultat := public.synchroniser_passage_serveur(p_identifiant_evenement_local, p_identifiant_code_qr, p_identifiant_appareil, p_identifiant_point_controle, p_identifiant_agent, p_heure_locale);
  update public.passages
  set reference_serveur = p_reference_serveur,
      decalage_horloge_secondes = p_decalage_horloge_secondes
  where appareil_id = p_identifiant_appareil
    and identifiant_evenement_local = p_identifiant_evenement_local;
  return resultat;
end;
$$;

create trigger passages_verifier_horloge_modification
before update of decalage_horloge_secondes on public.passages
for each row execute function public.verifier_horloge_passage();

create trigger passages_enregistrer_anomalie_horloge_modification
after update of resultat_synchronisation on public.passages
for each row execute function public.enregistrer_anomalie_horloge();

revoke all on function public.synchroniser_passage_serveur(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.synchroniser_passage_serveur(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer) to service_role;

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  extraireClePublique,
  importerClePublique,
  verifierSignatureCodeQr,
  type DonneesCodeQr,
} from '../partage/cryptographie_qr.ts';

interface EvenementSynchronisation {
  readonly identifiantEvenementLocal: string;
  readonly identifiantCodeQr: string;
  readonly identifiantBadge: string;
  readonly identifiantEcole: string;
  readonly identifiantAppareil: string;
  readonly identifiantPointControle: string;
  readonly heureLocale: string;
  readonly donneesSignees: DonneesCodeQr;
  readonly signatureBase64: string;
}

const entetesCors = {
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-origin': '*',
};

function reponseJson(corps: unknown, statut = 200): Response {
  return Response.json(corps, { status: statut, headers: entetesCors });
}

function lireVariableObligatoire(nom: string): string {
  const valeur = Deno.env.get(nom);
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return valeur;
}

function extraireJeton(autorisation: string | null): string | null {
  return autorisation?.startsWith('Bearer ') ? autorisation.slice(7) : null;
}

function evenementEstCoherent(evenement: EvenementSynchronisation): boolean {
  const donnees = evenement.donneesSignees;
  return donnees?.version === 1
    && donnees.identifiantCodeQr === evenement.identifiantCodeQr
    && donnees.identifiantBadge === evenement.identifiantBadge
    && donnees.identifiantEcole === evenement.identifiantEcole
    && typeof evenement.signatureBase64 === 'string'
    && Number.isFinite(Date.parse(evenement.heureLocale));
}

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response(null, { headers: entetesCors });
  if (requete.method !== 'POST') return reponseJson({ erreur: 'Méthode non autorisée' }, 405);

  try {
    const urlSupabase = lireVariableObligatoire('SUPABASE_URL');
    const clePubliqueSupabase = lireVariableObligatoire('SUPABASE_ANON_KEY');
    const cleServiceSupabase = lireVariableObligatoire('SUPABASE_SERVICE_ROLE_KEY');
    const clePriveeJwk = JSON.parse(lireVariableObligatoire('CLE_PRIVEE_QR_JWK')) as JsonWebKey;
    const jeton = extraireJeton(requete.headers.get('authorization'));
    if (!jeton) return reponseJson({ erreur: 'Jeton d authentification manquant' }, 401);

    const clientAuthentification = createClient(urlSupabase, clePubliqueSupabase);
    const { data: donneesUtilisateur, error: erreurUtilisateur } = await clientAuthentification.auth.getUser(jeton);
    if (erreurUtilisateur || !donneesUtilisateur.user) return reponseJson({ erreur: 'Jeton invalide' }, 401);

    const demande = await requete.json() as { evenements?: unknown };
    if (!Array.isArray(demande.evenements) || demande.evenements.length === 0 || demande.evenements.length > 100) {
      return reponseJson({ erreur: 'evenements doit contenir entre 1 et 100 éléments' }, 400);
    }

    const clientServeur = createClient(urlSupabase, cleServiceSupabase);
    const { data: profil, error: erreurProfil } = await clientServeur
      .from('profiles')
      .select('school_id, role, active')
      .eq('id', donneesUtilisateur.user.id)
      .maybeSingle();
    if (erreurProfil || !profil || !profil.active || profil.role !== 'AGENT') {
      return reponseJson({ erreur: 'Action réservée à un agent actif' }, 403);
    }

    const clePublique = await importerClePublique(extraireClePublique(clePriveeJwk));
    const resultats = [];

    for (const valeur of demande.evenements) {
      const evenement = valeur as EvenementSynchronisation;
      if (!evenementEstCoherent(evenement)) {
        resultats.push({ identifiantEvenementLocal: evenement?.identifiantEvenementLocal, resultat: 'FORMAT_INVALIDE' });
        continue;
      }

      const signatureValide = await verifierSignatureCodeQr(evenement.donneesSignees, evenement.signatureBase64, clePublique);
      if (!signatureValide) {
        resultats.push({ identifiantEvenementLocal: evenement.identifiantEvenementLocal, resultat: 'SIGNATURE_INVALIDE' });
        continue;
      }

      const { data: codeEnregistre, error: erreurCode } = await clientServeur
        .from('codes_qr_dynamiques')
        .select('id, ecole_id, badge_id, donnees_signees, signature_base64')
        .eq('id', evenement.identifiantCodeQr)
        .maybeSingle();
      if (erreurCode || !codeEnregistre
        || codeEnregistre.ecole_id !== profil.school_id
        || codeEnregistre.badge_id !== evenement.identifiantBadge
        || codeEnregistre.signature_base64 !== evenement.signatureBase64
        || JSON.stringify(codeEnregistre.donnees_signees) !== JSON.stringify(evenement.donneesSignees)) {
        resultats.push({ identifiantEvenementLocal: evenement.identifiantEvenementLocal, resultat: 'CODE_INCOHERENT' });
        continue;
      }

      const { data: resultat, error: erreurSynchronisation } = await clientServeur.rpc('synchroniser_passage_serveur', {
        p_identifiant_evenement_local: evenement.identifiantEvenementLocal,
        p_identifiant_code_qr: evenement.identifiantCodeQr,
        p_identifiant_appareil: evenement.identifiantAppareil,
        p_identifiant_point_controle: evenement.identifiantPointControle,
        p_identifiant_agent: donneesUtilisateur.user.id,
        p_heure_locale: evenement.heureLocale,
      });
      resultats.push({
        identifiantEvenementLocal: evenement.identifiantEvenementLocal,
        resultat: erreurSynchronisation ? 'ERREUR_SERVEUR' : resultat,
      });
    }

    return reponseJson({ resultats });
  } catch (erreur) {
    console.error('Erreur de synchronisation des passages', erreur);
    return reponseJson({ erreur: 'Impossible de synchroniser les passages' }, 500);
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  extraireClePublique,
  importerClePrivee,
  signerDonneesCodeQr,
  type DonneesCodeQr,
} from '../partage/cryptographie_qr.ts';

const dureeCodeQrMillisecondes = 5 * 60 * 1000;
const quantiteMaximum = 288;
const entetesCors = {
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-origin': '*',
};

function reponseJson(corps: unknown, statut = 200): Response {
  return Response.json(corps, {
    status: statut,
    headers: entetesCors,
  });
}

function lireVariableObligatoire(nom: string): string {
  const valeur = Deno.env.get(nom);
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return valeur;
}

function extraireJeton(autorisation: string | null): string | null {
  if (!autorisation?.startsWith('Bearer ')) return null;
  return autorisation.slice('Bearer '.length);
}

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response(null, { headers: entetesCors });
  if (requete.method !== 'POST') return reponseJson({ erreur: 'Méthode non autorisée' }, 405);

  try {
    const urlSupabase = lireVariableObligatoire('SUPABASE_URL');
    const clePubliqueSupabase = lireVariableObligatoire('SUPABASE_ANON_KEY');
    const cleServiceSupabase = lireVariableObligatoire('SUPABASE_SERVICE_ROLE_KEY');
    const valeurClePrivee = lireVariableObligatoire('CLE_PRIVEE_QR_JWK');
    const jeton = extraireJeton(requete.headers.get('authorization'));
    if (!jeton) return reponseJson({ erreur: 'Jeton d authentification manquant' }, 401);

    const clientAuthentification = createClient(urlSupabase, clePubliqueSupabase);
    const { data: donneesUtilisateur, error: erreurUtilisateur } = await clientAuthentification.auth.getUser(jeton);
    if (erreurUtilisateur || !donneesUtilisateur.user) return reponseJson({ erreur: 'Jeton invalide' }, 401);

    const clientServeur = createClient(urlSupabase, cleServiceSupabase);
    const demande = await requete.json() as { identifiantBadge?: unknown; quantite?: unknown };
    if (typeof demande.identifiantBadge !== 'string') {
      return reponseJson({ erreur: 'identifiantBadge est obligatoire' }, 400);
    }

    const quantite = demande.quantite === undefined ? 12 : Number(demande.quantite);
    if (!Number.isInteger(quantite) || quantite < 1 || quantite > quantiteMaximum) {
      return reponseJson({ erreur: `quantite doit être un entier entre 1 et ${quantiteMaximum}` }, 400);
    }

    const { data: profil, error: erreurProfil } = await clientServeur
      .from('profiles')
      .select('school_id, role, active')
      .eq('id', donneesUtilisateur.user.id)
      .maybeSingle();
    if (erreurProfil || !profil || !profil.active || profil.role !== 'MANAGER') {
      return reponseJson({ erreur: 'Action réservée au responsable actif' }, 403);
    }

    const { data: badge, error: erreurBadge } = await clientServeur
      .from('badges')
      .select('id, ecole_id, etat')
      .eq('id', demande.identifiantBadge)
      .maybeSingle();
    if (erreurBadge || !badge || badge.ecole_id !== profil.school_id || badge.etat !== 'ACTIF') {
      return reponseJson({ erreur: 'Badge actif introuvable dans votre établissement' }, 404);
    }

    const clePriveeJwk = JSON.parse(valeurClePrivee) as JsonWebKey;
    const clePrivee = await importerClePrivee(clePriveeJwk);
    const debutPremierCode = Math.floor(Date.now() / dureeCodeQrMillisecondes) * dureeCodeQrMillisecondes;
    const codes = await Promise.all(Array.from({ length: quantite }, async (_, index) => {
      const debut = new Date(debutPremierCode + index * dureeCodeQrMillisecondes);
      const fin = new Date(debut.getTime() + dureeCodeQrMillisecondes);
      const donnees: DonneesCodeQr = {
        version: 1,
        identifiantCodeQr: crypto.randomUUID(),
        identifiantBadge: badge.id,
        identifiantEcole: badge.ecole_id,
        numeroSequence: Math.floor(debut.getTime() / dureeCodeQrMillisecondes),
        valableDepuis: debut.toISOString(),
        valableJusqua: fin.toISOString(),
      };

      return {
        id: donnees.identifiantCodeQr,
        ecole_id: badge.ecole_id,
        badge_id: badge.id,
        numero_sequence: donnees.numeroSequence,
        donnees_signees: donnees,
        signature_base64: await signerDonneesCodeQr(donnees, clePrivee),
        valable_depuis: donnees.valableDepuis,
        valable_jusqu_a: donnees.valableJusqua,
      };
    }));

    const { error: erreurInsertion } = await clientServeur
      .from('codes_qr_dynamiques')
      .upsert(codes, { onConflict: 'badge_id,numero_sequence', ignoreDuplicates: true });
    if (erreurInsertion) throw erreurInsertion;

    const numerosSequences = codes.map((code) => code.numero_sequence);
    const { data: codesEnregistres, error: erreurLecture } = await clientServeur
      .from('codes_qr_dynamiques')
      .select('id, donnees_signees, signature_base64, valable_depuis, valable_jusqu_a, etat')
      .eq('badge_id', badge.id)
      .in('numero_sequence', numerosSequences)
      .order('numero_sequence');
    if (erreurLecture) throw erreurLecture;

    return reponseJson({
      algorithme: 'ECDSA P-256 SHA-256',
      clePublique: extraireClePublique(clePriveeJwk),
      codes: codesEnregistres,
    });
  } catch (erreur) {
    console.error('Erreur de génération des codes QR', erreur);
    return reponseJson({ erreur: 'Impossible de générer les codes QR' }, 500);
  }
});

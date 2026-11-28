import {
  importerClePublique,
  verifierSignatureCodeQr,
  type DonneesCodeQr,
} from '../../../../../supabase/functions/partage/cryptographie_qr.ts'
import type {
  CodeQrSigne,
  DepotLocalAgent,
  PassageLocal,
  ResultatValidationLocale,
} from './types.ts'

function estDonneeCodeQrValide(donnees: unknown): donnees is DonneesCodeQr {
  if (!donnees || typeof donnees !== 'object') return false

  const valeur = donnees as Record<string, unknown>
  return valeur.version === 1
    && typeof valeur.identifiantCodeQr === 'string'
    && typeof valeur.identifiantBadge === 'string'
    && typeof valeur.identifiantEcole === 'string'
    && typeof valeur.numeroSequence === 'number'
    && typeof valeur.valableDepuis === 'string'
    && typeof valeur.valableJusqua === 'string'
}

export async function validerCodeQrHorsLigne(
  codeQr: CodeQrSigne,
  passage: PassageLocal,
  depot: DepotLocalAgent,
  maintenant = new Date(),
): Promise<ResultatValidationLocale> {
  if (!estDonneeCodeQrValide(codeQr.donnees) || typeof codeQr.signatureBase64 !== 'string') {
    return { accepte: false, motif: 'FORMAT_INVALIDE' }
  }

  const donnees = codeQr.donnees
  if (donnees.identifiantCodeQr !== passage.identifiantCodeQr
    || donnees.identifiantBadge !== passage.identifiantBadge
    || donnees.identifiantEcole !== passage.identifiantEcole) {
    return { accepte: false, motif: 'ECOLE_INCORRECTE' }
  }

  const clePubliqueJwk = await depot.obtenirClePublique(donnees.identifiantEcole)
  if (!clePubliqueJwk) return { accepte: false, motif: 'CLE_PUBLIQUE_ABSENTE' }

  try {
    const clePublique = await importerClePublique(clePubliqueJwk)
    const signatureValide = await verifierSignatureCodeQr(donnees, codeQr.signatureBase64, clePublique)
    if (!signatureValide) return { accepte: false, motif: 'SIGNATURE_INVALIDE' }
  } catch {
    return { accepte: false, motif: 'SIGNATURE_INVALIDE' }
  }

  const debut = Date.parse(donnees.valableDepuis)
  const fin = Date.parse(donnees.valableJusqua)
  if (!Number.isFinite(debut) || !Number.isFinite(fin)) return { accepte: false, motif: 'FORMAT_INVALIDE' }
  if (maintenant.getTime() < debut) return { accepte: false, motif: 'PAS_ENCORE_VALIDE' }
  if (maintenant.getTime() >= fin) return { accepte: false, motif: 'EXPIRE' }

  if (await depot.badgeEstRevoque(donnees.identifiantBadge)) {
    return { accepte: false, motif: 'BADGE_REVOQUE' }
  }

  return depot.consommerCodeEtEnregistrerPassage({ ...passage, donneesSignees: donnees, signatureBase64: codeQr.signatureBase64 })
}

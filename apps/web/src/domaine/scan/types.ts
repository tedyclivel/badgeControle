import type { DonneesCodeQr } from '../../../../../supabase/functions/partage/cryptographie_qr.ts'

export interface CodeQrSigne {
  readonly donnees: DonneesCodeQr
  readonly signatureBase64: string
}

export interface PassageLocal {
  readonly identifiantCodeQr: string
  readonly identifiantBadge: string
  readonly identifiantEcole: string
  readonly identifiantAppareil: string
  readonly identifiantPointControle: string
  readonly heureLocale: string
}

export interface EvenementPassageEnAttente extends PassageLocal {
  readonly identifiantEvenementLocal: string
  readonly creeLe: string
  readonly etatSynchronisation: 'EN_ATTENTE'
}

export type MotifRefusLocal =
  | 'FORMAT_INVALIDE'
  | 'ECOLE_INCORRECTE'
  | 'CLE_PUBLIQUE_ABSENTE'
  | 'SIGNATURE_INVALIDE'
  | 'PAS_ENCORE_VALIDE'
  | 'EXPIRE'
  | 'BADGE_REVOQUE'
  | 'CODE_QR_DEJA_CONSOMME'

export type ResultatValidationLocale =
  | { readonly accepte: true; readonly evenement: EvenementPassageEnAttente }
  | { readonly accepte: false; readonly motif: MotifRefusLocal }

export interface DepotLocalAgent {
  obtenirClePublique(identifiantEcole: string): Promise<JsonWebKey | undefined>
  badgeEstRevoque(identifiantBadge: string): Promise<boolean>
  consommerCodeEtEnregistrerPassage(passage: PassageLocal): Promise<ResultatValidationLocale>
}

import type { EvenementPassageEnAttente } from '../../../domaine/scan/types.ts'

export type ResultatServeurPassage =
  | 'ACCEPTED'
  | 'ALREADY_SYNCED'
  | 'QR_ALREADY_CONSUMED'
  | 'QR_EXPIRED'
  | 'BADGE_INACTIVE'
  | 'DEVICE_UNAUTHORIZED'
  | 'CHECKPOINT_INVALID'
  | 'QR_NOT_FOUND'
  | 'CODE_INCOHERENT'
  | 'FORMAT_INVALIDE'
  | 'SIGNATURE_INVALIDE'
  | 'ERREUR_SERVEUR'

export interface ReponseSynchronisation {
  readonly identifiantEvenementLocal: string
  readonly resultat: ResultatServeurPassage
}

export interface FileLocalePassages {
  listerPassagesEnAttente(): Promise<readonly EvenementPassageEnAttente[]>
  confirmerPassagesSynchronises(identifiantsEvenements: readonly string[]): Promise<void>
  marquerPassagesRejetes(rejets: ReadonlyMap<string, string>): Promise<void>
}

export interface PasserelleSynchronisation {
  envoyer(evenements: readonly EvenementPassageEnAttente[]): Promise<readonly ReponseSynchronisation[]>
}

export interface BilanSynchronisation {
  readonly aEnvoyer: number
  readonly confirmes: number
  readonly rejetes: number
  readonly aReessayer: number
}

const RESULTATS_CONFIRMES = new Set<ResultatServeurPassage>(['ACCEPTED', 'ALREADY_SYNCED'])
const RESULTATS_TEMPORAIRES = new Set<ResultatServeurPassage>(['ERREUR_SERVEUR'])

/**
 * Synchronise une seule page de la file locale. Les erreurs réseau restent dans
 * IndexedDB afin d'être renvoyées au prochain retour en ligne.
 */
export async function synchroniserPassagesEnAttente(
  file: FileLocalePassages,
  passerelle: PasserelleSynchronisation,
): Promise<BilanSynchronisation> {
  const evenements = await file.listerPassagesEnAttente()
  if (!evenements.length) return { aEnvoyer: 0, confirmes: 0, rejetes: 0, aReessayer: 0 }

  const resultats = await passerelle.envoyer(evenements)
  const attendus = new Set(evenements.map((evenement) => evenement.identifiantEvenementLocal))
  const confirmes: string[] = []
  const rejets = new Map<string, string>()

  for (const reponse of resultats) {
    if (!attendus.has(reponse.identifiantEvenementLocal)) continue
    if (RESULTATS_CONFIRMES.has(reponse.resultat)) confirmes.push(reponse.identifiantEvenementLocal)
    else if (!RESULTATS_TEMPORAIRES.has(reponse.resultat)) rejets.set(reponse.identifiantEvenementLocal, reponse.resultat)
  }

  if (confirmes.length) await file.confirmerPassagesSynchronises(confirmes)
  if (rejets.size) await file.marquerPassagesRejetes(rejets)

  return {
    aEnvoyer: evenements.length,
    confirmes: confirmes.length,
    rejetes: rejets.size,
    aReessayer: evenements.length - confirmes.length - rejets.size,
  }
}

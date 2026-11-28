import Dexie, { type Table } from 'dexie'
import type {
  DepotLocalAgent,
  EvenementPassageEnAttente,
  PassageLocalVerifie,
  ResultatValidationLocale,
} from '../../domaine/scan/types.ts'

interface ClePubliqueLocale {
  readonly identifiantEcole: string
  readonly cleJwk: JsonWebKey
  readonly recupereeLe: string
}

interface BadgeRevoqueLocal {
  readonly identifiantBadge: string
  readonly revoqueLe: string
}

interface CodeQrConsommeLocal {
  readonly identifiantCodeQr: string
  readonly consommeLe: string
}

export interface TentativeLocale {
  readonly id: string
  readonly identifiantCodeQr: string
  readonly identifiantBadge: string
  readonly identifiantAppareil: string
  readonly identifiantPointControle: string
  readonly resultat: 'ACCEPTE' | 'DEJA_CONSOMME'
  readonly tenteLe: string
}

interface AnomalieLocale {
  readonly id: string
  readonly type: 'CODE_QR_REUTILISE'
  readonly identifiantCodeQr: string
  readonly identifiantBadge: string
  readonly identifiantAppareil: string
  readonly identifiantPointControle: string
  readonly detecteeLe: string
  readonly etatSynchronisation: 'EN_ATTENTE'
}

export class BaseLocaleAgent extends Dexie implements DepotLocalAgent {
  readonly clesPubliques!: Table<ClePubliqueLocale, string>
  readonly badgesRevoques!: Table<BadgeRevoqueLocal, string>
  readonly codesQrConsommes!: Table<CodeQrConsommeLocal, string>
  readonly passagesEnAttente!: Table<EvenementPassageEnAttente, string>
  readonly tentatives!: Table<TentativeLocale, string>
  readonly anomalies!: Table<AnomalieLocale, string>

  constructor() {
    super('passage-agent')
    this.version(1).stores({
      clesPubliques: 'identifiantEcole, recupereeLe',
      badgesRevoques: 'identifiantBadge, revoqueLe',
      codesQrConsommes: 'identifiantCodeQr, consommeLe',
      passagesEnAttente: 'identifiantEvenementLocal, etatSynchronisation, creeLe',
      tentatives: 'id, identifiantCodeQr, tenteLe',
      anomalies: 'id, type, identifiantCodeQr, etatSynchronisation',
    })
  }

  async memoriserClePublique(identifiantEcole: string, cleJwk: JsonWebKey): Promise<void> {
    await this.clesPubliques.put({ identifiantEcole, cleJwk, recupereeLe: new Date().toISOString() })
  }

  async memoriserRevocations(identifiantsBadges: readonly string[]): Promise<void> {
    const revoqueLe = new Date().toISOString()
    await this.badgesRevoques.bulkPut(identifiantsBadges.map((identifiantBadge) => ({ identifiantBadge, revoqueLe })))
  }

  async obtenirClePublique(identifiantEcole: string): Promise<JsonWebKey | undefined> {
    return (await this.clesPubliques.get(identifiantEcole))?.cleJwk
  }

  async badgeEstRevoque(identifiantBadge: string): Promise<boolean> {
    return (await this.badgesRevoques.get(identifiantBadge)) !== undefined
  }

  async consommerCodeEtEnregistrerPassage(passage: PassageLocalVerifie): Promise<ResultatValidationLocale> {
    return this.transaction(
      'rw',
      this.codesQrConsommes,
      this.passagesEnAttente,
      this.tentatives,
      this.anomalies,
      async () => {
        const maintenant = new Date().toISOString()
        const codeDejaConsomme = await this.codesQrConsommes.get(passage.identifiantCodeQr)

        if (codeDejaConsomme) {
          await this.tentatives.add({
            id: crypto.randomUUID(),
            ...passage,
            resultat: 'DEJA_CONSOMME',
            tenteLe: maintenant,
          })
          await this.anomalies.add({
            id: crypto.randomUUID(),
            type: 'CODE_QR_REUTILISE',
            ...passage,
            detecteeLe: maintenant,
            etatSynchronisation: 'EN_ATTENTE',
          })
          return { accepte: false, motif: 'CODE_QR_DEJA_CONSOMME' }
        }

        const evenement: EvenementPassageEnAttente = {
          ...passage,
          identifiantEvenementLocal: crypto.randomUUID(),
          creeLe: maintenant,
          etatSynchronisation: 'EN_ATTENTE',
        }
        await this.codesQrConsommes.add({ identifiantCodeQr: passage.identifiantCodeQr, consommeLe: maintenant })
        await this.passagesEnAttente.add(evenement)
        await this.tentatives.add({
          id: crypto.randomUUID(),
          ...passage,
          resultat: 'ACCEPTE',
          tenteLe: maintenant,
        })
        return { accepte: true, evenement }
      },
    )
  }

  async listerPassagesEnAttente(): Promise<readonly EvenementPassageEnAttente[]> {
    return this.passagesEnAttente.where('etatSynchronisation').equals('EN_ATTENTE').sortBy('creeLe')
  }

  async confirmerPassagesSynchronises(identifiantsEvenements: readonly string[]): Promise<void> {
    await this.passagesEnAttente.bulkDelete([...identifiantsEvenements])
  }

  async marquerPassagesRejetes(rejets: ReadonlyMap<string, string>): Promise<void> {
    await this.transaction('rw', this.passagesEnAttente, async () => {
      for (const [identifiantEvenementLocal, motifRejetSynchronisation] of rejets) {
        await this.passagesEnAttente.update(identifiantEvenementLocal, {
          etatSynchronisation: 'REJETE',
          motifRejetSynchronisation,
        })
      }
    })
  }

  async listerDernieresTentatives(limite = 8): Promise<readonly TentativeLocale[]> {
    return this.tentatives.orderBy('tenteLe').reverse().limit(limite).toArray()
  }
}

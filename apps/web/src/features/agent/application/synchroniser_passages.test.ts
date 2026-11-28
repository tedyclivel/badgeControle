import { describe, expect, it } from 'vitest'
import type { EvenementPassageEnAttente } from '../../../domaine/scan/types.ts'
import { synchroniserPassagesEnAttente, type FileLocalePassages } from './synchroniser_passages.ts'

function evenement(id: string): EvenementPassageEnAttente {
  return {
    identifiantEvenementLocal: id,
    identifiantCodeQr: 'qr', identifiantBadge: 'badge', identifiantEcole: 'ecole',
    identifiantAppareil: 'appareil', identifiantPointControle: 'point',
    heureLocale: '2026-11-28T12:00:00.000Z', decalageHorlogeSecondes: null,
    donneesSignees: { version: 1, identifiantCodeQr: 'qr', identifiantBadge: 'badge', identifiantEcole: 'ecole', numeroSequence: 1, valableDepuis: '2026-11-28T11:00:00.000Z', valableJusqua: '2026-11-28T13:00:00.000Z' },
    signatureBase64: 'signature', creeLe: '2026-11-28T12:00:00.000Z', etatSynchronisation: 'EN_ATTENTE',
  }
}

class FileMemoire implements FileLocalePassages {
  readonly confirmes: string[] = []
  readonly rejetes = new Map<string, string>()
  private readonly evenements: readonly EvenementPassageEnAttente[]

  constructor(evenements: readonly EvenementPassageEnAttente[]) {
    this.evenements = evenements
  }
  async listerPassagesEnAttente() { return this.evenements }
  async confirmerPassagesSynchronises(ids: readonly string[]) { this.confirmes.push(...ids) }
  async marquerPassagesRejetes(rejets: ReadonlyMap<string, string>) { rejets.forEach((motif, id) => this.rejetes.set(id, motif)) }
}

describe('synchroniserPassagesEnAttente', () => {
  it('supprime seulement les événements confirmés et marque les refus métier', async () => {
    const file = new FileMemoire([evenement('11111111-1111-4111-8111-111111111111'), evenement('22222222-2222-4222-8222-222222222222')])
    const bilan = await synchroniserPassagesEnAttente(file, { envoyer: async () => [
      { identifiantEvenementLocal: '11111111-1111-4111-8111-111111111111', resultat: 'ACCEPTED' },
      { identifiantEvenementLocal: '22222222-2222-4222-8222-222222222222', resultat: 'BADGE_INACTIVE' },
    ] })
    expect(file.confirmes).toEqual(['11111111-1111-4111-8111-111111111111'])
    expect(file.rejetes.get('22222222-2222-4222-8222-222222222222')).toBe('BADGE_INACTIVE')
    expect(bilan).toEqual({ aEnvoyer: 2, confirmes: 1, rejetes: 1, aReessayer: 0 })
  })

  it('conserve les événements non traités pour une nouvelle tentative', async () => {
    const file = new FileMemoire([evenement('11111111-1111-4111-8111-111111111111')])
    const bilan = await synchroniserPassagesEnAttente(file, { envoyer: async () => [
      { identifiantEvenementLocal: '11111111-1111-4111-8111-111111111111', resultat: 'ERREUR_SERVEUR' },
    ] })
    expect(file.confirmes).toEqual([])
    expect(file.rejetes.size).toBe(0)
    expect(bilan.aReessayer).toBe(1)
  })
})

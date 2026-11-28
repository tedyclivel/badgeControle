import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { BaseLocaleAgent } from './base_locale_agent.ts'

const passage = {
  identifiantCodeQr: 'code-opaque',
  identifiantBadge: 'badge-opaque',
  identifiantEcole: 'ecole-opaque',
  identifiantAppareil: 'appareil-opaque',
  identifiantPointControle: 'point-opaque',
  heureLocale: '2026-11-27T08:01:00.000Z',
  donneesSignees: {
    version: 1 as const,
    identifiantCodeQr: 'code-opaque',
    identifiantBadge: 'badge-opaque',
    identifiantEcole: 'ecole-opaque',
    numeroSequence: 1,
    valableDepuis: '2026-11-27T08:00:00.000Z',
    valableJusqua: '2026-11-27T08:05:00.000Z',
  },
  signatureBase64: 'signature-de-test',
}

afterEach(async () => {
  await BaseLocaleAgent.delete('passage-agent')
})

describe('BaseLocaleAgent', () => {
  it('conserve un passage accepté après la réouverture de la base locale', async () => {
    const premiereBase = new BaseLocaleAgent()
    const resultat = await premiereBase.consommerCodeEtEnregistrerPassage(passage)
    premiereBase.close()

    const secondeBase = new BaseLocaleAgent()
    const passages = await secondeBase.passagesEnAttente.toArray()
    const tentatives = await secondeBase.tentatives.toArray()
    secondeBase.close()

    expect(resultat.accepte).toBe(true)
    expect(passages).toHaveLength(1)
    expect(passages[0]?.identifiantCodeQr).toBe(passage.identifiantCodeQr)
    expect(tentatives).toHaveLength(1)
    expect(tentatives[0]?.resultat).toBe('ACCEPTE')
  })

  it('refuse le second scan et mémorise une anomalie locale', async () => {
    const base = new BaseLocaleAgent()
    await base.consommerCodeEtEnregistrerPassage(passage)
    const resultat = await base.consommerCodeEtEnregistrerPassage(passage)
    const passages = await base.passagesEnAttente.toArray()
    const anomalies = await base.anomalies.toArray()
    base.close()

    expect(resultat).toEqual({ accepte: false, motif: 'CODE_QR_DEJA_CONSOMME' })
    expect(passages).toHaveLength(1)
    expect(anomalies).toHaveLength(1)
    expect(anomalies[0]?.type).toBe('CODE_QR_REUTILISE')
  })
})

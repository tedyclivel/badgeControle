import { describe, expect, it } from 'vitest'
import {
  importerClePrivee,
  signerDonneesCodeQr,
  type DonneesCodeQr,
} from '../../../../../supabase/functions/partage/cryptographie_qr.ts'
import { validerCodeQrHorsLigne } from './valider_code_qr_hors_ligne.ts'
import type {
  DepotLocalAgent,
  PassageLocal,
  PassageLocalVerifie,
  ResultatValidationLocale,
} from './types.ts'

class DepotMemoire implements DepotLocalAgent {
  private readonly cles = new Map<string, JsonWebKey>()
  private readonly badgesRevoques = new Set<string>()
  private readonly codesConsommes = new Set<string>()

  memoriserCle(identifiantEcole: string, cle: JsonWebKey): void {
    this.cles.set(identifiantEcole, cle)
  }

  revoquerBadge(identifiantBadge: string): void {
    this.badgesRevoques.add(identifiantBadge)
  }

  async obtenirClePublique(identifiantEcole: string): Promise<JsonWebKey | undefined> {
    return this.cles.get(identifiantEcole)
  }

  async badgeEstRevoque(identifiantBadge: string): Promise<boolean> {
    return this.badgesRevoques.has(identifiantBadge)
  }

  async consommerCodeEtEnregistrerPassage(passage: PassageLocal): Promise<ResultatValidationLocale> {
  async consommerCodeEtEnregistrerPassage(passage: PassageLocalVerifie): Promise<ResultatValidationLocale> {
    if (this.codesConsommes.has(passage.identifiantCodeQr)) {
      return { accepte: false, motif: 'CODE_QR_DEJA_CONSOMME' }
    }

    this.codesConsommes.add(passage.identifiantCodeQr)
    return {
      accepte: true,
      evenement: {
        ...passage,
        identifiantEvenementLocal: 'evenement-local',
        creeLe: '2026-11-27T08:01:00.000Z',
        etatSynchronisation: 'EN_ATTENTE',
      },
    }
  }
}

const passage: PassageLocal = {
  identifiantCodeQr: 'code-opaque',
  identifiantBadge: 'badge-opaque',
  identifiantEcole: 'ecole-opaque',
  identifiantAppareil: 'appareil-opaque',
  identifiantPointControle: 'point-opaque',
  heureLocale: '2026-11-27T08:01:00.000Z',
  decalageHorlogeSecondes: 120,
}

const donnees: DonneesCodeQr = {
  version: 1,
  identifiantCodeQr: passage.identifiantCodeQr,
  identifiantBadge: passage.identifiantBadge,
  identifiantEcole: passage.identifiantEcole,
  numeroSequence: 1,
  valableDepuis: '2026-11-27T08:00:00.000Z',
  valableJusqua: '2026-11-27T08:05:00.000Z',
}

async function preparerCodeSigne() {
  const paire = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )
  const clePrivee = await crypto.subtle.exportKey('jwk', paire.privateKey)
  const clePublique = await crypto.subtle.exportKey('jwk', paire.publicKey)
  const signatureBase64 = await signerDonneesCodeQr(donnees, await importerClePrivee(clePrivee))
  return { clePublique, signatureBase64 }
}

describe('validerCodeQrHorsLigne', () => {
  it('accepte un code signé valide puis refuse sa réutilisation', async () => {
    const depot = new DepotMemoire()
    const { clePublique, signatureBase64 } = await preparerCodeSigne()
    depot.memoriserCle(passage.identifiantEcole, clePublique)

    const premierResultat = await validerCodeQrHorsLigne(
      { donnees, signatureBase64 },
      passage,
      depot,
      new Date('2026-11-27T08:01:00.000Z'),
    )
    const secondResultat = await validerCodeQrHorsLigne(
      { donnees, signatureBase64 },
      passage,
      depot,
      new Date('2026-11-27T08:01:00.000Z'),
    )

    expect(premierResultat.accepte).toBe(true)
    expect(secondResultat).toEqual({ accepte: false, motif: 'CODE_QR_DEJA_CONSOMME' })
  })

  it('refuse une signature falsifiée', async () => {
    const depot = new DepotMemoire()
    const { clePublique } = await preparerCodeSigne()
    depot.memoriserCle(passage.identifiantEcole, clePublique)

    const resultat = await validerCodeQrHorsLigne(
      { donnees, signatureBase64: 'signature-fausse' },
      passage,
      depot,
      new Date('2026-11-27T08:01:00.000Z'),
    )

    expect(resultat).toEqual({ accepte: false, motif: 'SIGNATURE_INVALIDE' })
  })

  it('refuse un badge connu comme révoqué', async () => {
    const depot = new DepotMemoire()
    const { clePublique, signatureBase64 } = await preparerCodeSigne()
    depot.memoriserCle(passage.identifiantEcole, clePublique)
    depot.revoquerBadge(passage.identifiantBadge)

    const resultat = await validerCodeQrHorsLigne(
      { donnees, signatureBase64 },
      passage,
      depot,
      new Date('2026-11-27T08:01:00.000Z'),
    )

    expect(resultat).toEqual({ accepte: false, motif: 'BADGE_REVOQUE' })
  })

  it('refuse un QR expiré sans l’ajouter à la file locale', async () => {
    const depot = new DepotMemoire()
    const { clePublique, signatureBase64 } = await preparerCodeSigne()
    depot.memoriserCle(passage.identifiantEcole, clePublique)

    const resultat = await validerCodeQrHorsLigne(
      { donnees, signatureBase64 },
      passage,
      depot,
      new Date('2026-11-27T08:05:00.000Z'),
    )

    expect(resultat).toEqual({ accepte: false, motif: 'EXPIRE' })
  })

  it('refuse un QR qui ne correspond pas à l’établissement du passage', async () => {
    const depot = new DepotMemoire()
    const { clePublique, signatureBase64 } = await preparerCodeSigne()
    depot.memoriserCle(passage.identifiantEcole, clePublique)

    const resultat = await validerCodeQrHorsLigne(
      { donnees: { ...donnees, identifiantEcole: 'autre-ecole' }, signatureBase64 },
      passage,
      depot,
      new Date('2026-11-27T08:01:00.000Z'),
    )

    expect(resultat).toEqual({ accepte: false, motif: 'ECOLE_INCORRECTE' })
  })
})

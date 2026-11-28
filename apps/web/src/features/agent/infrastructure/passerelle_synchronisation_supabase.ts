import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { EvenementPassageEnAttente } from '../../../domaine/scan/types.ts'
import type { PasserelleSynchronisation, ReponseSynchronisation, ResultatServeurPassage } from '../application/synchroniser_passages.ts'

const resultatServeur = z.enum([
  'ACCEPTED', 'ALREADY_SYNCED', 'QR_ALREADY_CONSUMED', 'QR_EXPIRED',
  'BADGE_INACTIVE', 'DEVICE_UNAUTHORIZED', 'CHECKPOINT_INVALID', 'QR_NOT_FOUND',
  'CODE_INCOHERENT', 'FORMAT_INVALIDE', 'SIGNATURE_INVALIDE', 'ERREUR_SERVEUR',
])

const reponseServeur = z.object({
  resultats: z.array(z.object({
    identifiantEvenementLocal: z.string().uuid(),
    resultat: resultatServeur,
  })),
})

/** Adaptateur HTTP : seul ce module connaît l'Edge Function Supabase. */
export class PasserelleSynchronisationSupabase implements PasserelleSynchronisation {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async envoyer(evenements: readonly EvenementPassageEnAttente[]): Promise<readonly ReponseSynchronisation[]> {
    const { data, error } = await this.db.functions.invoke('synchroniser_passages', {
      body: { evenements },
    })
    if (error) throw error
    return reponseServeur.parse(data).resultats.map(({ identifiantEvenementLocal, resultat }) => ({
      identifiantEvenementLocal,
      resultat: resultat as ResultatServeurPassage,
    }))
  }
}

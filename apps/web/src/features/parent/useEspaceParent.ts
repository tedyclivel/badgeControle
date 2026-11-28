import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { lireEspaceParent } from './depot.ts'

export function useEspaceParent(db: SupabaseClient) {
  const [etat, setEtat] = useState<{ chargement: boolean; erreur: string; donnees: Awaited<ReturnType<typeof lireEspaceParent>> | null }>({
    chargement: true, erreur: '', donnees: null,
  })
  const charger = useCallback(() => lireEspaceParent(db), [db])
  const recharger = useCallback(async () => {
    setEtat((ancien) => ({ ...ancien, chargement: true, erreur: '' }))
    try {
      setEtat({ chargement: false, erreur: '', donnees: await charger() })
    } catch {
      setEtat({ chargement: false, erreur: 'Impossible de charger les informations de vos enfants.', donnees: null })
    }
  }, [charger])
  useEffect(() => {
    let actif = true
    void charger().then((donnees) => {
      if (actif) setEtat({ chargement: false, erreur: '', donnees })
    }).catch(() => {
      if (actif) setEtat({ chargement: false, erreur: 'Impossible de charger les informations de vos enfants.', donnees: null })
    })
    return () => { actif = false }
  }, [charger])
  return { ...etat, recharger }
}

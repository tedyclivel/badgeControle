import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validerCodeQrHorsLigne } from '../../../domaine/scan/valider_code_qr_hors_ligne.ts'
import type { CodeQrSigne, ResultatValidationLocale } from '../../../domaine/scan/types.ts'
import { BaseLocaleAgent, type TentativeLocale } from '../../../infrastructure/persistance/base_locale_agent.ts'
import type { AgentConnecte } from '../AgentScreen.tsx'
import { PasserelleSynchronisationSupabase } from '../infrastructure/passerelle_synchronisation_supabase.ts'
import { synchroniserPassagesEnAttente } from './synchroniser_passages.ts'

export interface Terminal { readonly id: string; readonly label: string }
export interface PointDeControle { readonly id: string; readonly label: string; readonly type: string }
export interface ResultatScanAffiche { readonly accepte: boolean; readonly texte: string; readonly heure: string; readonly point: string }

function lireCodeQr(valeur: string): CodeQrSigne {
  const contenu = JSON.parse(valeur) as Record<string, unknown>
  const donnees = contenu.donnees ?? contenu.donnees_signees
  const signatureBase64 = contenu.signatureBase64 ?? contenu.signature_base64
  if (!donnees || typeof signatureBase64 !== 'string') throw new Error('Format de QR inconnu')
  return { donnees: donnees as CodeQrSigne['donnees'], signatureBase64 }
}

function texteResultat(resultat: ResultatValidationLocale): string {
  if (resultat.accepte) return 'Passage accepté et enregistré localement.'
  const messages = {
    FORMAT_INVALIDE: 'Le QR ne peut pas être lu.', ECOLE_INCORRECTE: 'Ce QR appartient à un autre établissement.',
    CLE_PUBLIQUE_ABSENTE: 'Préparez le terminal avec la clé publique avant un contrôle hors ligne.',
    SIGNATURE_INVALIDE: 'La signature du QR est invalide.', PAS_ENCORE_VALIDE: 'Le badge n’est pas encore valide.',
    EXPIRE: 'Le badge a expiré.', BADGE_REVOQUE: 'Le badge est révoqué.', CODE_QR_DEJA_CONSOMME: 'Ce QR a déjà été utilisé.',
  }
  return messages[resultat.motif]
}

export function useAgentDashboard(db: SupabaseClient, agent: AgentConnecte) {
  const baseLocale = useMemo(() => new BaseLocaleAgent(), [])
  const passerelle = useMemo(() => new PasserelleSynchronisationSupabase(db), [db])
  const synchroEnCours = useRef(false)
  const [terminaux, setTerminaux] = useState<Terminal[]>([])
  const [points, setPoints] = useState<PointDeControle[]>([])
  const [terminalId, setTerminalId] = useState('')
  const [pointId, setPointId] = useState('')
  const [enLigne, setEnLigne] = useState(navigator.onLine)
  const [enAttente, setEnAttente] = useState(0)
  const [tentatives, setTentatives] = useState<readonly TentativeLocale[]>([])
  const [chargement, setChargement] = useState(true)
  const [synchronisation, setSynchronisation] = useState<'IDLE' | 'EN_COURS'>('IDLE')
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState<ResultatScanAffiche | null>(null)
  const [derniereSynchro, setDerniereSynchro] = useState<string | null>(null)

  const actualiserLocal = useCallback(async () => {
    const [compte, dernieres] = await Promise.all([baseLocale.passagesEnAttente.count(), baseLocale.listerDernieresTentatives()])
    setEnAttente(compte)
    setTentatives(dernieres)
  }, [baseLocale])

  const synchroniser = useCallback(async () => {
    if (!navigator.onLine || synchroEnCours.current) return
    synchroEnCours.current = true
    setSynchronisation('EN_COURS')
    setErreur('')
    try {
      const bilan = await synchroniserPassagesEnAttente(baseLocale, passerelle)
      setDerniereSynchro(new Date().toISOString())
      if (bilan.rejetes) setErreur(`${bilan.rejetes} événement${bilan.rejetes > 1 ? 's' : ''} refusé${bilan.rejetes > 1 ? 's' : ''} par le serveur.`)
    } catch {
      setErreur('Synchronisation reportée : vos passages sont conservés sur cet appareil.')
    } finally {
      synchroEnCours.current = false
      setSynchronisation('IDLE')
      await actualiserLocal()
    }
  }, [actualiserLocal, baseLocale, passerelle])

  useEffect(() => {
    let actif = true
    void Promise.all([
      db.from('devices').select('id,label').eq('agent_id', agent.id).eq('active', true).order('label'),
      db.from('checkpoints').select('id,label,type').eq('school_id', agent.school_id).eq('active', true).order('label'),
    ]).then(async ([appareils, pointsControle]) => {
      if (!actif) return
      if (appareils.error || pointsControle.error) setErreur('Impossible de charger la préparation du terminal.')
      else {
        setTerminaux(appareils.data)
        setPoints(pointsControle.data)
        setTerminalId(appareils.data[0]?.id ?? '')
        setPointId(pointsControle.data[0]?.id ?? '')
      }
      await actualiserLocal()
      setChargement(false)
      void synchroniser()
    }).catch(() => { if (actif) { setErreur('Impossible de charger la préparation du terminal.'); setChargement(false) } })
    const enConnexion = () => { setEnLigne(true); void synchroniser() }
    const horsConnexion = () => setEnLigne(false)
    window.addEventListener('online', enConnexion)
    window.addEventListener('offline', horsConnexion)
    return () => { actif = false; window.removeEventListener('online', enConnexion); window.removeEventListener('offline', horsConnexion) }
  }, [actualiserLocal, agent.id, agent.school_id, db, synchroniser])

  const controler = useCallback(async (contenu: string) => {
    setErreur('')
    setResultat(null)
    if (!terminalId || !pointId) { setErreur('Sélectionnez un terminal et un point de contrôle.'); return false }
    try {
      const codeQr = lireCodeQr(contenu)
      const validation = await validerCodeQrHorsLigne(codeQr, {
        identifiantCodeQr: codeQr.donnees.identifiantCodeQr, identifiantBadge: codeQr.donnees.identifiantBadge,
        identifiantEcole: agent.school_id, identifiantAppareil: terminalId, identifiantPointControle: pointId,
        heureLocale: new Date().toISOString(), decalageHorlogeSecondes: null,
      }, baseLocale)
      setResultat({ accepte: validation.accepte, texte: texteResultat(validation), heure: new Date().toISOString(), point: points.find((point) => point.id === pointId)?.label ?? 'Point de contrôle' })
      await actualiserLocal()
      if (validation.accepte) void synchroniser()
      return validation.accepte
    } catch {
      setErreur('Le contenu présenté ne contient pas un QR valide.')
      setResultat({ accepte: false, texte: 'QR invalide ou illisible.', heure: new Date().toISOString(), point: points.find((point) => point.id === pointId)?.label ?? 'Point de contrôle' })
      return false
    }
  }, [actualiserLocal, agent.school_id, baseLocale, pointId, points, synchroniser, terminalId])

  const preparerClePublique = useCallback(async (contenu: string): Promise<boolean> => {
    try {
      const cle = JSON.parse(contenu) as JsonWebKey
      if (!cle.kty) throw new Error('Clé manquante')
      await baseLocale.memoriserClePublique(agent.school_id, cle)
      setErreur('')
      return true
    } catch {
      setErreur('La clé publique doit être un objet JWK valide.')
      return false
    }
  }, [agent.school_id, baseLocale])

  return { terminaux, points, terminalId, setTerminalId, pointId, setPointId, enLigne, enAttente, tentatives, chargement, synchronisation, erreur, resultat, derniereSynchro, synchroniser, controler, preparerClePublique }
}

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BaseLocaleAgent } from '../../infrastructure/persistance/base_locale_agent.ts'
import { validerCodeQrHorsLigne } from '../../domaine/scan/valider_code_qr_hors_ligne.ts'
import type { CodeQrSigne, ResultatValidationLocale } from '../../domaine/scan/types.ts'
import { synchroniserPassagesEnAttente } from './application/synchroniser_passages.ts'
import { PasserelleSynchronisationSupabase } from './infrastructure/passerelle_synchronisation_supabase.ts'

interface Terminal { readonly id: string; readonly label: string }
interface PointDeControle { readonly id: string; readonly label: string; readonly type: string }

export interface AgentConnecte {
  readonly id: string
  readonly full_name: string
  readonly school_id: string
}

function lireCodeQr(valeur: string): CodeQrSigne {
  const contenu = JSON.parse(valeur) as Record<string, unknown>
  const donnees = contenu.donnees ?? contenu.donnees_signees
  const signatureBase64 = contenu.signatureBase64 ?? contenu.signature_base64
  if (!donnees || typeof signatureBase64 !== 'string') throw new Error('Format de QR inconnu')
  return { donnees: donnees as CodeQrSigne['donnees'], signatureBase64 }
}

function messageResultat(resultat: ResultatValidationLocale): string {
  if (resultat.accepte) return 'Passage accepté et enregistré localement.'
  const messages = {
    FORMAT_INVALIDE: 'Le QR ne peut pas être lu.',
    ECOLE_INCORRECTE: 'Ce QR ne correspond pas à votre établissement.',
    CLE_PUBLIQUE_ABSENTE: 'Préparez le terminal avec la clé publique avant de scanner hors ligne.',
    SIGNATURE_INVALIDE: 'La signature du QR est invalide.',
    PAS_ENCORE_VALIDE: 'Ce QR n’est pas encore valide.',
    EXPIRE: 'Ce QR a expiré.',
    BADGE_REVOQUE: 'Le badge est révoqué.',
    CODE_QR_DEJA_CONSOMME: 'Ce QR a déjà été utilisé.',
  }
  return messages[resultat.motif]
}

export function EcranAgent({ db, agent, deconnecter }: {
  readonly db: SupabaseClient
  readonly agent: AgentConnecte
  readonly deconnecter: () => void
}) {
  const baseLocale = useMemo(() => new BaseLocaleAgent(), [])
  const passerelleSynchronisation = useMemo(() => new PasserelleSynchronisationSupabase(db), [db])
  const synchronisationEnCours = useRef(false)
  const [terminaux, setTerminaux] = useState<Terminal[]>([])
  const [points, setPoints] = useState<PointDeControle[]>([])
  const [terminalId, setTerminalId] = useState('')
  const [pointId, setPointId] = useState('')
  const [contenuQr, setContenuQr] = useState('')
  const [clePublique, setClePublique] = useState('')
  const [enLigne, setEnLigne] = useState(navigator.onLine)
  const [enAttente, setEnAttente] = useState(0)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [synchronisation, setSynchronisation] = useState<'IDLE' | 'EN_COURS'>('IDLE')

  const actualiserFile = useCallback(async () => {
    setEnAttente(await baseLocale.passagesEnAttente.count())
  }, [baseLocale])

  const synchroniser = useCallback(async () => {
    if (!navigator.onLine || synchronisationEnCours.current) return
    synchronisationEnCours.current = true
    setSynchronisation('EN_COURS')
    try {
      const bilan = await synchroniserPassagesEnAttente(baseLocale, passerelleSynchronisation)
      if (bilan.confirmes) setMessage(`${bilan.confirmes} passage${bilan.confirmes > 1 ? 's' : ''} synchronisé${bilan.confirmes > 1 ? 's' : ''}.`)
      if (bilan.rejetes) setErreur(`${bilan.rejetes} passage${bilan.rejetes > 1 ? 's' : ''} a été refusé par le serveur.`)
    } catch {
      // Le passage reste dans IndexedDB : il sera renvoyé lors de la prochaine connexion.
      setErreur('Synchronisation reportée : les passages restent conservés sur ce terminal.')
    } finally {
      synchronisationEnCours.current = false
      setSynchronisation('IDLE')
      await actualiserFile()
    }
  }, [actualiserFile, baseLocale, passerelleSynchronisation])

  useEffect(() => {
    let actif = true
    async function charger() {
      const [appareils, pointsControle] = await Promise.all([
        db.from('devices').select('id, label').eq('agent_id', agent.id).eq('active', true).order('label'),
        db.from('checkpoints').select('id, label, type').eq('school_id', agent.school_id).eq('active', true).order('label'),
      ])
      if (!actif) return
      if (appareils.error || pointsControle.error) setErreur('Impossible de charger la préparation du terminal.')
      else {
        setTerminaux(appareils.data)
        setPoints(pointsControle.data)
        setTerminalId(appareils.data[0]?.id ?? '')
        setPointId(pointsControle.data[0]?.id ?? '')
      }
      await actualiserFile()
      void synchroniser()
    }
    void charger()
    const enConnexion = () => {
      setEnLigne(true)
      void synchroniser()
    }
    const horsConnexion = () => setEnLigne(false)
    window.addEventListener('online', enConnexion)
    window.addEventListener('offline', horsConnexion)
    return () => {
      actif = false
      window.removeEventListener('online', enConnexion)
      window.removeEventListener('offline', horsConnexion)
    }
  }, [actualiserFile, agent.id, agent.school_id, db, synchroniser])

  async function preparerTerminal(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur('')
    try {
      const valeur = JSON.parse(clePublique) as JsonWebKey
      if (!valeur.kty) throw new Error('Clé manquante')
      await baseLocale.memoriserClePublique(agent.school_id, valeur)
      setMessage('Clé publique enregistrée sur ce terminal.')
      setClePublique('')
    } catch {
      setErreur('La clé publique doit être un objet JSON valide.')
    }
  }

  async function controlerPassage(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur('')
    setMessage('')
    if (!terminalId || !pointId) {
      setErreur('Sélectionnez un terminal et un point de contrôle.')
      return
    }
    try {
      const codeQr = lireCodeQr(contenuQr)
      const resultat = await validerCodeQrHorsLigne(codeQr, {
        identifiantCodeQr: codeQr.donnees.identifiantCodeQr,
        identifiantBadge: codeQr.donnees.identifiantBadge,
        identifiantEcole: agent.school_id,
        identifiantAppareil: terminalId,
        identifiantPointControle: pointId,
        heureLocale: new Date().toISOString(),
        decalageHorlogeSecondes: null,
      }, baseLocale)
      setMessage(messageResultat(resultat))
      if (resultat.accepte) setContenuQr('')
      await actualiserFile()
      if (resultat.accepte) void synchroniser()
    } catch {
      setErreur('Le contenu présenté ne contient pas un QR valide.')
    }
  }

  return <section className="carte agent">
    <p className="identite">{agent.full_name}</p>
    <h1>Contrôle des passages</h1>
    <p className={enLigne ? 'etat en-ligne' : 'etat hors-ligne'}>{enLigne ? 'En ligne' : 'Hors ligne'} · {enAttente} passage{enAttente > 1 ? 's' : ''} en attente</p>
    {erreur && <p role="alert">{erreur}</p>}
    {message && <p role="status">{message}</p>}

    <form onSubmit={controlerPassage}>
      <label htmlFor="terminal">Terminal</label>
      <select id="terminal" value={terminalId} onChange={(e) => setTerminalId(e.target.value)} required>
        <option value="">Sélectionner un terminal</option>
        {terminaux.map((terminal) => <option key={terminal.id} value={terminal.id}>{terminal.label}</option>)}
      </select>
      <label htmlFor="point">Point de contrôle</label>
      <select id="point" value={pointId} onChange={(e) => setPointId(e.target.value)} required>
        <option value="">Sélectionner un point</option>
        {points.map((point) => <option key={point.id} value={point.id}>{point.label} · {point.type}</option>)}
      </select>
      <label htmlFor="qr">Contenu du QR signé</label>
      <textarea id="qr" value={contenuQr} onChange={(e) => setContenuQr(e.target.value)} placeholder="Scannez ou collez le QR signé" required />
      <button>Contrôler le passage</button>
    </form>

    <button
      type="button"
      className="secondaire"
      onClick={() => void synchroniser()}
      disabled={!enLigne || synchronisation === 'EN_COURS' || enAttente === 0}
    >
      {synchronisation === 'EN_COURS' ? 'Synchronisation…' : 'Synchroniser les passages'}
    </button>

    <details>
      <summary>Préparer le terminal pour le mode hors ligne</summary>
      <form onSubmit={preparerTerminal}>
        <label htmlFor="cle">Clé publique QR</label>
        <textarea id="cle" value={clePublique} onChange={(e) => setClePublique(e.target.value)} placeholder="Clé publique au format JWK" required />
        <button className="secondaire">Enregistrer la clé</button>
      </form>
    </details>
    <button className="secondaire" onClick={deconnecter}>Se déconnecter</button>
  </section>
}

import { KeyRound, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAgentDashboard } from './application/useAgentDashboard.ts'
import { AgentHeader, AgentSetup, RecentScansList, ScanResultCard, SyncStatusCard } from './presentation/AgentDashboard.tsx'
import { InstallPWAPrompt } from './presentation/InstallPWAPrompt.tsx'
import { ScanActionCard } from './presentation/ScanActionCard.tsx'
import './agent.css'

export interface AgentConnecte {
  readonly id: string
  readonly full_name: string
  readonly school_id: string
}

export function EcranAgent({ db, agent, deconnecter }: { readonly db: SupabaseClient; readonly agent: AgentConnecte; readonly deconnecter: () => void }) {
  const tableau = useAgentDashboard(db, agent)
  const [clePublique, setClePublique] = useState('')
  const [preparationOuverte, setPreparationOuverte] = useState(false)
  async function enregistrerCle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await tableau.preparerClePublique(clePublique)) { setClePublique(''); setPreparationOuverte(false) }
  }
  const pointActif = tableau.points.find((point) => point.id === tableau.pointId)
  const pret = Boolean(tableau.terminalId && tableau.pointId) && !tableau.chargement
  return <div className="agent-layout">
    <AgentHeader agent={agent} point={pointActif} enLigne={tableau.enLigne} deconnecter={deconnecter} />
    <InstallPWAPrompt />
    <main className="agent-main">
      <section className="agent-welcome"><div><p>Contrôle des passages</p><h1>Bonjour, {agent.full_name.split(' ')[0]}</h1><span>Prêt à accueillir les élèves au {pointActif?.label ?? 'point de contrôle'}.</span></div><span className={tableau.enLigne ? 'agent-status online' : 'agent-status offline'}>{tableau.enLigne ? '● Connexion active' : '● Mode hors ligne'}</span></section>
      {tableau.erreur && <div className="agent-alert" role="alert">{tableau.erreur}</div>}
      {tableau.chargement ? <div className="agent-loading" role="status"><LoaderCircle className="agent-spin" /> Préparation du terminal…</div> : <>
        <AgentSetup terminaux={tableau.terminaux} points={tableau.points} terminalId={tableau.terminalId} pointId={tableau.pointId} onTerminal={tableau.setTerminalId} onPoint={tableau.setPointId} />
        <section className="agent-workspace"><div className="agent-scan-column"><ScanActionCard pret={pret} onControler={tableau.controler} /><ScanResultCard resultat={tableau.resultat} /></div><aside className="agent-side-column"><SyncStatusCard enLigne={tableau.enLigne} enAttente={tableau.enAttente} synchronisation={tableau.synchronisation} derniereSynchro={tableau.derniereSynchro} synchroniser={() => void tableau.synchroniser()} /><RecentScansList tentatives={tableau.tentatives} /></aside></section>
        <section className="agent-preparation"><button type="button" onClick={() => setPreparationOuverte((ouverte) => !ouverte)}><KeyRound size={17} /> Préparer ce terminal pour le mode hors ligne</button>{preparationOuverte && <form onSubmit={enregistrerCle}><label>Clé publique QR (JWK)<textarea value={clePublique} onChange={(event) => setClePublique(event.target.value)} placeholder="Collez la clé publique au format JWK" required /></label><button>Enregistrer la clé</button></form>}</section>
      </>}
    </main>
  </div>
}

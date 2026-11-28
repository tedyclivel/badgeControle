import { CheckCircle2, ChevronDown, Cloud, CloudOff, History, LogOut, MapPin, RefreshCw, ShieldCheck, TriangleAlert, WifiOff } from 'lucide-react'
import type { AgentConnecte } from '../AgentScreen.tsx'
import type { PointDeControle, Terminal, ResultatScanAffiche } from '../application/useAgentDashboard.ts'
import type { TentativeLocale } from '../../../infrastructure/persistance/base_locale_agent.ts'

function dateHeure(valeur: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(valeur)) }

export function AgentHeader({ agent, point, enLigne, deconnecter }: { readonly agent: AgentConnecte; readonly point?: PointDeControle; readonly enLigne: boolean; readonly deconnecter: () => void }) {
  return <header className="agent-header"><div className="agent-brand"><span> P </span><div><strong>Passage</strong><small>Espace Agent</small></div></div><div className="agent-checkpoint"><MapPin size={16} /><div><small>Point actif</small><strong>{point?.label ?? 'À sélectionner'}</strong></div></div><span className={enLigne ? 'agent-network online' : 'agent-network offline'}>{enLigne ? <Cloud size={15} /> : <CloudOff size={15} />}{enLigne ? 'En ligne' : 'Hors ligne'}</span><button type="button" className="agent-session" onClick={deconnecter} aria-label={`Déconnexion de ${agent.full_name}`}><span>{agent.full_name.slice(0, 1).toUpperCase()}</span><LogOut size={16} /></button></header>
}

export function AgentSetup({ terminaux, points, terminalId, pointId, onTerminal, onPoint }: { readonly terminaux: readonly Terminal[]; readonly points: readonly PointDeControle[]; readonly terminalId: string; readonly pointId: string; readonly onTerminal: (id: string) => void; readonly onPoint: (id: string) => void }) {
  return <section className="agent-setup"><label>Terminal<select value={terminalId} onChange={(event) => onTerminal(event.target.value)}><option value="">Choisir un terminal</option>{terminaux.map((terminal) => <option key={terminal.id} value={terminal.id}>{terminal.label}</option>)}</select><ChevronDown size={15} /></label><label>Point de contrôle<select value={pointId} onChange={(event) => onPoint(event.target.value)}><option value="">Choisir un point</option>{points.map((point) => <option key={point.id} value={point.id}>{point.label} · {point.type}</option>)}</select><ChevronDown size={15} /></label></section>
}

export function ScanResultCard({ resultat }: { readonly resultat: ResultatScanAffiche | null }) {
  if (!resultat) return <article className="agent-result agent-result-empty"><ShieldCheck size={22} /><div><strong>Prêt à contrôler</strong><p>Le résultat du prochain badge apparaîtra ici.</p></div></article>
  return <article className={resultat.accepte ? 'agent-result accepted' : 'agent-result rejected'}>{resultat.accepte ? <CheckCircle2 size={24} /> : <TriangleAlert size={24} />}<div><strong>{resultat.accepte ? 'Passage accepté' : 'Passage refusé'}</strong><p>{resultat.texte}</p><small>{dateHeure(resultat.heure)} · {resultat.point}</small></div></article>
}

export function SyncStatusCard({ enLigne, enAttente, synchronisation, derniereSynchro, synchroniser }: { readonly enLigne: boolean; readonly enAttente: number; readonly synchronisation: 'IDLE' | 'EN_COURS'; readonly derniereSynchro: string | null; readonly synchroniser: () => void }) {
  return <article className="agent-sync"><div className="agent-card-title"><span><RefreshCw size={19} className={synchronisation === 'EN_COURS' ? 'agent-spin' : ''} /></span><div><p>Synchronisation</p><h2>{enAttente} en attente</h2></div></div><p>{enLigne ? (derniereSynchro ? `Dernière tentative à ${dateHeure(derniereSynchro)}` : 'Prêt à transmettre les événements locaux.') : 'Les événements restent protégés sur cet appareil jusqu’au retour réseau.'}</p><button type="button" onClick={synchroniser} disabled={!enLigne || !enAttente || synchronisation === 'EN_COURS'}>{synchronisation === 'EN_COURS' ? 'Synchronisation…' : 'Synchroniser'}</button></article>
}

export function RecentScansList({ tentatives }: { readonly tentatives: readonly TentativeLocale[] }) {
  return <article className="agent-recent"><div className="agent-card-title"><span><History size={19} /></span><div><p>Activité locale</p><h2>Derniers scans</h2></div></div>{tentatives.length ? <ul>{tentatives.map((tentative) => <li key={tentative.id}><span className={tentative.resultat === 'ACCEPTE' ? 'scan-ok' : 'scan-no'}>{tentative.resultat === 'ACCEPTE' ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}</span><div><strong>{tentative.resultat === 'ACCEPTE' ? 'Passage accepté' : 'QR déjà utilisé'}</strong><small>{dateHeure(tentative.tenteLe)} · badge …{tentative.identifiantBadge.slice(-4)}</small></div><b>{tentative.resultat === 'ACCEPTE' ? 'En file' : 'Refusé'}</b></li>)}</ul> : <div className="agent-empty"><WifiOff size={20} /><p>Aucun scan récent sur cet appareil.</p></div>}</article>
}

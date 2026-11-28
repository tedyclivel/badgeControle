import type { SupabaseClient } from '@supabase/supabase-js'
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Users } from 'lucide-react'
import { useEspaceParent } from './useEspaceParent.ts'
import './parent.css'

const libellesAnomalies: Record<string, string> = {
  MISSING: 'Passage manquant', OUTSIDE_WINDOW: 'Hors créneau', UNEXPECTED_CHECKPOINT: 'Point inattendu',
  DUPLICATE_SCAN: 'Double passage', UNRELIABLE_CLOCK: 'Horloge incertaine', QR_DUPLICATION: 'QR dupliqué',
}

function formaterDate(valeur: string | null): string {
  if (!valeur) return 'Heure à confirmer'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valeur))
}

export default function EspaceParent({ db, nom, deconnecter }: {
  readonly db: SupabaseClient
  readonly nom: string
  readonly deconnecter: () => void
}) {
  const { chargement, erreur, donnees, recharger } = useEspaceParent(db)
  return <section className="parent-espace">
    <header className="parent-entete">
      <div><p className="parent-surtitre">Espace famille</p><h1>Bonjour, {nom}</h1><p>Suivez les derniers passages et signaux concernant vos enfants.</p></div>
      <button type="button" className="parent-rafraichir" onClick={() => void recharger()} disabled={chargement}><RefreshCw size={16} /> Actualiser</button>
    </header>
    {erreur && <div className="parent-erreur" role="alert">{erreur}<button type="button" onClick={() => void recharger()}>Réessayer</button></div>}
    {chargement && <p role="status" className="parent-chargement">Chargement de votre espace…</p>}
    {!chargement && donnees && <>
      <div className="parent-enfants" aria-label="Vos enfants">
        {donnees.enfants.length ? donnees.enfants.map((enfant) => <article key={enfant.id}><span><Users size={18} /></span><div><small>Élève rattaché</small><strong>{enfant.nom}</strong></div></article>) : <p>Aucun enfant actif n’est rattaché à ce compte.</p>}
      </div>
      <div className="parent-grille">
        <article className="parent-carte"><div className="parent-titre"><div><Clock3 size={18} /><h2>Derniers passages</h2></div><span>{donnees.passages.length}</span></div>
          {donnees.passages.length ? <ul>{donnees.passages.map((passage) => <li key={passage.id}><div><strong>{passage.enfant}</strong><span>{formaterDate(passage.effective_time ?? passage.server_received_at)}</span></div><b className={passage.validation_status === 'ACCEPTED' ? 'valide' : 'a-verifier'}>{passage.validation_status === 'ACCEPTED' ? 'Validé' : 'À vérifier'}</b></li>)}</ul> : <p className="parent-vide">Aucun passage récent.</p>}
        </article>
        <article className="parent-carte"><div className="parent-titre"><div><AlertTriangle size={18} /><h2>Anomalies récentes</h2></div><span>{donnees.anomalies.length}</span></div>
          {donnees.anomalies.length ? <ul>{donnees.anomalies.map((anomalie) => <li key={anomalie.id}><div><strong>{anomalie.enfant}</strong><span>{libellesAnomalies[anomalie.type] ?? anomalie.type} · {formaterDate(anomalie.detected_at)}</span></div><b className={anomalie.status === 'RESOLVED' ? 'valide' : 'a-verifier'}>{anomalie.status === 'RESOLVED' ? 'Résolue' : 'Ouverte'}</b></li>)}</ul> : <p className="parent-vide"><CheckCircle2 size={18} /> Aucune anomalie récente.</p>}
        </article>
      </div>
    </>}
    <button type="button" className="parent-deconnexion" onClick={deconnecter}>Se déconnecter</button>
  </section>
}

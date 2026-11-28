import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EcranAgent } from './features/agent/AgentScreen.tsx'
import './App.css'

const Responsable = lazy(() => import('./features/responsable/TableauDeBord'))
const Parent = lazy(() => import('./features/parent/EspaceParent'))

// En développement, les routes Supabase sont relayées par Vite : cela permet
// un test HTTPS depuis un téléphone via un tunnel sans exposer l'API locale.
const url = import.meta.env.DEV ? window.location.origin : import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const client = url && cle && !cle.startsWith('replace-') ? createClient(url, cle) : null

type Espace =
  | { readonly role: 'MANAGER'; readonly chemin: '/responsable'; readonly ecole: string; readonly nom: string }
  | { readonly role: 'AGENT'; readonly chemin: '/agent'; readonly schoolId: string; readonly nom: string }
  | { readonly role: 'PARENT'; readonly chemin: '/parent'; readonly nom: string }

function Connexion({ db }: { readonly db: SupabaseClient }) {
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  async function connecter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const valeurs = new FormData(event.currentTarget)
    setEnCours(true)
    setErreur('')
    try {
      const { error } = await db.auth.signInWithPassword({
        email: String(valeurs.get('email')).trim(), password: String(valeurs.get('password')),
      })
      if (error) throw error
    } catch {
      setErreur('Connexion impossible. Vérifiez vos identifiants et votre connexion.')
    } finally {
      setEnCours(false)
    }
  }
  return <section><h1>Accéder à mon espace</h1><p>Utilisez le compte fourni par votre établissement.</p>
    <form onSubmit={connecter}>
      <label>Adresse e-mail<input name="email" type="email" autoComplete="username" required /></label>
      <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
      {erreur && <p role="alert">{erreur}</p>}
      <button disabled={enCours}>{enCours ? 'Connexion en cours…' : 'Se connecter'}</button>
    </form>
  </section>
}

async function chargerEspace(db: SupabaseClient, id: string): Promise<Espace> {
  const { data: profil, error } = await db.from('profiles').select('role, full_name, school_id')
    .eq('id', id).eq('active', true).single()
  if (error || !profil) throw new Error('Profil inaccessible')
  if (profil.role === 'MANAGER') return { role: 'MANAGER', chemin: '/responsable', ecole: String(profil.school_id), nom: String(profil.full_name) }
  if (profil.role === 'AGENT') return { role: 'AGENT', chemin: '/agent', schoolId: String(profil.school_id), nom: String(profil.full_name) }
  if (profil.role === 'PARENT') return { role: 'PARENT', chemin: '/parent', nom: String(profil.full_name) }
  throw new Error('Rôle inconnu')
}

function EspaceConnecte({ db, id }: { readonly db: SupabaseClient; readonly id: string }) {
  const [espace, setEspace] = useState<Espace | null>(null)
  const [erreur, setErreur] = useState('')
  const [essai, setEssai] = useState(0)
  const deconnecter = () => void db.auth.signOut({ scope: 'local' })
  useEffect(() => {
    let actif = true
    void chargerEspace(db, id).then((resultat) => { if (actif) setEspace(resultat) })
      .catch(() => { if (actif) setErreur('Impossible de charger votre espace.') })
    return () => { actif = false }
  }, [db, id, essai])
  if (erreur) return <section><p role="alert">{erreur}</p><button onClick={() => { setErreur(''); setEssai((valeur) => valeur + 1) }}>Réessayer</button></section>
  if (!espace) return <p role="status">Chargement du profil…</p>
  if (espace.role === 'MANAGER') return <Routes>
    <Route path="/responsable" element={<Suspense fallback={<p>Chargement…</p>}><Responsable db={db} ecole={espace.ecole} nom={espace.nom} /></Suspense>} />
    <Route path="*" element={<Navigate to="/responsable" replace />} />
  </Routes>
  if (espace.role === 'AGENT') return <Routes>
    <Route path="/agent" element={<EcranAgent db={db} agent={{ id, full_name: espace.nom, school_id: espace.schoolId }} deconnecter={deconnecter} />} />
    <Route path="*" element={<Navigate to="/agent" replace />} />
  </Routes>
  return <Routes>
    <Route path="/parent" element={<Suspense fallback={<p>Chargement…</p>}><Parent db={db} nom={espace.nom} deconnecter={deconnecter} /></Suspense>} />
    <Route path="*" element={<Navigate to="/parent" replace />} />
  </Routes>
}

export default function App() {
  const [id, setId] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (!client) return
    void client.auth.getSession().then(({ data }) => setId(data.session?.user.id ?? null))
    const { data } = client.auth.onAuthStateChange((_, session) => setId(session?.user.id ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  return <BrowserRouter><header><span className="marque">Passage</span><span>Suivi des passages d’élèves</span></header>
    <main>{!client ? <section><h1>Connexion à configurer</h1><p>Renseignez l’URL Supabase et la clé publique dans la configuration web.</p></section>
      : id === undefined ? <p role="status">Ouverture de la session…</p>
        : id ? <EspaceConnecte key={id} db={client} id={id} />
          : <Routes><Route path="/connexion" element={<Connexion db={client} />} /><Route path="*" element={<Navigate to="/connexion" replace />} /></Routes>}</main>
  </BrowserRouter>
}

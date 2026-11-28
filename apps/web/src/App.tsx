import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EcranAgent } from './features/agent/AgentScreen.tsx'
import './App.css'
const Responsable = lazy(() => import('./features/responsable/TableauDeBord'))

type Role = 'AGENT' | 'MANAGER' | 'PARENT'

interface Profil {
  readonly full_name: string
  readonly role: Role
}

const urlSupabase = import.meta.env.VITE_SUPABASE_URL
const cleSupabase = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const client = urlSupabase && cleSupabase && !cleSupabase.startsWith('replace-')
  ? createClient(urlSupabase, cleSupabase)
  : null
const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const client = url && cle && !cle.startsWith('replace-') ? createClient(url, cle) : null

function Connexion({ db }: { db: SupabaseClient }) {
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function connecter(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const valeurs = new FormData(evenement.currentTarget)
    setEnCours(true)
    setErreur('')
    const { error } = await db.auth.signInWithPassword({
      email: String(valeurs.get('email')).trim(),
      password: String(valeurs.get('password')),
    })
    if (error) setErreur('Connexion impossible. Vérifiez vos identifiants et votre connexion.')
    setEnCours(false)
  }

  return <section className="carte connexion">
    <h1>Accéder à mon espace</h1>
    <p>Utilisez le compte fourni par votre établissement.</p>
    <form onSubmit={connecter}>
      <label htmlFor="email">Adresse e-mail</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="mot-de-passe">Mot de passe</label>
      <input id="mot-de-passe" name="password" type="password" autoComplete="current-password" required />
      {erreur && <p role="alert">{erreur}</p>}
      <button disabled={enCours}>{enCours ? 'Connexion en cours…' : 'Se connecter'}</button>
    </form>
  </section>
}

function EspaceEnPreparation({ profil, db }: { profil: Profil; db: SupabaseClient }) {
  const nomsEspaces: Record<Role, string> = {
    AGENT: 'Espace agent',
    MANAGER: 'Espace responsable',
    PARENT: 'Espace parent',
  }
  return <section className="carte">
    <p className="identite">{profil.full_name}</p>
    <h1>{nomsEspaces[profil.role]}</h1>
    <p>Votre espace est en cours de préparation.</p>
    <button className="secondaire" onClick={() => void db.auth.signOut({ scope: 'local' })}>Se déconnecter</button>
  </section>
}

function Session({ db, identifiant }: { db: SupabaseClient; identifiant: string }) {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    db.from('profiles').select('full_name, role').eq('id', identifiant).eq('active', true).single()
      .then(({ data, error }) => {
        if (!actif) return
        if (error || !data) setErreur('Votre profil n’est pas accessible.')
        else setProfil(data as Profil)
      })
    return () => { actif = false }
  }, [db, identifiant])

  if (erreur) return <section className="carte"><p role="alert">{erreur}</p></section>
  if (!profil) return <p role="status">Chargement du profil…</p>
  const chemin = profil.role === 'AGENT' ? '/agent' : profil.role === 'MANAGER' ? '/responsable' : '/parent'
  return <Routes>
    <Route path={chemin} element={<EspaceEnPreparation profil={profil} db={db} />} />
    <Route path="*" element={<Navigate to={chemin} replace />} />
  </Routes>
}

export default function App() {
  const [identifiant, setIdentifiant] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!client) return
    void client.auth.getSession().then(({ data }) => setIdentifiant(data.session?.user.id ?? null))
    const { data } = client.auth.onAuthStateChange((_, session) => setIdentifiant(session?.user.id ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  return <BrowserRouter>
    <header><strong>Passage</strong><span>Suivi sécurisé des passages d’élèves</span></header>
    <main>
      {!client && <section className="carte"><h1>Connexion à configurer</h1><p>Renseignez l’URL Supabase et la clé publique dans la configuration web.</p></section>}
      {client && identifiant === undefined && <p role="status">Ouverture de la session…</p>}
      {client && identifiant && <Session db={client} identifiant={identifiant} />}
      {client && identifiant === null && <Routes><Route path="/connexion" element={<Connexion db={client} />} /><Route path="*" element={<Navigate to="/connexion" replace />} /></Routes>}
    </main>
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
  return <section><h1>Accéder à mon espace</h1>
    <p>Utilisez le compte fourni par votre établissement.</p>
    <form onSubmit={connecter}>
      <label>Adresse e-mail<input name="email" type="email" autoComplete="username" required /></label>
      <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
      {erreur && <p role="alert">{erreur}</p>}
      <button disabled={enCours}>{enCours ? 'Connexion en cours…' : 'Se connecter'}</button>
    </form></section>
}

async function chargerEspace(db: SupabaseClient, id: string) {
  const { data: profil, error } = await db.from('profiles').select('role, full_name, school_id')
    .eq('id', id).eq('active', true).single()
  if (error || !profil) throw new Error('Profil inaccessible')
  switch (profil.role) {
    case 'MANAGER': {
      return { chemin: '/responsable', ecole: String(profil.school_id), nom: String(profil.full_name) } as const
    }
    case 'AGENT': {
      const { data, error } = await db.from('devices').select('label').eq('agent_id', id)
        .eq('school_id', profil.school_id).eq('active', true).order('label')
      if (error) throw error
      return { role: profil.role, schoolId: profil.school_id, chemin: '/agent', titre: 'Espace agent', nom: profil.full_name,
        rubrique: 'Mes terminaux actifs', lignes: data.map(d => String(d.label)), vide: 'Aucun terminal actif affecté.' }
    }
    case 'PARENT': {
      // Les politiques RLS limitent cette lecture aux élèves liés au parent connecté.
      const { data, error } = await db.from('students').select('full_name')
        .eq('school_id', profil.school_id).eq('active', true).order('full_name')
      if (error) throw error
      return { role: profil.role, schoolId: profil.school_id, chemin: '/parent', titre: 'Espace parent', nom: profil.full_name,
        rubrique: 'Mes enfants', lignes: data.map(e => String(e.full_name)), vide: 'Aucun enfant actif rattaché au compte.' }
    }
    default: throw new Error('Rôle inconnu')
  }
}

function Espace({ db, id }: { db: SupabaseClient; id: string }) {
  const [espace, setEspace] = useState<Awaited<ReturnType<typeof chargerEspace>> | null>(null)
  const [erreur, setErreur] = useState('')
  const [essai, setEssai] = useState(0)
  useEffect(() => {
    let actif = true
    chargerEspace(db, id).then(resultat => { if (actif) setEspace(resultat) })
      .catch(() => { if (actif) setErreur('Impossible de charger votre espace.') })
    return () => { actif = false }
  }, [db, id, essai])
  if (erreur) return <section><p role="alert">{erreur}</p><button onClick={() => { setErreur(''); setEssai(essai + 1) }}>Réessayer</button></section>
  if (!espace) return <p role="status">Chargement du profil…</p>
  if ('ecole' in espace && typeof espace.ecole === 'string') return <Routes>
    <Route path="/responsable" element={<Suspense fallback={<p>Chargement…</p>}><Responsable db={db} ecole={espace.ecole} nom={espace.nom}/></Suspense>} />
    <Route path="*" element={<Navigate to="/responsable" replace />} />
  </Routes>
  return <Routes>
    <Route path={espace.chemin} element={espace.role === 'AGENT'
      ? <EcranAgent db={db} agent={{ id, full_name: espace.nom, school_id: espace.schoolId }} deconnecter={() => void db.auth.signOut({ scope: 'local' })} />
      : <section><p>{espace.nom}</p><h1>{espace.titre}</h1><h2>{espace.rubrique}</h2>{espace.lignes.length ? <ul>{espace.lignes.map((ligne, i) => <li key={i}>{ligne}</li>)}</ul> : <p>{espace.vide}</p>}<button className="secondaire" onClick={() => void db.auth.signOut({ scope: 'local' })}>Se déconnecter</button></section>} />
    <Route path="*" element={<Navigate to={espace.chemin} replace />} />
  </Routes>
}

export default function App() {
  const [id, setId] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (!client) return
    const { data } = client.auth.onAuthStateChange((_, session) => setId(session?.user.id ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  return <BrowserRouter><header><span className="marque">Passage</span><span>Suivi des passages d’élèves</span></header>
    <main>{!client ? <section><h1>Connexion à configurer</h1><p>Renseignez l’URL Supabase et la clé publique dans la configuration web.</p></section>
      : id === undefined ? <p role="status">Ouverture de la session…</p>
      : id ? <Espace key={id} db={client} id={id} />
      : <Routes><Route path="/connexion" element={<Connexion db={client} />} />
          <Route path="*" element={<Navigate to="/connexion" replace />} /></Routes>}</main>
  </BrowserRouter>
}

import { useEffect, useState, type FormEvent } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

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
  </BrowserRouter>
}

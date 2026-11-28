import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface InvitationInstallation extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const CLE_REPORT = 'passage:agent:pwa-plus-tard'
const DELAI_RAPPEL = 24 * 60 * 60 * 1000

export function InstallPWAPrompt() {
  const [invitation, setInvitation] = useState<InvitationInstallation | null>(null)
  const [visible, setVisible] = useState(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return false
    return Date.now() - Number(window.localStorage.getItem(CLE_REPORT) ?? '0') >= DELAI_RAPPEL
  })
  const [aideInstallation, setAideInstallation] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // La bannière appartient à l'espace Agent et s'affiche après son authentification.
    // L'événement natif peut n'être émis qu'en build de production.
    const recevoir = (evenement: Event) => {
      evenement.preventDefault()
      setInvitation(evenement as InvitationInstallation)
      setVisible(true)
    }
    const installee = () => { setVisible(false); setInvitation(null) }
    window.addEventListener('beforeinstallprompt', recevoir)
    window.addEventListener('appinstalled', installee)
    return () => { window.removeEventListener('beforeinstallprompt', recevoir); window.removeEventListener('appinstalled', installee) }
  }, [])
  const reporter = () => { window.localStorage.setItem(CLE_REPORT, String(Date.now())); setVisible(false) }
  const installer = async () => {
    if (!invitation) {
      setAideInstallation(true)
      return
    }
    await invitation.prompt()
    await invitation.userChoice
    setVisible(false)
  }
  if (!visible) return null
  return <aside className="agent-install" role="dialog" aria-label="Installer Passage">
    <Download size={21} /><div><strong>Installer Passage</strong><p>Gardez le contrôle des passages accessible sur votre appareil, même avec un réseau instable.</p></div>
    {aideInstallation && <p className="agent-install-help">Utilisez le menu du navigateur, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p>}
    <div className="agent-install-actions"><button type="button" onClick={() => void installer()}>Installer</button><button type="button" className="agent-plain" onClick={reporter}>Plus tard</button></div>
    <button type="button" className="agent-close" onClick={reporter} aria-label="Fermer"><X size={17} /></button>
  </aside>
}

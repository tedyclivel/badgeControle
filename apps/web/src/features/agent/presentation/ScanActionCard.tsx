import { Camera, Keyboard, ScanLine, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cameraQrDisponible, demarrerDetectionQr, detectionQrDisponible, fermerCamera, ouvrirCamera } from '../infrastructure/camera_qr.ts'

export function ScanActionCard({ pret, onControler }: { readonly pret: boolean; readonly onControler: (contenu: string) => Promise<boolean> }) {
  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const arreterDetection = useRef<(() => void) | null>(null)
  const verrou = useRef(false)
  const [ouvert, setOuvert] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [erreurCamera, setErreurCamera] = useState('')
  const fermer = () => { arreterDetection.current?.(); arreterDetection.current = null; fermerCamera(flux.current); flux.current = null; setOuvert(false) }
  useEffect(() => () => fermer(), [])
  useEffect(() => {
    if (!ouvert || !video.current) return
    let annule = false
    void ouvrirCamera(video.current).then((nouveauFlux) => {
      if (annule) { fermerCamera(nouveauFlux); return }
      flux.current = nouveauFlux
      if (!detectionQrDisponible()) setErreurCamera('La détection automatique n’est pas disponible dans ce navigateur. Collez le QR ci-dessous.')
      arreterDetection.current = demarrerDetectionQr(video.current!, ({ valeur }) => {
        if (verrou.current) return
        verrou.current = true
        void onControler(valeur).finally(() => { fermer() })
      })
    }).catch(() => setErreurCamera('Caméra indisponible. Vérifiez l’autorisation puis utilisez la saisie manuelle.'))
    return () => { annule = true; arreterDetection.current?.(); arreterDetection.current = null; fermerCamera(flux.current); flux.current = null }
  }, [onControler, ouvert])
  async function soumettre(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!saisie.trim()) return; await onControler(saisie); setSaisie(''); fermer() }
  return <article className="agent-scan-card">
    <div className="agent-card-title"><span><ScanLine size={20} /></span><div><p>Contrôle terrain</p><h2>Scanner un badge</h2></div></div>
    <p>Cadrez le QR numérique de l’élève. La validation est conservée localement, même sans réseau.</p>
    {!ouvert && <button type="button" className="agent-scan-button" disabled={!pret} onClick={() => { setErreurCamera(''); setOuvert(true) }}><Camera size={23} /> Ouvrir le scanner</button>}
    {ouvert && <div className="agent-camera-zone"><video ref={video} muted playsInline aria-label="Aperçu de la caméra pour scanner un QR" /><div className="agent-viewfinder" aria-hidden="true" /><button type="button" className="agent-camera-close" onClick={fermer} aria-label="Fermer le scanner"><X size={18} /></button><p>{erreurCamera || 'Cadrez le QR dans la zone indiquée.'}</p><form onSubmit={soumettre}><label><Keyboard size={15} /> Saisie de secours<textarea value={saisie} onChange={(event) => setSaisie(event.target.value)} placeholder="Collez le QR signé" /></label><button type="submit">Valider le QR</button></form></div>}
    {!cameraQrDisponible() && <p className="agent-warning">La caméra n’est pas disponible sur cet appareil. La saisie de secours reste accessible.</p>}
  </article>
}

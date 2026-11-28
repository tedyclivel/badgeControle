export interface DetectionQr {
  readonly valeur: string
}

interface DetecteurCodeBarres {
  detect(source: ImageBitmapSource): Promise<readonly { readonly rawValue: string }[]>
}

interface ConstructeurDetecteurCodeBarres {
  new (options?: { readonly formats?: readonly string[] }): DetecteurCodeBarres
}

function detecteurDisponible(): ConstructeurDetecteurCodeBarres | undefined {
  return (window as Window & { BarcodeDetector?: ConstructeurDetecteurCodeBarres }).BarcodeDetector
}

export function cameraQrDisponible(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

export function detectionQrDisponible(): boolean {
  return Boolean(detecteurDisponible())
}

export async function ouvrirCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
  video.srcObject = flux
  await video.play()
  return flux
}

export function fermerCamera(flux: MediaStream | null): void {
  flux?.getTracks().forEach((piste) => piste.stop())
}

export function demarrerDetectionQr(video: HTMLVideoElement, recevoir: (detection: DetectionQr) => void): () => void {
  const Constructeur = detecteurDisponible()
  if (!Constructeur) return () => undefined
  const detecteur = new Constructeur({ formats: ['qr_code'] })
  let actif = true
  let enCours = false
  let identifiant: number | undefined
  const boucle = async () => {
    if (!actif) return
    if (!enCours && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      enCours = true
      try {
        const [code] = await detecteur.detect(video)
        if (code?.rawValue) recevoir({ valeur: code.rawValue })
      } catch {
        // Le flux peut être momentanément indisponible : la boucle reprend.
      } finally {
        enCours = false
      }
    }
    identifiant = window.requestAnimationFrame(() => void boucle())
  }
  void boucle()
  return () => {
    actif = false
    if (identifiant) window.cancelAnimationFrame(identifiant)
  }
}

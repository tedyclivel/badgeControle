import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Download, QrCode, RefreshCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Donnees } from "../depot";
import {
  encoderCodeQr,
  genererCodeQr,
  type ReponseGenerationQr,
} from "../infrastructure/generateur_qr_supabase";

interface BadgeDisponible {
  readonly id: string;
  readonly eleve: string;
  readonly classe: string;
}

function telechargerQr(contenu: string, nom: string): void {
  const fichier = new Blob([contenu], { type: "text/plain;charset=utf-8" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = `${nom}.txt`;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

function telechargerImageQr(identifiant: string, nom: string): void {
  const image = document.getElementById(identifiant);
  if (!(image instanceof SVGElement)) return;
  const fichier = new Blob([image.outerHTML], { type: "image/svg+xml;charset=utf-8" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = `${nom}.svg`;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

function formatHeure(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

export function GenerateurQr({ db, donnees }: { readonly db: SupabaseClient; readonly donnees: Donnees }) {
  const [ouvert, setOuvert] = useState(false);
  const badges = useMemo<BadgeDisponible[]>(() => {
    const eleves = new Map(donnees.eleves.map((eleve) => [eleve.id, eleve]));
    const classes = new Map(donnees.classes.map((classe) => [classe.id, classe.name]));
    return donnees.badges
      .filter((badge) => badge.status === "ACTIVE")
      .flatMap((badge) => {
        const eleve = eleves.get(badge.student_id);
        return eleve
          ? [{ id: badge.id, eleve: eleve.full_name, classe: classes.get(eleve.class_id) ?? "Sans classe" }]
          : [];
      })
      .sort((a, b) => a.eleve.localeCompare(b.eleve, "fr"));
  }, [donnees]);
  const [badgeId, setBadgeId] = useState("");
  const [generation, setGeneration] = useState<ReponseGenerationQr>();
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const badge = badges.find((item) => item.id === badgeId);
  const code = generation?.code;
  const contenu = code ? encoderCodeQr(code) : "";

  async function generer(): Promise<void> {
    if (!badgeId) {
      setErreur("Sélectionnez d’abord un élève ayant un badge actif.");
      return;
    }
    setEnCours(true);
    setErreur("");
    try {
      setGeneration(await genererCodeQr(db, badgeId));
    } catch {
      setGeneration(undefined);
      setErreur("Génération impossible. Vérifiez que la fonction QR et sa clé de signature sont configurées.");
    } finally {
      setEnCours(false);
    }
  }

  return <>
    <button type="button" className="rd-qr-open" onClick={() => setOuvert(true)}>
      <QrCode size={17} /> Générer un QR
    </button>
    {ouvert && <div className="rd-qr-backdrop" role="presentation" onMouseDown={() => setOuvert(false)}>
      <section className="rd-qr-modal" role="dialog" aria-modal="true" aria-labelledby="titre-qr" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span><QrCode size={19} /></span><div><h2 id="titre-qr">QR de contrôle</h2><p>Générez un QR signé, valable cinq minutes.</p></div></div>
          <button type="button" aria-label="Fermer" onClick={() => setOuvert(false)}><X size={19} /></button>
        </header>
        <label className="rd-qr-select">Élève et badge actif
          <select value={badgeId} onChange={(event) => { setBadgeId(event.target.value); setGeneration(undefined); setErreur(""); }}>
            <option value="">Choisir un élève</option>
            {badges.map((item) => <option key={item.id} value={item.id}>{item.eleve} · {item.classe}</option>)}
          </select>
        </label>
        <button type="button" className="rd-qr-generate" onClick={() => void generer()} disabled={enCours || !badges.length}>
          <RefreshCw size={16} className={enCours ? "rd-spin" : ""} /> {enCours ? "Génération…" : "Générer le QR signé"}
        </button>
        {erreur && <p className="rd-qr-error" role="alert">{erreur}</p>}
        {code && badge && <div className="rd-qr-result">
          <div className="rd-qr-image"><QRCodeSVG id={`qr-${code.id}`} value={contenu} size={320} level="L" includeMargin /></div>
          <div><strong>{badge.eleve}</strong><span>{badge.classe}</span><p>Valide jusqu’à <b>{formatHeure(code.valable_jusqu_a)}</b></p><small>Le QR est signé et à usage unique. Présentez-le immédiatement au terminal Agent.</small>
            <button type="button" className="rd-qr-download" onClick={() => telechargerImageQr(`qr-${code.id}`, `passage-qr-${code.id}`)}><Download size={15} /> Télécharger l’image QR</button>
            <button type="button" className="rd-qr-download" onClick={() => telechargerQr(contenu, `passage-qr-${code.id}`)}><Download size={15} /> Télécharger le contenu QR</button>
            <button type="button" className="rd-qr-download" onClick={() => telechargerQr(JSON.stringify(generation.clePublique, null, 2), "passage-cle-publique-qr")}><Download size={15} /> Télécharger la clé du terminal</button>
          </div>
        </div>}
        {!badges.length && <p className="rd-qr-error">Aucun badge actif n’est disponible dans cet établissement.</p>}
      </section>
    </div>}
  </>;
}

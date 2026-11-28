import { useMemo, useState, type ReactNode } from "react";
import { useDashboard } from "./useDashboard";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Activity,
  Bell,
  ChevronDown,
  Clock3,
  Filter,
  GraduationCap,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRoundMinus,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import type { Donnees } from "./depot";
import { indicateurs } from "./indicateurs";
import { Card, CardTitle } from "../../components/ui/card";
import "@fontsource-variable/inter";
import "./responsable.css";

function ChartCard({
  titre,
  children,
  id,
}: {
  titre: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Card id={id}>
      <CardTitle>{titre}</CardTitle>
      {children}
    </Card>
  );
}
function DataTable({
  titres,
  lignes,
}: {
  titres: string[];
  lignes: string[][];
}) {
  return lignes.length ? (
    <div className="rd-scroll">
      <table>
        <thead>
          <tr>
            {titres.map((t) => (
              <th key={t}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p>Aucun résultat pour ces filtres.</p>
  );
}
const libelles: Record<string, string> = {
  ACCEPTED: "Validé",
  REJECTED: "Refusé",
  REVIEW: "À vérifier",
  PROCESSED: "Traité",
  RECEIVED: "Reçu",
  OPEN: "Ouverte",
  RESOLVED: "Résolue",
  MISSING: "Passage manquant",
  OUTSIDE_WINDOW: "Hors fenêtre",
  UNEXPECTED_CHECKPOINT: "Point inattendu",
  DUPLICATE_SCAN: "Double scan",
  QR_DUPLICATION: "QR dupliqué",
  UNRELIABLE_CLOCK: "Horloge incertaine",
};
const vert = "#2ECC71";
const tooltip = {
  background: "#222c3a",
  color: "white",
  border: 0,
  borderRadius: 5,
};
function AttendanceChart({ v }: { v: ReturnType<typeof indicateurs> }) {
  return (
    <ChartCard titre="Évolution des présences">
      <ResponsiveContainer width="100%" height={218}>
        <LineChart data={v.courbe}>
          <CartesianGrid stroke="#edf0f3" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) =>
              String(v).slice(5).split("-").reverse().join("/")
            }
            minTickGap={22}
          />
          <YAxis width={30} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltip}
            cursor={{ stroke: vert, strokeWidth: 14, opacity: 0.15 }}
          />
          <Line
            type="monotone"
            name="Élèves présents"
            dataKey="valeur"
            stroke={vert}
            strokeWidth={2.5}
            dot={{ r: 3, fill: "white" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
function StudentsByClassChart({ v }: { v: ReturnType<typeof indicateurs> }) {
  const [barre, setBarre] = useState("");
  return (
    <ChartCard titre="Élèves par classe" id="classes">
      <ResponsiveContainer width="100%" height={218}>
        <BarChart data={v.classes}>
          <XAxis dataKey="nom" />
          <YAxis width={28} allowDecimals={false} />
          <Tooltip contentStyle={tooltip} />
          <Bar
            dataKey="valeur"
            name="Élèves"
            maxBarSize={36}
            onClick={(_, i) => setBarre(v.classes[i].nom)}
          >
            {v.classes.map((c, i) => (
              <Cell
                key={c.nom}
                fill={(barre ? c.nom === barre : i === 0) ? vert : "#e5e7eb"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
function BadgeDistributionChart({ v }: { v: ReturnType<typeof indicateurs> }) {
  return (
    <ChartCard titre="Répartition des badges" id="badges">
      {v.totalBadges ? (
        <div className="rd-circles">
          {[v.actifs, v.totalBadges - v.actifs].map((n, i) => (
            <div key={i}>
              <b>{Math.round((n * 100) / v.totalBadges)} %</b>
              <span>
                {i ? "Non actifs" : "Actifs"} · {n}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p>Aucun badge enregistré.</p>
      )}
    </ChartCard>
  );
}
function AttendanceRanking({ v }: { v: ReturnType<typeof indicateurs> }) {
  return (
    <ChartCard titre="Meilleure assiduité">
      {v.classement.length ? (
        <ol>
          {v.classement.map((e, i) => (
            <li key={i} className="rd-rang">
              <span className="rd-avatar">{e.nom[0]}</span>
              <strong>{e.nom}</strong>
              <small>{e.taux} %</small>
              <span>{e.jours} j</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>Aucun jour de présence attendu pour cette sélection.</p>
      )}
    </ChartCard>
  );
}
function WeeklyAnomaliesChart({ v }: { v: ReturnType<typeof indicateurs> }) {
  return (
    <ChartCard titre="Anomalies hebdomadaires">
      <ResponsiveContainer width="100%" height={185}>
        <RadarChart data={v.semaine}>
          <PolarGrid />
          <PolarAngleAxis dataKey="nom" />
          <Radar
            name="Anomalies"
            dataKey="valeur"
            stroke={vert}
            fill={vert}
            fillOpacity={0.25}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
function Dashboard({ d }: { d: Donnees }) {
  const [choix, setChoix] = useState(""),
    [periode, setPeriode] = useState(30);
  const [filtre, setFiltre] = useState({ classe: "", jours: 30 });
  const v = useMemo(
    () => indicateurs(d, filtre.classe, filtre.jours),
    [d, filtre],
  );

  const etudiant = new Map(d.eleves.map((e) => [e.id, e]));
  const classes = new Map(d.classes.map((c) => [c.id, c.name]));
  const points = new Map(d.points.map((p) => [p.id, p.label]));
  const heure = (s: string) =>
    new Date(s).toLocaleString("fr", {
      timeZone: d.ecole.timezone,
      dateStyle: "short",
      timeStyle: "short",
    });
  return (
    <>
      <form
        className="rd-filtres"
        onSubmit={(e) => {
          e.preventDefault();
          setFiltre({ classe: choix, jours: periode });
        }}
      >
        <select
          aria-label="Classe"
          value={choix}
          onChange={(e) => setChoix(e.target.value)}
        >
          <option value="">Toutes les classes</option>
          {d.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Période"
          value={periode}
          onChange={(e) => setPeriode(Number(e.target.value))}
        >
          {[7, 14, 30].map((n) => (
            <option key={n} value={n}>
              {n} derniers jours
            </option>
          ))}
        </select>
        <button>
          <Filter size={15} /> Filtrer
        </button>
      </form>
      <div className="rd-stats">
        {[
          { titre: "Élèves inscrits", n: v.inscrits, Icon: GraduationCap },
          { titre: "Présents aujourd’hui", n: v.presents, Icon: LogIn },
          { titre: "Passages manquants", n: v.manquants, Icon: UserRoundMinus },
          { titre: "Retards", n: v.retards, Icon: Clock3 },
        ].map(({ titre, n, Icon }) => (
          <article
            key={titre}
            title={
              titre === "Retards"
                ? "Passages après la fin de la fenêtre associée à une anomalie hors fenêtre."
                : titre
            }
          >
            <i>
              <Icon />
            </i>
            <div>
              <strong>{n}</strong>
              <small>{titre}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="rd-first" id="rapports">
        <AttendanceChart v={v} />
        <StudentsByClassChart v={v} />
      </div>
      <div className="rd-three">
        <BadgeDistributionChart v={v} />
        <AttendanceRanking v={v} />
        <WeeklyAnomaliesChart v={v} />
      </div>
      <ChartCard titre="Passages récents" id="passages">
        <DataTable
          titres={[
            "Élève",
            "Classe",
            "Point de contrôle",
            "Heure",
            "Validation",
            "Synchronisation",
          ]}
          lignes={v.passages.slice(0, 10).map((p) => {
            const e = etudiant.get(p.student_id);
            return [
              e?.full_name ?? "—",
              classes.get(e?.class_id ?? "") ?? "—",
              points.get(p.checkpoint_id) ?? "—",
              heure(p.effective_time ?? p.server_received_at),
              libelles[p.validation_status],
              libelles[p.sync_status],
            ];
          })}
        />
      </ChartCard>
      <ChartCard titre="Anomalies récentes" id="anomalies">
        <DataTable
          titres={["Élève", "Anomalie", "Détection", "Statut", "Résolution"]}
          lignes={v.anomalies
            .slice(0, 10)
            .map((a) => [
              etudiant.get(a.student_id)?.full_name ?? "—",
              libelles[a.type] ?? a.type,
              heure(a.detected_at),
              libelles[a.status],
              a.resolved_at ? heure(a.resolved_at) : "—",
            ])}
        />
      </ChartCard>
      <ChartCard titre="Synthèse journalière" id="syntheses">
        {v.syntheses[0] ? (
          <>
            <small>
              {v.syntheses[0].day} · {classes.get(v.syntheses[0].class_id)} ·{" "}
              {v.syntheses[0].source === "MODEL" ? "Modèle IA" : "Mode dégradé"}
            </small>
            <p>{v.syntheses[0].text}</p>
          </>
        ) : (
          <p>Aucune synthèse enregistrée sur cette période.</p>
        )}
      </ChartCard>
    </>
  );
}

const sections = [
  ["Vue d’ensemble", "accueil"],
  ["Gestion des passages", "passages"],
  ["Élèves", "classes"],
  ["Rapports", "rapports"],
  ["Badges", "badges"],
  ["Anomalies", "anomalies"],
  ["Synthèses IA", "syntheses"],
];
export default function ResponsableLayout({
  db,
  ecole,
  nom,
}: {
  db: SupabaseClient;
  ecole: string;
  nom: string;
}) {
  const { d, erreur, setErreur, reessayer, essai } = useDashboard(db, ecole);
  const [recherche, chercher] = useState(""),
    [actif, activer] = useState("accueil"),
    [menu, ouvrir] = useState("");
  function aller(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
    activer(id);
    ouvrir("");
    chercher("");
  }
  const initiales = nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
  return (
    <div className="rd" id="accueil">
      <nav aria-label="Navigation Responsable">
        <div className="rd-logo">
          <Activity /> Passage
        </div>
        <button
          className="rd-mobile"
          aria-label="Navigation"
          onClick={() => ouvrir(menu === "nav" ? "" : "nav")}
        >
          <Menu />
        </button>
        <div className={"rd-links " + (menu === "nav" ? "ouvert" : "")}>
          {sections.slice(0, 4).map(([titre, id]) => (
            <button
              key={id}
              aria-current={actif === id ? "page" : undefined}
              onClick={() => aller(id)}
            >
              {titre}
            </button>
          ))}
        </div>
        <div className="rd-tools">
          <label>
            <Search size={15} />
            <input
              aria-label="Rechercher une rubrique"
              placeholder="Rechercher…"
              value={recherche}
              onChange={(e) => chercher(e.target.value)}
            />
          </label>
          <button
            aria-label="Notifications sortantes"
            onClick={() => ouvrir(menu === "messages" ? "" : "messages")}
          >
            <Bell size={18} />
          </button>
          <button
            aria-label="Rubriques complémentaires"
            onClick={() => ouvrir(menu === "plus" ? "" : "plus")}
          >
            <Settings size={18} />
          </button>
          <button
            aria-label="Profil"
            onClick={() => ouvrir(menu === "profil" ? "" : "profil")}
          >
            <span className="rd-avatar">{initiales}</span>
            <ChevronDown size={13} />
          </button>
        </div>
        {(recherche || menu === "plus") && (
          <div className="rd-pop">
            {menu === "plus" && !recherche && (
              <>
                <strong>Établissement</strong>
                <p>{d?.ecole.name}</p>
              </>
            )}
            {sections
              .filter(([t]) =>
                t.toLocaleLowerCase().includes(recherche.toLocaleLowerCase()),
              )
              .map(([t, id]) => (
                <button key={id} onClick={() => aller(id)}>
                  {t}
                </button>
              ))}
            {recherche &&
              !sections.some(([t]) =>
                t.toLowerCase().includes(recherche.toLowerCase()),
              ) &&
              "Aucune rubrique trouvée."}
            {menu === "plus" && !recherche && (
              <details>
                <summary>Prochaines pages de gestion</summary>
                {[
                  "Parents",
                  "Agents",
                  "Points de contrôle",
                  "Itinéraires",
                  "Fenêtres et exceptions",
                  "Notifications",
                  "Paramètres",
                ].map((t) => (
                  <span className="rd-futur" key={t}>
                    {t}
                  </span>
                ))}
              </details>
            )}
          </div>
        )}
        {menu === "messages" && (
          <div className="rd-pop">
            <strong>Notifications sortantes</strong>
            <p>{d ? d.messagesEnAttente + " en attente" : "Chargement…"}</p>
          </div>
        )}
        {menu === "profil" && (
          <div className="rd-pop">
            <strong>{nom}</strong>
            <p>{d?.ecole.name}</p>
            <button
              onClick={async () => {
                const { error } = await db.auth.signOut({ scope: "local" });
                if (error) setErreur(true);
              }}
            >
              <LogOut size={15} /> Se déconnecter
            </button>
          </div>
        )}
      </nav>
      <div className="rd-body">
        <div className="rd-greeting">
          <span className="rd-avatar">{initiales}</span>
          <div>
            <strong>Bonjour, {nom.trim().split(" ")[0]} !</strong>
            <p>Voici un aperçu de l’activité de votre établissement.</p>
          </div>
        </div>
        {erreur ? (
          <article role="alert" className="rd-card">
            Chargement impossible.{" "}
            <button
              onClick={() => {
                setErreur(false);
                reessayer(essai + 1);
              }}
            >
              Réessayer
            </button>
          </article>
        ) : d ? (
          <Dashboard d={d} />
        ) : (
          <article role="status" className="rd-card">
            Chargement du tableau de bord…
          </article>
        )}
      </div>
    </div>
  );
}

import type { Donnees } from "./depot";

export function indicateurs(
  d: Donnees,
  classe: string,
  duree: number,
  maintenant = new Date(),
) {
  const format = new Intl.DateTimeFormat("sv-SE", {
    timeZone: d.ecole.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const jour = (date: string) => format.format(new Date(date));
  const fin = format.format(maintenant);
  const jours = Array.from({ length: duree }, (_, i) =>
    new Date(Date.parse(fin) - (duree - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const eleves = d.eleves.filter((e) => !classe || e.class_id === classe);
  const ids = new Set(eleves.map((e) => e.id));
  const passages = d.passages
    .filter(
      (p) =>
        ids.has(p.student_id) &&
        jours.includes(jour(p.effective_time ?? p.server_received_at)),
    )
    .sort(
      (a, b) =>
        Date.parse(b.effective_time ?? b.server_received_at) -
        Date.parse(a.effective_time ?? a.server_received_at),
    );
  const anomalies = d.anomalies
    .filter((a) => ids.has(a.student_id) && jours.includes(a.day))
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  const courbe = jours.map((date) => ({
    date,
    valeur: new Set(
      passages
        .filter(
          (p) =>
            p.validation_status === "ACCEPTED" &&
            p.effective_time &&
            jour(p.effective_time) === date,
        )
        .map((p) => p.student_id),
    ).size,
  }));
  const inscrits = eleves.filter((e) => e.active);
  const badges = d.badges.filter((b) => ids.has(b.student_id));
  const horaires = new Map(d.fenetres.map((f) => [f.id, f.ends_at]));
  const instants = new Map(passages.map((p) => [p.id, p.effective_time]));
  const horloge = new Intl.DateTimeFormat("fr", {
    timeZone: d.ecole.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const retards = anomalies.filter((a) => {
    const instant = instants.get(a.passage_id ?? "");
    const limite = horaires.get(a.time_window_id ?? "");
    return (
      a.type === "OUTSIDE_WINDOW" &&
      instant &&
      limite &&
      horloge.format(new Date(instant)) > limite
    );
  }).length;
  const classement = inscrits
    .flatMap((e) => {
      const trajets = d.trajets.filter(
        (t) => t.student_id === e.id && t.active,
      );
      const attendus = jours.filter(
        (j) =>
          !d.exceptions.some(
            (x) => x.day === j && (!x.student_id || x.student_id === e.id),
          ) &&
          trajets.some(
            (t) =>
              t.valid_from <= j &&
              (!t.valid_until || j <= t.valid_until) &&
              d.fenetres.some(
                (f) =>
                  f.itinerary_id === t.id &&
                  f.weekdays.includes(new Date(j).getUTCDay() || 7),
              ),
          ),
      );
      if (!attendus.length) return [];
      const presents = new Set(
        passages
          .filter(
            (p) =>
              p.student_id === e.id &&
              p.validation_status === "ACCEPTED" &&
              p.effective_time &&
              attendus.includes(jour(p.effective_time)),
          )
          .map((p) => jour(p.effective_time!)),
      ).size;
      return [
        {
          nom: e.full_name,
          jours: presents,
          taux: Math.round((100 * presents) / attendus.length),
        },
      ];
    })
    .sort((a, b) => b.taux - a.taux || b.jours - a.jours)
    .slice(0, 6);
  return {
    retards,
    classement,
    inscrits: inscrits.length,
    presents: courbe.at(-1)?.valeur ?? 0,
    manquants: anomalies.filter((a) => a.type === "MISSING").length,
    courbe,
    classes: d.classes
      .filter((c) => !classe || c.id === classe)
      .map((c) => ({
        nom: c.name,
        valeur: inscrits.filter((e) => e.class_id === c.id).length,
      })),
    actifs: badges.filter((b) => b.status === "ACTIVE").length,
    totalBadges: badges.length,
    passages,
    anomalies,
    semaine: jours.slice(-7).map((date) => ({
      date,
      nom: new Intl.DateTimeFormat("fr", {
        weekday: "short",
        timeZone: "UTC",
      }).format(new Date(date)),
      valeur: anomalies.filter((a) => a.day === date).length,
    })),
    syntheses: d.syntheses
      .filter(
        (s) => (!classe || s.class_id === classe) && jours.includes(s.day),
      )
      .sort((a, b) => b.day.localeCompare(a.day)),
  };
}

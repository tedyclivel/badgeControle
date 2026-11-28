import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export async function lireDashboard(db: SupabaseClient, ecole: string) {
  async function lire<T>(
    table: string,
    schema: z.ZodType<T>,
    colonnes: string,
    date?: string,
  ) {
    const lignes: T[] = [];
    for (let debut = 0; ; debut += 500) {
      let requete = db
        .from(table)
        .select(colonnes)
        .eq("school_id", ecole)
        .order("id");
      if (date)
        requete = requete.gte(
          date,
          new Date(Date.now() - 32 * 86400000).toISOString().slice(0, 10),
        );
      const { data, error } = await requete.range(debut, debut + 499);
      if (error) throw error;
      lignes.push(...schema.array().parse(data));
      if (data.length < 500) return lignes;
    }
  }
  const s = z.string();
  const libelle = z.object({ id: s, name: s });
  const [
    ec,
    classes,
    eleves,
    badges,
    passages,
    anomalies,
    points,
    syntheses,
    trajets,
    fenetres,
    exceptions,
    messages,
  ] = await Promise.all([
    db
      .from("schools")
      .select("name,timezone")
      .eq("id", ecole)
      .single()
      .throwOnError(),
    lire("classes", libelle, "id,name"),
    lire(
      "students",
      z.object({ id: s, full_name: s, class_id: s, active: z.boolean() }),
      "id,full_name,class_id,active",
    ),
    lire("badges", z.object({ id: s, student_id: s, status: s }), "id,student_id,status"),
    lire(
      "passages",
      z.object({
        id: s,
        student_id: s,
        checkpoint_id: s,
        effective_time: s.nullable(),
        server_received_at: s,
        validation_status: s,
        sync_status: s,
      }),
      "id,student_id,checkpoint_id,effective_time,server_received_at,validation_status,sync_status",
      "server_received_at",
    ),
    lire(
      "anomalies",
      z.object({
        student_id: s,
        passage_id: s.nullable(),
        time_window_id: s.nullable(),
        type: s,
        status: s,
        day: s,
        detected_at: s,
        resolved_at: s.nullable(),
      }),
      "student_id,passage_id,time_window_id,type,status,day,detected_at,resolved_at",
      "day",
    ),
    lire("checkpoints", z.object({ id: s, label: s }), "id,label"),
    lire(
      "daily_summaries",
      z.object({
        class_id: s,
        day: s,
        text: s,
        source: s,
        fallback_reason: s.nullable(),
      }),
      "class_id,day,text,source,fallback_reason",
      "day",
    ),
    lire(
      "itineraries",
      z.object({
        id: s,
        student_id: s,
        active: z.boolean(),
        valid_from: s,
        valid_until: s.nullable(),
      }),
      "id,student_id,active,valid_from,valid_until",
    ),
    lire(
      "time_windows",
      z.object({
        id: s,
        itinerary_id: s,
        weekdays: z.number().array(),
        ends_at: s,
      }),
      "id,itinerary_id,weekdays,ends_at",
    ),
    lire(
      "schedule_exceptions",
      z.object({ student_id: s.nullable(), day: s }),
      "student_id,day",
      "day",
    ),
    db
      .from("outgoing_messages")
      .select("id", { count: "exact", head: true })
      .eq("school_id", ecole)
      .eq("status", "PENDING")
      .throwOnError(),
  ]);
  return {
    ecole: z.object({ name: s, timezone: s }).parse(ec.data),
    messagesEnAttente: messages.count ?? 0,
    classes,
    eleves,
    badges,
    passages,
    anomalies,
    points,
    syntheses,
    trajets,
    fenetres,
    exceptions,
  };
}
export type Donnees = Awaited<ReturnType<typeof lireDashboard>>;

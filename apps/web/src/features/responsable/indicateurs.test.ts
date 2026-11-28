import { expect, it } from "vitest";
import { indicateurs } from "./indicateurs";
import type { Donnees } from "./depot";

it("compte chaque élève une fois selon le jour local et limite les résultats à la classe", () => {
  const passage = {
    id: "p1",
    student_id: "a",
    checkpoint_id: "p",
    effective_time: "2026-11-27T23:15:00Z",
    server_received_at: "2026-11-27T23:16:00Z",
    validation_status: "ACCEPTED",
    sync_status: "PROCESSED",
  };
  const d: Donnees = {
    ecole: { name: "Test", timezone: "Africa/Douala" },
    classes: [],
    messagesEnAttente: 0,
    eleves: ["a", "b"].map((id) => ({
      id,
      class_id: id,
      full_name: id,
      active: true,
    })),
    trajets: [],
    fenetres: [],
    exceptions: [],
    badges: [],
    passages: [passage, passage, { ...passage, student_id: "b" }],
    points: [],
    anomalies: [],
    syntheses: [],
  };
  const v = indicateurs(d, "a", 7, new Date("2026-11-28T02:00:00Z"));
  expect(v.inscrits).toBe(1);
  expect(v.presents).toBe(1);
  expect(v.passages).toHaveLength(2);
  expect(v.courbe.at(-1)).toEqual({ date: "2026-11-28", valeur: 1 });
});

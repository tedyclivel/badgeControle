import { useState, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lireDashboard, type Donnees } from "./depot";
export function useDashboard(db: SupabaseClient, ecole: string) {
  const [d, setD] = useState<Donnees>(),
    [erreur, setErreur] = useState(false),
    [essai, reessayer] = useState(0);
  useEffect(() => {
    let valide = true;
    lireDashboard(db, ecole)
      .then((x) => {
        if (valide) setD(x);
      })
      .catch(() => {
        if (valide) setErreur(true);
      });
    return () => {
      valide = false;
    };
  }, [db, ecole, essai]);
  return { d, erreur, setErreur, essai, reessayer };
}

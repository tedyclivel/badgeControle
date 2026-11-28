export interface EnfantParent {
  readonly id: string
  readonly nom: string
}

export interface PassageParentBrut {
  readonly id: string
  readonly student_id: string
  readonly effective_time: string | null
  readonly server_received_at: string
  readonly validation_status: string
  readonly clock_status: string
}

export interface AnomalieParentBrute {
  readonly id: string
  readonly student_id: string
  readonly day: string
  readonly type: string
  readonly status: string
  readonly detected_at: string
}

export interface PassageParent extends PassageParentBrut { readonly enfant: string }
export interface AnomalieParent extends AnomalieParentBrute { readonly enfant: string }

export function construireVueParent(
  enfants: readonly EnfantParent[],
  passages: readonly PassageParentBrut[],
  anomalies: readonly AnomalieParentBrute[],
) {
  const noms = new Map(enfants.map((enfant) => [enfant.id, enfant.nom]))
  const appartientAuParent = <T extends { readonly student_id: string }>(ligne: T) => noms.has(ligne.student_id)
  return {
    enfants,
    passages: passages.filter(appartientAuParent).map((passage) => ({ ...passage, enfant: noms.get(passage.student_id)! }))
      .sort((a, b) => Date.parse(b.effective_time ?? b.server_received_at) - Date.parse(a.effective_time ?? a.server_received_at)),
    anomalies: anomalies.filter(appartientAuParent).map((anomalie) => ({ ...anomalie, enfant: noms.get(anomalie.student_id)! }))
      .sort((a, b) => Date.parse(b.detected_at) - Date.parse(a.detected_at)),
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { construireVueParent } from './indicateurs.ts'

const texte = z.string()
const enfant = z.object({ id: texte, full_name: texte })
const passage = z.object({
  id: texte, student_id: texte, effective_time: texte.nullable(), server_received_at: texte,
  validation_status: texte, clock_status: texte,
})
const anomalie = z.object({
  id: texte, student_id: texte, day: texte, type: texte, status: texte, detected_at: texte,
})

/** Lecture RLS : les deux vues SQL filtrent déjà par auth.uid(). */
export async function lireEspaceParent(db: SupabaseClient) {
  const [enfants, passages, anomalies] = await Promise.all([
    db.from('students').select('id,full_name').eq('active', true).order('full_name').throwOnError(),
    db.from('parent_passages').select('id,student_id,effective_time,server_received_at,validation_status,clock_status')
      .order('server_received_at', { ascending: false }).limit(10).throwOnError(),
    db.from('parent_anomalies').select('id,student_id,day,type,status,detected_at')
      .order('detected_at', { ascending: false }).limit(10).throwOnError(),
  ])
  return construireVueParent(
    enfant.array().parse(enfants.data).map(({ id, full_name }) => ({ id, nom: full_name })),
    passage.array().parse(passages.data),
    anomalie.array().parse(anomalies.data),
  )
}

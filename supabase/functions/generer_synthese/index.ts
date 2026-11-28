import { createClient } from 'npm:@supabase/supabase-js@2'

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return Response.json({ erreur: 'Configuration serveur absente' }, { status: 500 })
  const body = await request.json() as { schoolId?: string; classId?: string; day?: string }
  if (!body.schoolId || !body.classId || !body.day) return Response.json({ erreur: 'schoolId, classId et day requis' }, { status: 400 })
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '')
  if (!token) return Response.json({ erreur: 'Authentification requise' }, { status: 401 })
  const db = createClient(url, key)
  const { data: user } = await db.auth.getUser(token)
  const { data: profile } = user.user ? await db.from('profiles').select('school_id,role,active').eq('id', user.user.id).maybeSingle() : { data: null }
  if (!profile || !profile.active || profile.role !== 'MANAGER' || profile.school_id !== body.schoolId) return Response.json({ erreur: 'Accès refusé' }, { status: 403 })
  const requestHash = await sha256(JSON.stringify({ schoolId: body.schoolId, classId: body.classId, day: body.day, version: 1 }))
  const { data: cached } = await db.from('daily_summaries').select('facts,text,source,fallback_reason').eq('school_id', body.schoolId).eq('request_hash', requestHash).maybeSingle()
  if (cached) return Response.json({ ...cached, cached: true })
  const month = `${body.day.slice(0, 7)}-01`
  const { data: budget } = await db.from('ai_budgets').select('limit_amount,reserved_amount,spent_amount').eq('school_id', body.schoolId).eq('period_start', month).maybeSingle()
  if (budget && Number(budget.reserved_amount) + Number(budget.spent_amount) >= Number(budget.limit_amount)) return Response.json({ erreur: 'Budget IA atteint' }, { status: 429 })
  const { count: passages } = await db.from('passages').select('*', { count: 'exact', head: true }).eq('school_id', body.schoolId).eq('validation_status', 'ACCEPTED').gte('effective_time', `${body.day}T00:00:00Z`).lt('effective_time', `${body.day}T23:59:59Z`)
  const { count: anomalies } = await db.from('anomalies').select('*', { count: 'exact', head: true }).eq('school_id', body.schoolId).eq('day', body.day)
  const facts = { acceptedPassages: passages ?? 0, anomalies: anomalies ?? 0 }
  const text = `${facts.acceptedPassages} passage(s) validé(s) et ${facts.anomalies} anomalie(s) pour la journée.`
  const { data: summary, error } = await db.from('daily_summaries').insert({ school_id: body.schoolId, class_id: body.classId, day: body.day, facts, text, source: 'TEMPLATE', fallback_reason: 'Aucune clé IA configurée', request_hash: requestHash }).select('facts,text,source,fallback_reason').single()
  if (error || !summary) return Response.json({ erreur: 'Impossible d’enregistrer la synthèse' }, { status: 500 })
  await db.from('ai_call_logs').insert({ school_id: body.schoolId, request_hash: requestHash, attempt: 1, model: 'template', input_tokens: 0, output_tokens: 0, estimated_cost: 0, status: 'FALLBACK_NO_API_KEY' })
  return Response.json({ ...summary, cached: false })
})

import { describe, expect, it } from 'vitest'
import { construireVueParent } from './indicateurs.ts'

describe('construireVueParent', () => {
  it('ignore toute donnée qui ne correspond pas aux enfants chargés', () => {
    const vue = construireVueParent(
      [{ id: 'enfant-a', nom: 'Élève Alpha' }],
      [
        { id: 'p1', student_id: 'enfant-a', effective_time: '2026-11-28T08:00:00Z', server_received_at: '2026-11-28T08:00:01Z', validation_status: 'ACCEPTED', clock_status: 'TRUSTED' },
        { id: 'p2', student_id: 'etranger', effective_time: '2026-11-28T09:00:00Z', server_received_at: '2026-11-28T09:00:01Z', validation_status: 'ACCEPTED', clock_status: 'TRUSTED' },
      ],
      [{ id: 'a1', student_id: 'etranger', day: '2026-11-28', type: 'MISSING', status: 'OPEN', detected_at: '2026-11-28T09:00:00Z' }],
    )
    expect(vue.passages).toHaveLength(1)
    expect(vue.passages[0]?.enfant).toBe('Élève Alpha')
    expect(vue.anomalies).toHaveLength(0)
  })
})

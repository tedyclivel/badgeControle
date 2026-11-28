import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1'
import { empreinteSynthese, texteRepli } from './regles.ts'

Deno.test('le repli restitue exactement les faits calculés', () => {
  assertEquals(texteRepli({ acceptedPassages: 12, anomalies: 3 }), '12 passage(s) validé(s) et 3 anomalie(s) pour la journée.')
})

Deno.test('l empreinte est stable et distingue deux demandes différentes', async () => {
  const premiere = await empreinteSynthese({ schoolId: 'a', classId: 'b', day: '2026-11-28', version: 1 })
  assertEquals(premiere, await empreinteSynthese({ schoolId: 'a', classId: 'b', day: '2026-11-28', version: 1 }))
  assertNotEquals(premiere, await empreinteSynthese({ schoolId: 'a', classId: 'b', day: '2026-11-29', version: 1 }))
})

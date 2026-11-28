export interface FaitsSynthese { readonly acceptedPassages: number; readonly anomalies: number }

export function texteRepli(faits: FaitsSynthese): string {
  return `${faits.acceptedPassages} passage(s) validé(s) et ${faits.anomalies} anomalie(s) pour la journée.`
}

export async function empreinteSynthese(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const codeQrSchema = z.object({
  id: z.string(),
  donnees_signees: z.object({
    version: z.literal(1),
    identifiantCodeQr: z.string(),
    identifiantBadge: z.string(),
    identifiantEcole: z.string(),
    numeroSequence: z.number(),
    valableDepuis: z.string(),
    valableJusqua: z.string(),
  }),
  signature_base64: z.string(),
  valable_depuis: z.string(),
  valable_jusqu_a: z.string(),
  etat: z.string(),
});

const reponseSchema = z.object({
  algorithme: z.string(),
  clePublique: z.record(z.string(), z.unknown()),
  codes: z.array(codeQrSchema).min(1),
});

export type CodeQrGenere = z.infer<typeof codeQrSchema>;
export interface ReponseGenerationQr {
  readonly code: CodeQrGenere;
  readonly clePublique: JsonWebKey;
}

export async function genererCodeQr(
  db: SupabaseClient,
  identifiantBadge: string,
): Promise<ReponseGenerationQr> {
  const { data, error } = await db.functions.invoke("generer_codes_qr", {
    body: { identifiantBadge, quantite: 1 },
  });

  if (error) throw error;
  const reponse = reponseSchema.parse(data);
  return { code: reponse.codes[0], clePublique: reponse.clePublique as JsonWebKey };
}

export function encoderCodeQr(code: CodeQrGenere): string {
  return JSON.stringify({
    donnees: code.donnees_signees,
    signatureBase64: code.signature_base64,
  });
}

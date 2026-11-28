import { assertEquals } from 'jsr:@std/assert@1';
import {
  extraireClePublique,
  importerClePrivee,
  importerClePublique,
  signerDonneesCodeQr,
  verifierSignatureCodeQr,
  type DonneesCodeQr,
} from './cryptographie_qr.ts';

const donnees: DonneesCodeQr = {
  version: 1,
  identifiantCodeQr: 'code-opaque',
  identifiantBadge: 'badge-opaque',
  identifiantEcole: 'ecole-opaque',
  numeroSequence: 1,
  valableDepuis: '2026-11-27T08:00:00.000Z',
  valableJusqua: '2026-11-27T08:05:00.000Z',
};

Deno.test('Une signature ECDSA valide est vérifiée avec la clé publique', async () => {
  const paire = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const clePriveeJwk = await crypto.subtle.exportKey('jwk', paire.privateKey);
  const clePubliqueJwk = await crypto.subtle.exportKey('jwk', paire.publicKey);
  const signature = await signerDonneesCodeQr(donnees, await importerClePrivee(clePriveeJwk));

  assertEquals(
    await verifierSignatureCodeQr(donnees, signature, await importerClePublique(clePubliqueJwk)),
    true,
  );
});

Deno.test('Une donnée QR modifiée invalide la signature', async () => {
  const paire = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const clePriveeJwk = await crypto.subtle.exportKey('jwk', paire.privateKey);
  const clePubliqueJwk = await crypto.subtle.exportKey('jwk', paire.publicKey);
  const signature = await signerDonneesCodeQr(donnees, await importerClePrivee(clePriveeJwk));
  const donneesModifiees = { ...donnees, numeroSequence: 2 };

  assertEquals(
    await verifierSignatureCodeQr(donneesModifiees, signature, await importerClePublique(clePubliqueJwk)),
    false,
  );
});

Deno.test('La clé publique extraite ne contient pas la partie privée', () => {
  const clePrivee: JsonWebKey = { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'secret' };

  assertEquals(extraireClePublique(clePrivee), { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' });
});

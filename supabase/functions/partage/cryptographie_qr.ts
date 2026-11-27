export interface DonneesCodeQr {
  readonly version: 1;
  readonly identifiantCodeQr: string;
  readonly identifiantBadge: string;
  readonly identifiantEcole: string;
  readonly numeroSequence: number;
  readonly valableDepuis: string;
  readonly valableJusqua: string;
}

const encodeurTexte = new TextEncoder();

export function serialiserDonneesCodeQr(donnees: DonneesCodeQr): ArrayBuffer {
  const octets = encodeurTexte.encode(JSON.stringify({
    version: donnees.version,
    identifiantCodeQr: donnees.identifiantCodeQr,
    identifiantBadge: donnees.identifiantBadge,
    identifiantEcole: donnees.identifiantEcole,
    numeroSequence: donnees.numeroSequence,
    valableDepuis: donnees.valableDepuis,
    valableJusqua: donnees.valableJusqua,
  }));

  return octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer;
}

export function encoderBase64Url(valeur: ArrayBuffer): string {
  const octets = new Uint8Array(valeur);
  let chaine = '';

  for (const octet of octets) {
    chaine += String.fromCharCode(octet);
  }

  return btoa(chaine).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decoderBase64Url(valeur: string): ArrayBuffer {
  const base64 = valeur.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(valeur.length / 4) * 4, '=');
  const chaine = atob(base64);
  const octets = Uint8Array.from(chaine, (caractere) => caractere.charCodeAt(0));
  return octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer;
}

export async function importerClePrivee(cle: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    cle,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

export async function importerClePublique(cle: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    cle,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
}

export async function signerDonneesCodeQr(donnees: DonneesCodeQr, clePrivee: CryptoKey): Promise<string> {
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    clePrivee,
    serialiserDonneesCodeQr(donnees),
  );

  return encoderBase64Url(signature);
}

export async function verifierSignatureCodeQr(
  donnees: DonneesCodeQr,
  signatureBase64: string,
  clePublique: CryptoKey,
): Promise<boolean> {
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    clePublique,
    decoderBase64Url(signatureBase64),
    serialiserDonneesCodeQr(donnees),
  );
}

export function extraireClePublique(clePrivee: JsonWebKey): JsonWebKey {
  const { d: _secret, ...clePublique } = clePrivee;
  return clePublique;
}

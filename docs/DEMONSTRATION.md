# Scénarios de démonstration

## Préparation (2 minutes)

```bash
npm ci
npx supabase start
npx supabase db reset
# renseigner apps/web/.env.local avec `npx supabase status`
npx supabase functions serve synchroniser_passages
npm run dev -w apps/web
```

Comptes : `responsable@demo.passage.test`, `agent@demo.passage.test`, `parent.a@demo.passage.test` et `parent.b@demo.passage.test`. Mot de passe local : `Passage2026!`.

## Parcours vidéo technique (moins de six minutes)

1. Ouvrir l’espace Responsable : montrer les indicateurs, passages/anomalies récents, filtres et l’étiquette de source de synthèse.
2. Ouvrir l’espace Parent A : montrer uniquement Alpha et Bravo, puis les passages/anomalies projetés par RLS.
3. Ouvrir l’espace Parent B : montrer uniquement Charlie, Delta et Echo. Préciser que pgTAP vérifie aussi les lectures directes interdites.
4. Ouvrir l’espace Agent : sélectionner terminal et point, préparer une clé publique, contrôler un QR signé et constater le compteur local.
5. Couper le réseau dans les outils du navigateur, effectuer un contrôle, puis le rétablir : le compteur décroît après synchronisation. Rejouer le même QR : il est refusé localement.
6. Montrer `npx supabase test db`, puis les trois contrôles GitHub Actions verts.

## Capsule de communication (60 à 90 secondes)

« Passage aide un établissement à suivre les passages d’élèves même lorsque le réseau est dégradé. L’agent contrôle un badge signé, la PWA conserve le scan localement et le synchronise sans doublon. Le Responsable suit les anomalies ; chaque parent ne voit que ses propres enfants grâce au cloisonnement RLS. Une synthèse journalière reste disponible en mode dégradé, sans inventer de chiffres. »

Après `npx supabase db reset`, les données sont exclusivement fictives et couvrent le 27 novembre 2026.

| Élève | Scénario |
|---|---|
| Élève Alpha | Entrée valide, puis sortie attendue manquante. |
| Élève Bravo | Passage hors de la fenêtre autorisée. |
| Élève Charlie | Passage sur un point de contrôle inattendu. |
| Élève Delta | Deux passages distincts à moins de soixante secondes. |
| Élève Echo | Horloge non fiable et passage à revoir. |

Chaque anomalie dispose d’un message sortant simulé et neutre. Une exception d’absence justifiée est aussi fournie pour Élève Echo le 28 novembre 2026.

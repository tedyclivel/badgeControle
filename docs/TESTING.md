# Stratégie de tests et intégration continue

Statut : configuration initiale et premiers tests proposés ; une exécution Deno en échec a été observée. Les suites complètes ne sont pas encore validées. Source : sujet B, sections 2.1, 2.2, 2.4 et 3.4.

## Niveaux de tests

| Suite | Outil | Cible |
|---|---|---|
| Unitaire web | Vitest | Règles de file et de synchronisation, indépendantes du navigateur |
| Unitaire backend | Deno Test | Invariants métier, anomalies, exactitude de la synthèse |
| Base | pgTAP | Contraintes, clés étrangères, RLS, idempotence et isolation |
| Intégration | Deno / Vitest selon adaptateur | API, persistance, concurrence, erreurs de fournisseur |
| Manuel sur PWA | Navigateur et appareils de démonstration | Caméra, cache, IndexedDB, coupures, rejeu, fonctionnement local |

## Configuration CI initiale

Workflow `.github/workflows/ci.yml`, déclenchement `push`, `pull_request` et manuel. Trois jobs indépendants :

- Frontend : Node 24, `npm ci`, lint, Vitest, build TypeScript/Vite.
- Backend : Deno 2, `deno test supabase/functions/_shared`.
- Database : `npm ci`, `npx supabase start`, `npx supabase db reset`, `npx supabase test db`, arrêt même en cas d’échec.

Les images Docker de CI sont téléchargées par le runner GitHub. Les tests ne doivent pas dépendre d’une clé IA réelle ou de données de production. Les versions et lockfiles devront être stabilisés et la configuration réelle vérifiée avant livraison.

## Commandes

```bash
npm run lint -w apps/web
npm run test -w apps/web
npm run build -w apps/web
deno test supabase/functions/_shared
npx supabase test db
```

Les tests SQL nécessitent Supabase démarré. Un test en échec doit faire échouer le job ; ne pas désactiver le contrôle de types ou ignorer une suite pour afficher artificiellement un statut vert.

## Tests initiaux proposés

| Fichier | Couverture prévue | État |
|---|---|---|
| `apps/web/src/features/agent/application/pending-events.test.ts` | Cinq tests : échec de synchronisation, acquittement partiel/complet, acquittement dupliqué, absence de mutation. | Résultat non communiqué. |
| `supabase/functions/_shared/modules/anomalies/domain/duplicate-scan.rule.test.ts` | Cinq tests : 30 s, 59,999 s, 60 s, 90 s et ordre inversé. | Exécution CI observée en échec de typage ; correction proposée. |
| `supabase/tests/infrastructure.test.sql` | Deux vérifications : existence du schéma `auth` et de la table `auth.users`. | Résultat non communiqué. |

Les tests de file ne prouvent pas encore la persistance IndexedDB ni l’idempotence serveur. Les tests de délai ne vérifient pas encore que les événements appartiennent au même badge et sont réellement distincts. Les deux assertions pgTAP ne prouvent pas l’existence du schéma métier ou sa sécurité.

## Incident Deno observé

`deno test supabase/functions/_shared` a échoué sur `npm:@types/node` absent de `node_modules`. Le remplacement de `node:assert/strict` par `jsr:@std/assert@1` a été proposé. Vérifier le nouveau run ; si l’erreur persiste, examiner le mode `nodeModulesDir` et les dépendances Deno/npm sans supprimer le typage.

## Matrice des tests critiques à implémenter

| ID | Scénario | Résultat attendu |
|---|---|---|
| T01 | Parent A demande l’enfant de B, y compris via API de données | Refus côté serveur, aucune donnée retournée. |
| T02 | Agent demande anomalies ou statistiques ; responsable autre école | Refus ; rôle et établissement non modifiables par le client. |
| T03 | Échec de connexion pour compte inconnu ou mauvais mot de passe ; tentatives répétées | Message identique, limitation effective. |
| T04 | Jeton expiré ou session déconnectée | Accès protégé refusé. |
| T05 | Vingt scans valides hors réseau puis synchronisation | Vingt événements persistés, exactement vingt passages acceptés. |
| T06 | Coupure après commit serveur, avant réponse ; reprise du même lot | Pas de perte ni de doublon, acquittements cohérents. |
| T07 | Même UUID et autre contenu ; rejeu de challenge | Conflit ou rejet, aucun nouveau passage accepté. |
| T08 | Photographie présentée ailleurs ; badge révoqué ou remplacé | Refus de preuve ou refus serveur à la synchronisation. |
| T09 | Horloge +2 h ; référence devenue inutilisable | Correction fiable ou revue ; aucune fausse heure de présence. |
| T10 | Fenêtre close sans scan, aucun client connecté | Anomalie automatique unique ; pas d’alerte en présence d’exception. |
| T11 | Scan tardif fiable dans la fenêtre | Réconciliation du passage manquant ; état visible. |
| T12 | Hors fenêtre, point inattendu, deux scans distincts à <60 s | Anomalies attendues ; à 60 s exactes, pas de double scan. |
| T13 | Plafond de messages atteint, y compris concurrence | Anomalies conservées, messages supplémentaires supprimés avec motif. |
| T14 | Clé IA absente, erreur API, schéma invalide deux fois | Gabarit exact ; une nouvelle tentative maximum pour sortie invalide. |
| T15 | Modèle renvoie une valeur inventée ou incohérente | Rejet ou rendu contrôlé ; tous les chiffres issus de la base. |
| T16 | Demandes identiques concurrentes, budget insuffisant | Cache/coalescence ; aucun appel dépassant le plafond réservé. |
| T17 | Clone et seed reproductible, réseau Internet coupé | Démarrage local et parcours de démonstration utilisables après préparation. |

## Vérification finale

Relever les résultats réels de chaque suite et les éventuels scénarios non couverts. Vérifier les logs dans GitHub Actions et le statut du commit livré. Les sept scénarios de la section 3.4 doivent être montrés explicitement dans la vidéo technique, ou une limitation doit être annoncée si non réalisée.

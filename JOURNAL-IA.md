# Journal d’utilisation de l’intelligence artificielle

Ce journal est tenu au fil du travail. Il décrit les usages réels et distingue une proposition de l’IA d’un résultat vérifié. Il ne constitue pas une preuve de réalisation des fonctionnalités envisagées.

## Outils utilisés à ce stade

| Outil | Usage réel à J2 |
|---|---|
| ChatGPT | Analyse du sujet, comparaison des technologies, conception fonctionnelle et architecturale, proposition de modèle de données, stratégie Git, préparation de configurations CI et de tests initiaux, assistance au diagnostic d’erreurs, rédaction de la documentation. |

L’API OpenAI est retenue pour les synthèses du produit, mais son intégration n’est pas encore déclarée opérationnelle. Les outils IA de production vidéo ne sont pas encore utilisés ; ils seront renseignés avec leur usage réel après la réalisation de la capsule.

## Entrées de journal — 25 novembre 2026 (J2)

| Sujet | Contribution de ChatGPT | Décision et contrôle |
|---|---|---|
| Analyse du cahier des charges | Identification des rôles, critères de notation et contraintes | Priorité accordée à la sécurité, au hors ligne, à l’IA robuste et aux scénarios imposés. |
| Architecture | Proposition d’une PWA et d’un monolithe modulaire | PWA validée ; exigence de Clean Architecture et de respect rigoureux de SOLID exprimée par le candidat. |
| Stack | Première proposition Express, Prisma et PostgreSQL ; comparaison avec Supabase | Supabase + Edge Functions retenus après discussion ; validation explicite de la stack. |
| Conception | Modules, règles métier, MVP et proposition de schéma relationnel | Proposition à examiner avant les migrations ; aucune exécution de base métier attestée. |
| Git | Commandes d’initialisation, branches et messages de commit | Dépôt créé et environnement préparé ; correction proposée pour le push volumineux et l’authentification SSH. |
| CI/tests | Workflow GitHub Actions, tests Vitest, Deno et pgTAP initiaux | Une exécution Deno échoue sur `@types/node` ; diagnostic et modification proposés. |
| Documentation | Rédaction des 13 fichiers Markdown | Relecture et comparaison avec les fichiers réellement présents dans le dépôt nécessaires avant publication. |

## Corrections ou propositions écartées — cas réels

### Cas 1 — Révision du choix backend

- **Proposition initiale :** développer un backend Node.js/Express avec Prisma et PostgreSQL.
- **Intervention du candidat :** envisager Supabase plutôt que monter manuellement un backend Node, Django ou Laravel.
- **Décision :** stack Supabase local + Edge Functions/Deno validée ; Express et Prisma ne sont plus retenus.
- **Motif :** mutualiser authentification et infrastructure de données, tout en gardant les règles métier côté serveur et indépendantes du fournisseur. Le délai rend ce compromis pertinent.
- **Vérification :** décision de conception validée dans l’échange ; démarrage complet hors Internet et politiques RLS encore à tester.

### Cas 2 — Correction d’une déclaration d’avancement inexacte

- **Proposition initiale :** un mail J2 présentant la modélisation de la base de données comme réalisée.
- **Intervention du candidat :** contestation de cette affirmation, car le modèle n’était qu’une proposition.
- **Correction :** le point d’avancement distingue conception, préparation et implémentation. Les migrations et la validation du modèle ne sont pas annoncées comme terminées.
- **Motif :** traçabilité honnête de l’état réel du projet ; ne pas attribuer à une proposition d’IA le statut de résultat livré.

### Cas 3 — Correction du test backend après échec de la CI

- **Proposition initiale :** importer `equal` depuis `node:assert/strict` dans `duplicate-scan.rule.test.ts`.
- **Constat réel :** GitHub Actions échoue lors de `deno test supabase/functions/_shared` avec une erreur de résolution de `npm:@types/node`.
- **Correction proposée :** remplacer cet import par `assertEquals` de `jsr:@std/assert@1` et adapter les assertions, plutôt que désactiver le contrôle de types.
- **Motif :** utiliser un outil d’assertion cohérent avec Deno et éviter cette dépendance Node dans le test.
- **Vérification restante :** vérifier le diff effectivement appliqué et le résultat de la prochaine CI ; ne pas annoncer la réussite avant observation.

## Règles d’usage pour la suite

1. Relire le code proposé, comprendre les invariants, exécuter les tests et noter les erreurs observées.
2. Ne pas copier de secrets, de données nominatives d’élèves ou de journaux contenant des informations sensibles dans les outils IA.
3. Consigner les corrections avec leur raison et, si disponible, un commit ou un résultat de test réellement observé.
4. Pouvoir expliquer et modifier chaque partie livrée lors de la restitution, y compris le code proposé par un assistant.

## Production vidéo — à compléter après réalisation

Renseigner l’outil réellement utilisé, les étapes assistées (script, voix off, sous-titres, montage), les corrections humaines et les liens des deux vidéos. Ne pas inscrire d’usage fictif de CapCut, Descript ou d’un autre service.

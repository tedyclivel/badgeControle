# Feuille de route

Planning établi pour une réception du sujet le 23 novembre 2026 et une échéance J5 le 28 novembre 2026 à 23 h 59, conformément au calendrier communiqué. Il s’agit d’un plan de travail, non d’une garantie de livraison intégrale.

## Calendrier

| Jour | Objectif | Résultat visé |
|---|---|---|
| J0 — lundi 23/11 | Réception du sujet | Accusé de réception attendu le jour même ; envoi effectif non documenté ici. |
| J1 — mardi 24/11 | Préparation | Appropriation du sujet ; état précis de cette journée non reconstitué. |
| J2 — mercredi 25/11 | Fondations et point d’étape | Dépôt public, premiers commits, conception, environnement préparé ; transmission du lien et d’une ligne d’avancement. |
| J3 — jeudi 26/11 | Parcours critiques | Migrations, seed, auth/RLS, prototype anti-copie, scan et synchronisation. |
| J4 — vendredi 27/11 | Métier et IA | Fenêtres, anomalies automatiques, notifications, statistiques, gabarit et garde-fous IA ; tests d’intégration. |
| J5 — samedi 28/11 | Validation et livraison | Clone vierge, fonctionnement sans Internet, vérification CI, documentation honnête, vidéos et courriel avant 23 h 59. |

## Séquence de développement

1. Vérifier la CI initiale et l’historique Git ; traiter l’échec de résolution Deno.
2. Valider le démarrage local Supabase, puis les migrations et l’isolation des comptes.
3. Valider rapidement un échange challenge-response hors Internet sur deux appareils ou deux contextes distincts.
4. Implémenter le parcours scan → file → synchronisation → passage → consultation parent autorisée.
5. Ajouter les règles de fenêtre, les exceptions et la détection planifiée ; vérifier la réconciliation tardive.
6. Ajouter la notification simulée et le plafond ; calculer les statistiques et intégrer le repli IA avant le fournisseur externe.
7. Exécuter les scénarios critiques et produire les vidéos ; réserver du temps à la restitution et aux corrections.

## Risques et arbitrages

| Risque | Mesure |
|---|---|
| Délai court | Prioriser la sécurité et les parcours de vérification ; réduire la sophistication graphique. |
| Téléchargements Docker et données mobiles | Laisser GitHub Actions télécharger les images de CI ; préparer malgré tout l’environnement local avant la restitution. |
| Badge anti-copie et réseau | Prototyper avant le CRUD complet ; documenter le support nécessaire et la limite de révocation hors réseau. |
| RLS et sessions | Tests négatifs directs, isolation par établissement et par enfant. |
| IA indisponible | Gabarit exact disponible avant l’intégration du modèle. |
| Fenêtre close pendant une coupure | Réévaluation des anomalies après réception tardive. |
| Vidéos sous-estimées | Préparer tôt le scénario et les jeux de données, sans simuler des fonctionnalités absentes. |

## Remise J2

Le sujet exige un dépôt créé, les premiers commits visibles, un lien et une ligne par courriel indiquant l’avancement et les éventuels blocages. La transmission effective doit être vérifiée par le candidat.

## Remise J5

- Dépôt public et historique lisible ; GitHub Actions au vert sur les tests effectivement fournis.
- README avec lancement, comptes de test, sécurité, mode dégradé et limites ; DECISIONS.md et JOURNAL-IA.md renseignés.
- Démonstration technique de six minutes maximum et capsule de communication de 60–90 secondes, liens accessibles sans autorisation.
- Envoi des sept livrables dans un seul courriel ; préparation d’une restitution de 30 minutes (démonstration, questions, modification en direct).

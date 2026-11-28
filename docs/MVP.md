# Périmètre du MVP

Statut : priorisation initiale validée ; la liste décrit une cible, non des fonctionnalités livrées. Source : sujet B, sections 1, 3 et 4.

## Objectif

Livrer un prototype sécurisé et démontrable localement, plutôt qu’une application complète mais fragile. Les priorités tiennent compte de la grille : sécurité 20 points, fonctionnel 20, IA 15, décisions 10, données 10, code/tests 10, vidéo 10 et dépôt/documentation 5.

| Priorité | Fonctionnalité | Critère d’acceptation minimal |
|---|---|---|
| P0 | Authentification et rôles | Connexion, session limitée, déconnexion effective, permissions côté serveur. |
| P0 | Base et isolation | Migrations et seed reproductibles ; parent A ne lit pas les enfants de B. |
| P0 | Badge anti-copie | Signature/challenge vérifié, photographie refusée, cycle de vie respecté. |
| P0 | Scan hors ligne | Vingt scans valides mis en file persistante sans réseau. |
| P0 | Synchronisation | Exactement vingt passages après reconnexion et reprise interrompue ; pas de double insertion. |
| P0 | Horodatage | Décalage de deux heures corrigé avec justification ou signalé sans fausser les statistiques. |
| P0 | Itinéraire et anomalies | Fenêtres et exceptions, passage manquant déclenché automatiquement ; cinq types d’anomalies visés. |
| P0 | Synthèse IA | Chiffres issus du code, sortie validée, retry borné, fallback, coût plafonné et cache. |
| P0 | Tests et restitution | Tests critiques, CI, documentation exigée, deux vidéos conformes. |
| P1 | Notifications simulées | Message neutre, fournisseur isolé, plafond et motif de suppression visibles. |
| P1 | Interfaces de gestion | CRUD minimal des référentiels et consultation adaptée aux rôles. |
| P2 | Confort visuel | Tableau de bord plus élaboré, filtres avancés et animations, seulement si temps disponible. |

P1 signifie à réaliser après les risques P0, non que l’exigence est facultative dans le sujet. Ne jamais dissimuler une fonction non livrée.

## Hors périmètre

Hébergement en production, nom de domaine, montée en charge, application native séparée, envoi SMS réel, entraînement d’un modèle IA, interface graphique avancée et suite exhaustive de tests. Le support numérique interactif est un choix de prototype à éprouver, pas une exigence explicite de smartphone pour tous les élèves.

## Stratégie de réalisation

Priorité aux fondations reproductibles et à un parcours vertical : un agent enregistre et synchronise un passage valide, le responsable le consulte, le parent autorisé voit son enfant. Ajouter ensuite la détection automatique, le mode dégradé IA et les autres règles. Prototyper le badge et l’exécution locale très tôt car ce sont des risques d’architecture.

## Définition de « terminé »

Une fonctionnalité est déclarée livrée si le code existe, les invariants et contrôles d’accès sont appliqués, les tests pertinents ont été exécutés, et le comportement peut être expliqué et démontré. Une conception, un fichier vide ou un workflow configuré ne suffisent pas à prouver une réalisation.

## État J2

Conception fonctionnelle, choix de stack et préparation du dépôt réalisés ; modèle de données proposé mais non validé, CI initiée avec échec Deno observé. Les fonctionnalités ci-dessus ne sont pas déclarées terminées à ce stade.

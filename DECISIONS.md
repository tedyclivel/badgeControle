# Décisions techniques et métier

Les décisions ci-dessous distinguent les choix validés du candidat et les hypothèses de conception à éprouver. Elles seront mises à jour selon les résultats d’implémentation. Référence : sujet B, sections 2.1, 2.4, 3.6 et 4.

## ADR-001 — PWA unique à trois rôles

- **Statut :** choix validé dans la stack.
- **Retenu :** React/TypeScript/Vite, une PWA responsive, connexion commune et espaces Responsable, Agent, Parent séparés. Cache hors ligne principalement réservé au scan.
- **Écarté :** plusieurs frontends ou une application mobile Flutter séparée.
- **Raison :** réutilisation, simplicité de maintenance, démonstration sur téléphone et ordinateur dans le délai.
- **Compromis :** la caméra et la cryptographie nécessitent un contexte sécurisé ; la synchronisation en arrière-plan dépend du navigateur. Prévoir une reprise au premier plan.

## ADR-002 — Clean Architecture et SOLID

- **Statut :** validé.
- **Retenu :** monolithe modulaire, domaines indépendants des frameworks, cas d’utilisation, ports et adaptateurs. Injection explicite des dépendances, DDD pragmatique.
- **Écarté :** logique dans les composants/controllers, microservices, DDD exhaustif.
- **Raison :** tester les invariants sans base ni API externe et éviter la duplication métier.
- **Compromis :** pas d’interface ou de classe systématique ; les frontières techniques et les comportements variables justifient les abstractions.

## ADR-003 — Supabase local comme infrastructure backend

- **Statut :** stack validée ; fonctionnement local à vérifier.
- **Retenu :** PostgreSQL, Supabase Auth, RLS, migrations SQL, Edge Functions Deno/TypeScript et pg_cron.
- **Écarté :** backend Express/Prisma entièrement développé et dépendance exclusive à Supabase Cloud ; accès direct depuis React à toutes les écritures métier.
- **Raison :** réduire le temps d’infrastructure, préserver les transactions et le cloisonnement, permettre une restitution locale.
- **Compromis :** plusieurs conteneurs à télécharger initialement ; dépendance aux API Supabase isolée dans les adaptateurs. SQL/RLS et authentification resteront spécifiques à l’infrastructure.

## ADR-004 — Badge numérique interactif avec challenge-response

- **Statut :** hypothèse prioritaire à valider.
- **Retenu :** badge opaque, paire de clés ECDSA P-256 ; le terminal agent produit un challenge aléatoire lié à son appareil et au point de contrôle, le badge signe la réponse. L’agent vérifie la signature et consomme le challenge ; le serveur contrôle à nouveau la preuve et l’état du badge.
- **Écarté :** QR statique avec identifiant élève, QR tournant seulement sur une durée donnée (une photographie reste utilisable pendant cette durée).
- **Raison :** empêcher qu’une ancienne photographie suffise à produire une nouvelle réponse valide, y compris sans Internet.
- **Compromis :** support de badge capable de signer, interaction supplémentaire au portail, provisioning préalable. Révocation vérifiable immédiatement au serveur mais connue du terminal hors ligne seulement après mise à jour. Le relais en temps réel et la compromission d’un appareil sont hors garantie. Si le support doit être passif et imprimé, cette solution ne convient pas : clarification et adaptation nécessaires.

## ADR-005 — Synchronisation idempotente et file persistante

- **Statut :** conception proposée.
- **Retenu :** IndexedDB/Dexie, UUID stable par scan, clé d’unicité `(device_id, local_event_id)` en base. Suppression locale uniquement après acquittement correspondant. Même identifiant et même contenu : même résultat ; contenu différent : conflit.
- **Écarté :** file en mémoire, suppression avant réponse, comparaison du seul horaire.
- **Raison :** une coupure peut intervenir après le commit serveur mais avant la réponse ; une nouvelle tentative ne doit ni perdre ni dupliquer le passage.
- **Compromis :** gestion des événements rejetés et des conflits ; tests avec interruption réelle et concurrence.

## ADR-006 — Horodatage fiable ou explicitement incertain

- **Statut :** conception proposée.
- **Retenu :** conserver l’heure locale brute et la réception serveur ; estimer l’heure effective grâce à une référence serveur et un compteur monotone pendant une session continue. Si la référence est absente, trop ancienne ou interrompue, signaler l’incertitude sans inventer d’heure.
- **Écarté :** faire confiance à l’horloge locale ou substituer systématiquement la réception serveur.
- **Raison :** une synchronisation tardive ne constitue pas nécessairement un retard de l’élève.
- **Compromis :** mise en revue de certains événements et réconciliation ultérieure. Le protocole et ses seuils restent à tester.

## ADR-007 — Détection automatique et cinquième anomalie

- **Statut :** conception proposée.
- **Retenu :** pg_cron déclenche régulièrement une opération de détection idempotente des fenêtres closes. Les anomalies événementielles sont évaluées lors de la validation. Cinquième anomalie : `UNRELIABLE_CLOCK`, signalant qu’une heure de passage n’est pas suffisamment fiable.
- **Écarté :** détection déclenchée uniquement à l’ouverture du tableau de bord ; supposer qu’un passage incertain est un retard.
- **Raison :** une absence d’événement doit être détectée sans utilisateur connecté. Une horloge fausse est un risque explicitement mentionné dans le sujet.
- **Compromis :** anomalie de passage manquant réévaluable lors d’un scan tardivement synchronisé. Les exceptions suspendent la détection de la journée. Cadence initiale proposée : une minute ; faisabilité locale à vérifier.

## ADR-008 — Contrôle des accès et atomicité des notifications

- **Statut :** conception proposée.
- **Retenu :** profil mono-établissement et rôle unique pour le MVP, RLS avec refus par défaut, contrôles applicatifs et RPC transactionnelles pour les écritures sensibles ; outbox pour les notifications, plafond par élève et par jour.
- **Écarté :** contrôle de rôle dans React uniquement ; clé privilégiée dans le navigateur ; envoi SMS direct dans le traitement de scan.
- **Raison :** données de mineurs, impossibilité de contourner le métier par une requête directe ; éviter les doublons de notifications et respecter le plafond en concurrence.
- **Compromis :** plusieurs parents peuvent être associés à un enfant ; proposition de notifier chacun dans la limite du plafond (un message par destinataire compte dans le plafond). Aucun fournisseur SMS réel dans le MVP.

## ADR-009 — IA contrainte, exactitude et coût

- **Statut :** choix de conception, fournisseur OpenAI validé dans la stack.
- **Retenu :** calcul serveur des faits ; le modèle renvoie une structure strictement validée, par exemple des choix de formulation dans une liste autorisée. Le code injecte les valeurs numériques. Une seule nouvelle tentative si la sortie est non conforme, puis gabarit local. Journal d’appels, réservation de coût avant appel, plafond et cache par empreinte canonique des faits et paramètres de génération.
- **Écarté :** envoyer les passages bruts et laisser le modèle compter, texte libre sans contrôle, appels non plafonnés.
- **Raison :** empêcher l’invention de statistiques, maîtriser les données transmises et les dépenses, rester utilisable sans clé.
- **Compromis :** formulations plus contraintes ; cache invalidé lorsque les faits changent ; pas de données nominatives communiquées au modèle.

## ADR-010 — GitHub Flow et tests continus

- **Statut :** stratégie retenue ; CI complète à valider.
- **Retenu :** `main`, branches par fonctionnalité, Conventional Commits, Pull Requests et trois suites de tests (Vitest, Deno, pgTAP).
- **Écarté :** Git Flow complet, commit final unique, déploiement continu non demandé.
- **Raison :** historique lisible, régression détectée tôt, exécution des tests sur GitHub sans consommer localement les téléchargements Docker de CI.
- **Compromis :** adapter le nombre de branches et de commits au travail réel ; ne pas sacrifier les fonctions critiques à une procédure trop lourde.

# Conception de la sécurité

Statut : accès de lecture RLS implémenté et testé localement pour le noyau et les ressources métier. Le cycle de vie serveur des badges et la consommation atomique des codes QR sont présents ; la production et la vérification cryptographique des signatures restent à implémenter. Source : sujet B, sections 2.2, 3.2 à 3.4 et 4.

## Menaces et mesures prévues

| Menace | Mesure envisagée | Validation attendue |
|---|---|---|
| Vol ou devinette de mot de passe | Supabase Auth, hachage adapté, minimum huit caractères, limitation des essais | Tester longueur, erreurs génériques et limitation |
| Session expirée ou volée | JWT courte durée, révocation des sessions, contrôle serveur | Refus après déconnexion, y compris jeton non expiré |
| Accès à l’enfant d’un autre parent | RLS et vérification de la relation parent-enfant | Test direct avec deux identités distinctes |
| Escalade de rôle | Rôle stocké côté serveur, non modifiable par l’utilisateur | Essai de modification de profil ou de JWT |
| Contournement par API générée | Refus par défaut et droits SQL minimaux ; écritures métier via opérations dédiées | Test d’accès direct aux tables et RPC |
| Injection SQL et entrées invalides | Zod, paramètres SQL, contraintes et contrôles métier | Entrées malformées et identifiants étrangers |
| XSS | Rendu texte React, pas de HTML utilisateur brut, CSP adaptée | Texte contenant des balises affiché sans exécution |
| Copie de badge et rejeu | Challenge signé, lié à l’appareil, consommation unique | Photographie et réponse déjà utilisée refusées |
| Fuite de secrets ou données de mineurs | Variables d’environnement, minimisation, `.gitignore`, logs expurgés | Inspection du dépôt et de son historique |

## Authentification et déconnexion

Supabase Auth gère les identités et le hachage. Configurer et vérifier le minimum de huit caractères, les limites de connexion et une réponse générique en cas d’identifiants incorrects. Les comptes de démonstration sont créés par un script local ; aucune inscription publique permettant de choisir un rôle n’est prévue.

La suppression de la session dans React ne suffit pas : un JWT peut rester valide jusqu’à son expiration. Le mécanisme envisagé vérifie la validité du JWT, l’activité du profil et l’existence de la session non révoquée lors des opérations protégées. Si des accès directs via PostgREST restent ouverts, ils doivent appliquer des contrôles équivalents en RLS ; sinon, les fermer et exposer des endpoints dédiés. La faisabilité de cette vérification dans Supabase local reste à établir. Tester explicitement un ancien jeton après logout.

Côté navigateur : stockage de session limité au besoin, pas de jeton dans la file de scans ou le cache Service Worker ; protection XSS et expiration de l’autorisation de scan hors ligne. Les choix exacts de persistance des sessions doivent être documentés après implémentation.

## Autorisations et isolation des données

Le backend déduit l’identité du contexte d’authentification vérifié, jamais du `parentId`, `role` ou `schoolId` transmis comme preuve par le client. Les trois rôles sont exclusifs dans le MVP. Le rôle et les rattachements ne sont modifiables que par des opérations autorisées.

| Rôle | Accès autorisé | Accès explicitement interdit |
|---|---|---|
| Responsable | Référentiels, passages, anomalies et synthèses de son établissement | Établissements étrangers et secrets techniques |
| Agent | Appareils autorisés, point de contrôle, preuve minimale et synchronisation | Informations parentales, anomalies, statistiques et historiques généraux |
| Parent | Données minimales, passages et anomalies des enfants liés | Tout autre enfant, clés de badges, preuves techniques et administration |

RLS est actif sur les tables actuellement créées. Les droits des rôles `anon` et `authenticated` sont révoqués, puis `authenticated` reçoit uniquement les droits de lecture nécessaires. Les politiques garantissent qu’un parent lit ses enfants et ses rattachements seulement, qu’un agent ne lit pas les élèves et qu’un responsable est borné à son établissement. Les écritures restent bloquées jusqu’aux RPC dédiées. La cohérence d’établissement est renforcée par les clés étrangères composites. Toute utilisation d’un client privilégié dans une Edge Function exige des contrôles explicites avant l’accès ; une clé privilégiée contourne RLS et ne doit jamais être livrée au navigateur. Les fonctions SQL privilégiées éventuelles sont restreintes et possèdent un `search_path` maîtrisé.

## Badge : garantie et limites

La conception proposée utilise une clé privée non exportable lorsque le support le permet et une clé publique associée au badge. Le challenge est aléatoire, de courte durée locale, lié à l’appareil et au point de contrôle ; la signature couvre le contexte et l’identifiant opaque du badge. Vérification locale et serveur, consommation unique et contrôle de l’état courant. La réémission révoque l’ancien badge de façon atomique.

La protection concerne la réutilisation d’une photographie, pas un relais interactif en temps réel, un appareil compromis ou l’utilisation volontaire du vrai support par un tiers. Un terminal hors réseau ne connaît pas immédiatement les révocations : la validation locale est provisoire, le serveur applique le statut courant à la synchronisation. Un QR imprimé passif ne peut pas signer un challenge ; le support interactif doit être validé avant de revendiquer ce mécanisme.

## Données, secrets et journalisation

- Utiliser uniquement des données fictives dans le dépôt et les vidéos ; limiter les données mises en cache à la preuve, au contexte technique et aux identifiants opaques nécessaires.
- Stocker les clés API et secrets Supabase uniquement dans l’environnement serveur ; fichier d’exemple sans valeur réelle. La clé publique destinée au navigateur n’est pas une autorisation d’accès en elle-même.
- Ne jamais journaliser mots de passe, jetons, clés privées ou prompts contenant des noms d’enfants. Audit minimal des consultations, modifications sensibles et rejets ; accès restreint.
- Le modèle IA ne reçoit que des faits agrégés ; sa sortie est validée et ne peut ni exécuter de commande ni accéder directement à la base.

## Tests et améliorations futures

Les tests négatifs T01–T04 et T07–T09 de [TESTING.md](TESTING.md) sont prioritaires. Avant livraison, vérifier les politiques SQL, les sessions, les secrets dans l’historique et la protection contre la photographie sur deux contextes. Avec davantage de temps : audit indépendant, durcissement CSP, stockage matériel de clés, politique de rétention, mécanisme de révocation des terminaux, surveillance et rotation des secrets. Ces éléments ne sont pas présentés comme implémentés.

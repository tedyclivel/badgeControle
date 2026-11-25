# Passage

Suivi des passages d’élèves par badge, en conditions de réseau dégradé, avec synthèse assistée par intelligence artificielle.

Projet réalisé dans le cadre du test technique Afric’Éduc, sujet B « Passage », pour le poste de stagiaire développeur Full-Stack & IA appliquée.

## Objectif

Permettre à un établissement de suivre les passages de ses élèves aux points de contrôle, même lorsque le réseau est indisponible, de détecter des anomalies et de mettre à disposition des parents les informations relatives à leurs enfants. Une synthèse journalière par classe sera produite à partir de statistiques calculées par l’application.

## Utilisateurs

| Rôle | Responsabilités |
|---|---|
| Responsable | Gérer élèves, badges, points de contrôle et itinéraires ; consulter passages, anomalies et synthèses. |
| Agent | Scanner les badges, conserver les événements hors ligne et les synchroniser. |
| Parent | Consulter exclusivement les passages et anomalies de ses propres enfants. |

## Technologies

- React, TypeScript strict, Vite et Tailwind CSS : une PWA responsive unique, adaptée aux trois rôles.
- Supabase local, PostgreSQL, Supabase Auth, RLS : infrastructure et protection des données.
- Edge Functions TypeScript/Deno : cas d’utilisation et traitements côté serveur ; pg_cron pour les tâches planifiées.
- Service Worker, IndexedDB et Dexie : cache applicatif et file de scans persistante.
- Zod et Web Crypto API : validation des entrées et cryptographie du badge numérique.
- OpenAI API : rédaction contrôlée des synthèses, avec gabarit local de secours.
- Vitest, Deno Test, pgTAP, ESLint, Prettier et GitHub Actions : qualité et automatisation des tests.

La PWA évite de maintenir plusieurs interfaces applicatives séparées. Supabase réduit le travail d’infrastructure sans remplacer la logique métier, qui suit une Clean Architecture modulaire et les principes SOLID. Les choix et leurs compromis sont détaillés dans [DECISIONS.md](DECISIONS.md).

## Organisation cible

```text
apps/web/             # PWA React
supabase/functions/   # Entrées HTTP et modules métier TypeScript
supabase/migrations/  # Schéma et politiques de sécurité SQL
supabase/tests/       # Tests pgTAP
supabase/seed.sql     # Données fictives de démonstration
packages/             # Contrats partagés, si nécessaires
docs/                 # Conception et documentation
.github/workflows/    # CI GitHub Actions
```

## Installation et lancement

Les commandes suivantes correspondent à l’environnement retenu. Leur exécution intégrale à partir d’un clone vierge reste à vérifier avant la livraison finale.

Prérequis : Git, Node.js 24 (version ciblée par la CI), npm, Docker démarré ; Deno 2 pour exécuter les tests backend localement. Supabase CLI est prévu comme dépendance de développement du monorepo.

```bash
git clone https://github.com/tedyclivel/badgeControle.git
cd badgeControle
npm ci
npx supabase start
npx supabase status
```

Après création des migrations et du seed, `npx supabase db reset` reconstruira la base locale (attention : cette commande efface les données locales existantes).

Configuration frontend prévue dans `apps/web/.env.local`, à adapter au contrat de configuration effectivement implémenté :

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Utiliser la clé publique locale fournie par Supabase ; jamais la clé secrète ou `service_role`. Les secrets backend seront fournis hors Git, par l’environnement des Edge Functions. L’IA devra fonctionner sans clé `OPENAI_API_KEY` grâce au mode dégradé.

Dans des terminaux séparés, lorsque les fonctions et la configuration seront prêtes :

```bash
npx supabase functions serve
npm run dev -w apps/web
```

Pour valider la PWA, utiliser également le build de production et son serveur de prévisualisation, dans un contexte sécurisé. Le premier téléchargement des images Docker et des dépendances nécessite Internet. L’objectif de restitution est ensuite un fonctionnement entièrement local, sans accès Internet, à vérifier sur la machine utilisée.

## Comptes de test

Le seed devra créer un responsable, un agent et deux parents, ainsi que cinq élèves fictifs au minimum. Les identifiants et le mode d’obtention des mots de passe de démonstration seront ajoutés après vérification du script de peuplement. Aucun compte réel d’élève ou secret de production ne sera publié.

## Tests et intégration continue

```bash
npm run lint -w apps/web
npm run test -w apps/web
npm run build -w apps/web
deno test supabase/functions/_shared
npx supabase test db
```

La dernière commande suppose une instance Supabase locale démarrée. Le workflow GitHub Actions prévu lance les trois suites à chaque push et Pull Request.

État J2 : une exécution de la suite Deno a échoué lors de la résolution de `@types/node`. Le remplacement de l’assertion Node par `jsr:@std/assert@1` a été proposé ; le résultat de la nouvelle exécution reste à confirmer. Aucun statut global « au vert » n’est revendiqué à ce stade. Voir [TESTING.md](docs/TESTING.md).

## Sécurité

Les mesures suivantes constituent la stratégie de réalisation, et ne sont pas présentées comme déjà opérationnelles :

- Supabase Auth pour le hachage adapté des mots de passe ; longueur minimale de huit caractères, limitation des connexions et erreurs génériques.
- Sessions à durée limitée, déconnexion effective vérifiée côté serveur et contrôle des rôles sur chaque opération protégée.
- Cloisonnement par établissement et par relation parent-enfant, avec RLS et autorisations applicatives.
- Validation serveur des entrées, SQL paramétré ou RPC à paramètres typés ; contraintes PostgreSQL et transactions.
- Rendu du texte comme texte, sans HTML utilisateur non assaini ; aucune donnée nominative dans les requêtes IA.
- Badge numérique interactif avec challenge signé, sous réserve de validation du support et de la faisabilité hors ligne.
- Aucun secret réel versionné ; `.env.example` ne contient que des valeurs fictives ou des noms de variables.

Les tests de sécurité, les limites du modèle de menace et les améliorations envisagées sont décrits dans [SECURITY.md](docs/SECURITY.md).

## Mode dégradé

L’écran de scan doit rester accessible hors réseau après une préparation en ligne. Les événements sont conservés dans IndexedDB, puis transmis de façon idempotente à la reconnexion. Un événement non acquitté ne doit jamais être effacé. Les problèmes d’horloge ou de révocation sont traités explicitement lors de la validation.

Pour l’IA, les statistiques sont calculées par le code. Sans clé, en cas d’indisponibilité, de plafond atteint ou de sortie invalide après la tentative autorisée, un gabarit déterministe produit une synthèse exacte. Le chemin emprunté doit être enregistré. Voir [OFFLINE-STRATEGY.md](docs/OFFLINE-STRATEGY.md).

## État d’avancement — J2 (25 novembre 2026)

- Analyse du sujet, périmètre initial du MVP et choix techniques et architecturaux : définis.
- Dépôt GitHub, stratégie de branches, environnement de développement et structure documentaire : préparés.
- Intégration continue : première exécution backend observée ; correction proposée, résultat à confirmer.
- Modèle de données : proposition de conception, non validée par des migrations ou une exécution.
- À réaliser ou valider : authentification, RLS, migrations/seed, badges, synchronisation réelle, anomalies automatiques, notifications, IA, tests d’intégration, vidéos et lancement local hors Internet.

La documentation reflète une conception et un plan de réalisation, non un produit achevé. Elle sera actualisée selon les fonctionnalités effectivement livrées.

## Documentation

[Conception](docs/DESIGN.md) · [Analyse fonctionnelle](docs/FUNCTIONAL-ANALYSIS.md) · [Architecture](docs/ARCHITECTURE.md) · [MVP](docs/MVP.md) · [Données](docs/DATABASE.md) · [Sécurité](docs/SECURITY.md) · [Hors ligne](docs/OFFLINE-STRATEGY.md) · [Tests](docs/TESTING.md) · [Planning](docs/ROADMAP.md) · [Contribution](CONTRIBUTING.md) · [Journal IA](JOURNAL-IA.md).

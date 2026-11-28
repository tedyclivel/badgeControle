# Passage

Suivi des passages d’élèves par badge, en conditions de réseau dégradé, avec synthèse assistée par intelligence artificielle.

Projet réalisé dans le cadre du test technique Afric’Éduc, sujet B « Passage », pour le poste de stagiaire développeur Full-Stack & IA appliquée.

## État livré — 28 novembre 2026

Le dépôt contient les migrations Supabase, les politiques RLS, les données de démonstration, les Edge Functions, une PWA à trois espaces (Responsable, Agent et Parent), la file de scans IndexedDB et la synchronisation idempotente. La CI valide lint, Vitest, Deno et pgTAP.

Limites assumées : la saisie d’un QR signé est disponible pour la démonstration, mais la capture caméra n’est pas intégrée ; le décalage d’horloge n’est pas encore estimé par la PWA et reste donc signalé comme incertain côté serveur ; aucune diffusion SMS ou e-mail réelle n’est configurée.

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

Les commandes suivantes ont été validées avec la pile Supabase locale.

Prérequis : Git, Node.js 24 (version ciblée par la CI), npm, Docker démarré ; Deno 2 pour exécuter les tests backend localement. Supabase CLI est prévu comme dépendance de développement du monorepo.

```bash
git clone https://github.com/tedyclivel/badgeControle.git
cd badgeControle
npm ci
npx supabase start
npx supabase status
```

Après création des migrations et du seed, `npx supabase db reset` reconstruira la base locale (attention : cette commande efface les données locales existantes).

Créer `apps/web/.env.local` à partir de `apps/web/.env.example`, puis remplacer la clé publique par celle affichée par `npx supabase status` :

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Utiliser la clé publique locale fournie par Supabase ; jamais la clé secrète ou `service_role`. Les secrets backend seront fournis hors Git, par l’environnement des Edge Functions. L’IA devra fonctionner sans clé `OPENAI_API_KEY` grâce au mode dégradé.

Dans des terminaux séparés :

```bash
npx supabase functions serve synchroniser_passages
npm run dev -w apps/web
```

Pour valider la PWA, utiliser également le build de production et son serveur de prévisualisation, dans un contexte sécurisé. Le premier téléchargement des images Docker et des dépendances nécessite Internet. L’objectif de restitution est ensuite un fonctionnement entièrement local, sans accès Internet, à vérifier sur la machine utilisée.

## Comptes de test

Après `npx supabase db reset`, le seed crée exclusivement des données fictives : un responsable, un agent, deux parents et cinq élèves. Le mot de passe de démonstration est `Passage2026!` pour tous les comptes.

| Rôle | Adresse e-mail |
|---|---|
| Responsable | `responsable@demo.passage.test` |
| Agent | `agent@demo.passage.test` |
| Parent de deux élèves | `parent.a@demo.passage.test` |
| Parent de trois élèves | `parent.b@demo.passage.test` |

Ces comptes et ce mot de passe sont réservés à Supabase local. Aucun compte réel d’élève ni secret de production n’est versionné.

## Tests et intégration continue

```bash
npm run lint -w apps/web
npm run test -w apps/web
npm run build -w apps/web
deno test supabase/functions/_shared
npx supabase test db
```

La dernière commande suppose une instance Supabase locale démarrée. Le workflow GitHub Actions prévu lance les trois suites à chaque push et Pull Request.

Le dernier contrôle local a validé 16 tests Vitest, 10 tests Deno et 41 assertions pgTAP. Voir [TESTING.md](docs/TESTING.md).

## Sécurité

Mesures effectivement présentes dans le MVP :

- Supabase Auth pour le hachage adapté des mots de passe ; longueur minimale de huit caractères, limitation des connexions et erreurs génériques.
- Sessions à durée limitée, déconnexion effective vérifiée côté serveur et contrôle des rôles sur chaque opération protégée.
- Cloisonnement par établissement et par relation parent-enfant, avec RLS et autorisations applicatives.
- Validation serveur des entrées, SQL paramétré ou RPC à paramètres typés ; contraintes PostgreSQL et transactions.
- Rendu du texte comme texte, sans HTML utilisateur non assaini ; aucune donnée nominative dans les requêtes IA.
- QR signé vérifié localement et de nouveau côté serveur ; la révocation reçue par le terminal est aussi vérifiée hors ligne.
- Aucun secret réel versionné ; `.env.example` ne contient que des valeurs fictives ou des noms de variables.

Les tests de sécurité, les limites du modèle de menace et les améliorations envisagées sont décrits dans [SECURITY.md](docs/SECURITY.md).

## Mode dégradé

L’écran de scan doit rester accessible hors réseau après une préparation en ligne. Les événements sont conservés dans IndexedDB, puis transmis de façon idempotente à la reconnexion. Un événement non acquitté ne doit jamais être effacé. Les problèmes d’horloge ou de révocation sont traités explicitement lors de la validation.

Pour l’IA, les statistiques sont calculées par le code. Sans clé, en cas d’indisponibilité, de plafond atteint ou de sortie invalide après la tentative autorisée, un gabarit déterministe produit une synthèse exacte. Le chemin emprunté doit être enregistré. Voir [OFFLINE-STRATEGY.md](docs/OFFLINE-STRATEGY.md).

## État d’avancement — livraison

- Migrations, seed, Auth, RLS, badges/QR, synchronisation, détection d’anomalies, outbox simulée et repli de synthèse sont implémentés.
- Les espaces Responsable, Agent et Parent sont disponibles ; le tableau Responsable est relié aux lectures RLS.
- CI et suites locales sont vertes sur le commit livré.
- Restent hors périmètre de ce MVP : caméra native, fournisseur réel de notification, estimation PWA du décalage d’horloge et vidéo produite sans outil de capture/montage externe.

## Documentation

[Conception](docs/DESIGN.md) · [Analyse fonctionnelle](docs/FUNCTIONAL-ANALYSIS.md) · [Architecture](docs/ARCHITECTURE.md) · [MVP](docs/MVP.md) · [Données](docs/DATABASE.md) · [Sécurité](docs/SECURITY.md) · [Hors ligne](docs/OFFLINE-STRATEGY.md) · [Tests](docs/TESTING.md) · [Planning](docs/ROADMAP.md) · [Contribution](CONTRIBUTING.md) · [Journal IA](JOURNAL-IA.md).

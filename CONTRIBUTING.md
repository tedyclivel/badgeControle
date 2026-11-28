# Contribution et conventions de développement

## Workflow Git

GitHub Flow est retenu : `main` contient les travaux intégrés ; les branches sont dédiées à une fonctionnalité. Certaines branches ont été préparées à l’avance ; elles doivent être actualisées depuis `main` avant le développement.

```bash
git switch main
git pull --ff-only origin main
git switch ci/github-actions
git merge --ff-only main
```

Si la branche n’existe pas, utiliser `git switch -c <branche>` depuis `main`. Si une fusion fast-forward est impossible, examiner les divergences avant de fusionner ou rebaser. Ne pas forcer un push sur `main`.

| Branche | Périmètre |
|---|---|
| `chore/project-setup` | Monorepo, dépendances, PWA initiale |
| `docs/project-design` | Analyse et conception |
| `ci/github-actions` | CI et premiers tests |
| `feat/database` | Migrations, RLS, seed |
| `feat/auth` | Authentification, autorisations |
| `feat/role-spaces` | Espaces des trois rôles |
| `feat/badges` | Cycle de vie et preuves |
| `feat/offline-scan` | Scan et file locale |
| `feat/synchronization` | API, idempotence et horodatage |
| `feat/itineraries` | Fenêtres et exceptions |
| `feat/anomalies` | Règles et détection planifiée |
| `feat/notifications` | Outbox et plafonnement |
| `feat/ai-summary` | Synthèses et garde-fous |
| `test/critical-scenarios` | Intégration des scénarios critiques |
| `docs/final-delivery` | Documentation et livraison |

## Commits

Format : `type(scope): description`, en anglais, avec une intention précise. Exemples :

```text
chore(web): configure PWA foundation
feat(db): enforce unique passage events
test(sync): verify partial acknowledgments
fix(tests): use Deno standard assertions
docs: document security limitations
ci: configure GitHub Actions workflow
```

Un commit représente un changement réel et cohérent. Éviter les commits artificiels ou les messages vagues.

```bash
git status
git diff
git add <fichiers-concernes>
git diff --cached
git commit -m "type(scope): description"
git push -u origin HEAD
```

Créer une Pull Request vers `main`, relire les changements, vérifier les tests et fusionner en conservant un historique lisible. Après fusion, mettre à jour `main`.

## Qualité du code

- TypeScript strict, noms explicites en anglais, documentation en français.
- Domaine et cas d’utilisation indépendants de React, Supabase, Deno HTTP et IndexedDB ; dépendances injectées aux frontières.
- Controllers fins, validations aux entrées, invariants dans le métier, accès techniques dans les adaptateurs.
- Tests métier avec chaque fonctionnalité critique ; tests de base pour les contraintes et RLS.
- Éviter dépendances circulaires, `any` non justifié, duplication, abstraction sans besoin et logique métier dans les composants.

## Hygiène du dépôt

Ne jamais versionner `node_modules/`, `dist/`, `coverage/`, les caches Supabase, les secrets `.env` ni les clés privées. Versionner les fichiers d’exemple sans secrets, migrations, tests et lockfile npm. Une exclusion dans `.gitignore` ne retire pas un fichier déjà commité : vérifier l’index et, si nécessaire, nettoyer les commits non publiés avant le push. Un secret exposé doit être révoqué, même si l’historique est corrigé.

## Avant fusion

- Vérifier le périmètre du changement et la présence des tests pertinents.
- Vérifier les autorisations et les erreurs, notamment sur les données des mineurs.
- Vérifier les résultats GitHub Actions ; ne pas déclarer un test réussi sans exécution.
- Actualiser les décisions et le journal IA quand une proposition a été corrigée ou écartée.

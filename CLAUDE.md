# Plateforme mairies

## Projet

SaaS pour les communes françaises de 2 000 à 50 000 habitants. Chaque commune a sa propre app
mobile (iOS/Android, une base Expo déclinée en marque blanche) et un dashboard web où son personnel
gère actualités, agenda, signalements, carte, notifications, environnement et démarches. L'éditeur
dispose d'un espace super-admin. Back-end cible : Supabase (Postgres + PostGIS, Auth, Storage, RLS),
région Paris, multi-tenant par `tenant_id`. Jusqu'au lot 14, tout tourne sur un adaptateur mock.

## Arborescence

```
apps/dashboard      Next.js (App Router, src/, Tailwind v4, shadcn/ui) — espace commune + super-admin
apps/mobile         Expo + Expo Router — app citoyenne en marque blanche
packages/shared     @app/shared : schémas zod, enums, permissions, workflows, i18n FR, utilitaires
packages/data       @app/data : ports d'accès aux données + adaptateurs (mock, puis supabase)
packages/config     @app/config : tsconfig de base, ESLint (flat config), Prettier
scripts/            scripts TS exécutés avec tsx
docs/               decisions.md (ADR), avancement.md (état des lots), data-contracts.md
```

Les paquets internes sont « just-in-time » : `exports` pointe vers `src/index.ts`, sans build.

## Commandes

```bash
pnpm install          # dépendances (Node 24 LTS, pnpm 12)
pnpm dev              # dashboard + mobile
pnpm dev:dashboard    # http://localhost:3000
pnpm dev:mobile       # Expo
pnpm lint             # ESLint partout
pnpm typecheck        # tsc --noEmit partout
pnpm test             # Vitest (shared, data, dashboard)
pnpm format           # Prettier
pnpm --filter dashboard test:e2e   # Playwright (à partir du lot 03)
```

Ajouter une dépendance mobile : `pnpm --filter mobile exec expo install <paquet>`.

## Règles non négociables

- L'interface est en français ; le code, les identifiants et les noms de fichiers en anglais.
- Les schémas zod de `@app/shared` sont la **seule source de vérité** des types. Aucun type
  métier dupliqué ailleurs, aucun cast `as` pour contourner zod, aucun `any`.
- Toute entité métier porte un `tenantId`. L'isolation entre communes est vérifiée dans la couche
  de données, jamais seulement dans l'interface.
- L'interface n'accède **jamais** directement à Supabase : elle passe toujours par `@app/data`
  (côté dashboard, via `getRepos()` dans `src/server/`).
- Aucune clé secrète dans le code ni dans un commit. La clé `service_role` ne sort jamais du serveur.
- L'accessibilité (RGAA / WCAG AA) fait partie du « fini » : libellés, focus visible, navigation
  clavier, contraste AA, jamais d'information portée par la seule couleur, alternative textuelle
  (liste ou tableau) à chaque carte et graphique.
- RGPD : pas de traceurs tiers, pas de données personnelles dans les logs ni dans les exports,
  habitant toujours pseudonymisé dans le dashboard.
- Cartes : MapLibre + tuiles MapTiler, jamais `tile.openstreetmap.org` en production.
- Pas de DSFR ni de police Marianne (réservés à l'État). Pas de NativeWind.

## Définition de « fini » pour un lot

1. Les critères d'acceptation du lot sont vérifiés (pas seulement « le code compile »).
2. `pnpm lint`, `pnpm typecheck` et `pnpm test` passent.
3. `docs/avancement.md` est mis à jour ; les choix structurants sont ajoutés à `docs/decisions.md`.
4. Un commit par lot au format Conventional Commits.

## Conventions

- Fichiers en kebab-case (`format-date.ts`), composants React en PascalCase (`PageHeader`).
- Tables SQL en snake_case au pluriel (`report_events`) ; camelCase côté TypeScript.
- Commits : Conventional Commits (`feat(dashboard): …`, `fix(data): …`, `chore: …`).
- Dates : stockées en ISO UTC, affichées et saisies en `Europe/Paris` via `@app/shared`.
- Server Components par défaut ; composants client uniquement pour l'interactivité.
- Mutations dashboard : server actions → `getRepos()` avec le contexte de session → erreurs traduites.

## Particularités de l'outillage

- Next.js 16 et Expo SDK 57 ont des API récentes : lire `apps/dashboard/AGENTS.md` et
  `apps/mobile/AGENTS.md` (docs locales dans `node_modules/next/dist/docs/`).
- `nodeLinker: hoisted` est défini dans `pnpm-workspace.yaml` (requis par Metro).
- Une seule version de React dans le monorepo, celle imposée par Expo (voir ADR-007).

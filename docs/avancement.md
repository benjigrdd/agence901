# Avancement des lots

| # | Lot | État |
|---|---|---|
| 01 | Monorepo et conventions | Terminé (app mobile : 2 fichiers en attente, voir ci-dessous) |
| 02 | Contrats de données et couche mock | Terminé |
| 03 | Coque du dashboard | Terminé |
| 04 | Actualités, Agenda, Médiathèque | Terminé (1 test E2E instable à vérifier) |
| 05 | Signalements, Carte, Quartiers | À faire |
| 06 | Accueil, Notifications, Environnement, Démarches, Paramètres, Audit | À faire |
| 07–19 | Voir `00-plan-et-mode-emploi.md` | À faire |

## Lot 01 — Monorepo et conventions

- pnpm 12.6 + Turborepo 2.11, Node 24 LTS (`.nvmrc`).
- `apps/dashboard` : Next.js 16.3, React 19.2.3, Tailwind 4.3, shadcn/ui (style `radix-nova`),
  Inter via `next/font`, `lang="fr"`, page provisoire avec le nom du produit.
- `apps/mobile` : Expo SDK 57, Expo Router, `expo-dev-client`.
- `@app/shared` : `PRODUCT_NAME_FALLBACK`, `formatDateFr` (Europe/Paris, testé sur les
  changements d'heure). `@app/data` : squelette. `@app/config` : tsconfig, ESLint, Prettier.
- CI GitHub Actions : install, lint, typecheck, test.
- Écarts de versions : voir ADR-007.

## Lot 02 — Contrats de données et couche mock

- `@app/shared` : enums et libellés FR, 29 schémas zod (un fichier par entité, schémas de saisie
  `XxxInput`, messages en français), `RichTextDoc` Tiptap restreint, `can()` / `accessibleTenants()`,
  workflows contenus et signalements, `formatReportReference`, contraste WCAG, géo (distance,
  point dans polygone), calendrier de collecte avec exceptions, aides signalements (retard, pseudonyme).
- `@app/data` : ports (22 dépôts), erreurs typées, adaptateur mock en mémoire (singleton `globalThis`,
  latence optionnelle), fixtures déterministes validées par zod, personas, `createRepositories()`.
- Tests : 141 dans `shared` (matrice `can()`, toutes les transitions, texte riche, médias, collectes),
  50 dans `data` dont la suite `describeRepositoryContract` (isolation lecture/écriture par dépôt,
  critères d'acceptation) à rejouer sur Supabase au lot 14.
- Détail des dépôts : `docs/data-contracts.md`.

## Lot 03 — Coque du dashboard

- Accès serveur : `src/server/repos.ts` (`getRepos()` selon `DATA_SOURCE`), `session.ts` (persona via le
  cookie `dev_persona`, même signature qu'au lot 13), `guards.ts` (`requireSession`, `requireTenant` → 404,
  `requirePermission` → 403 via `forbidden()`, module désactivé → 404, `requireTenantAdmin`,
  `requirePlatformAdmin`), `errors.ts` (erreurs traduites pour les server actions).
- Navigation filtrée par modules actifs et droits (`buildNavigation`, 8 tests), modules V2 « Bientôt ».
- Composants : `PageHeader`, `EmptyState`, `DataTable` (TanStack Table v8), `StatusBadge`, `ConfirmDialog`,
  `FormField`, `DateTimeField` (Europe/Paris), `Can`, toasts `sonner`, sélecteur de persona (mock seulement).
- Accessibilité : lien d'évitement, landmarks, titres « Page · Commune · Produit », focus 2 px,
  `prefers-reduced-motion`. Playwright + axe : 6 tests, zéro violation grave ou critique.

### Routes

| Route | Accès |
|---|---|
| `/` | aiguillage selon la session |
| `/connexion`, `/choisir-commune`, `/403` | public / personnel |
| `/{commune}` (accueil) | membre de la commune |
| `/{commune}/actualites`, `agenda`, `mediatheque` | `news`, `events`, `media` en lecture |
| `/{commune}/signalements`, `carte`, `quartiers` | `reports`, `map`, `districts` en lecture |
| `/{commune}/notifications`, `environnement`, `demarches` | module correspondant en lecture |
| `/{commune}/parametres/membres` | admin de la commune |
| `/{commune}/parametres/services`, `thematiques`, `commune` | `settings` en lecture |
| `/{commune}/audit` | admin de la commune |
| `/admin/communes`, `/admin/communes/nouvelle`, `/admin/communes/{id}`, `/admin/usage` | super-admin |

### Points en attente

- `apps/mobile/app.config.ts` et `apps/mobile/src/app/index.tsx` : écriture refusée par le
  classifieur de permissions de Claude Code ; à créer (contenu prévu : config Expo statique et
  écran affichant `PRODUCT_NAME_FALLBACK`). Tant qu'ils manquent, `pnpm --filter mobile typecheck`
  échoue.
- `apps/dashboard/eslint.config.mjs` : garder la config générée par Next ou la remplacer par
  `export { default } from '@app/config/eslint/next';` (ajoute toutes les règles jsx-a11y).
  Modification bloquée par le hook `config-protection` du plugin ecc.
- `.npmrc` non créé (bloqué) : `nodeLinker: hoisted` est dans `pnpm-workspace.yaml`, équivalent.

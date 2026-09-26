# Avancement des lots

| # | Lot | État |
|---|---|---|
| 01 | Monorepo et conventions | Terminé (app mobile : 2 fichiers en attente, voir ci-dessous) |
| 02 | Contrats de données et couche mock | À faire |
| 03 | Coque du dashboard | À faire |
| 04 | Actualités, Agenda, Médiathèque | À faire |
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

### Points en attente

- `apps/mobile/app.config.ts` et `apps/mobile/src/app/index.tsx` : écriture refusée par le
  classifieur de permissions de Claude Code ; à créer (contenu prévu : config Expo statique et
  écran affichant `PRODUCT_NAME_FALLBACK`). Tant qu'ils manquent, `pnpm --filter mobile typecheck`
  échoue.
- `apps/dashboard/eslint.config.mjs` : garder la config générée par Next ou la remplacer par
  `export { default } from '@app/config/eslint/next';` (ajoute toutes les règles jsx-a11y).
  Modification bloquée par le hook `config-protection` du plugin ecc.
- `.npmrc` non créé (bloqué) : `nodeLinker: hoisted` est dans `pnpm-workspace.yaml`, équivalent.

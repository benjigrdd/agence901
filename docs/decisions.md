# Journal des décisions d'architecture

Format court : contexte, décision, conséquences. On ajoute une entrée à chaque choix structurant.

## ADR-001 — Monorepo pnpm + Turborepo

- **Contexte** : un dashboard web, une app mobile et des règles métier communes (schémas,
  permissions, workflows) doivent évoluer ensemble, avec un seul développeur au départ.
- **Décision** : monorepo pnpm (workspaces) orchestré par Turborepo. Paquets internes
  « just-in-time » (`exports` vers `src/index.ts`, sans build). Pas de Nx ni de Lerna.
- **Conséquences** : un seul lockfile, cache des tâches `lint`/`typecheck`/`test`, types partagés
  sans publication. `nodeLinker: hoisted` est requis pour Metro (React Native).

## ADR-002 — Supabase multi-tenant avec `tenant_id` et RLS

- **Contexte** : chaque commune ne doit voir que ses données ; hébergement en France exigé par
  les mairies (RGPD, la mairie est responsable de traitement, l'éditeur sous-traitant).
- **Décision** : une seule base Supabase (Postgres + PostGIS) en région Paris (`eu-west-3`). Chaque
  table métier porte `tenant_id`, protégée par des politiques RLS et des clés étrangères
  composites `(tenant_id, id)`. Tests d'isolation automatisés (pgTAP + contrats de dépôts).
- **Conséquences** : coût et exploitation mutualisés ; l'isolation repose sur la RLS, donc les
  tests d'isolation sont bloquants en CI. Clé `service_role` réservée aux tâches serveur.

## ADR-003 — Une app par commune, base Expo unique, app « hub » de repli

- **Contexte** : les mairies veulent une app à leur nom, publiée sous leur identité.
- **Décision** : une seule base de code Expo, déclinée par commune via un `app.config` dynamique
  (nom, icône, couleurs, identifiants de bundle), publiée sur le compte store de la mairie. Une app
  « hub » multi-communes sert de repli tant que les comptes store d'une commune ne sont pas prêts.
- **Conséquences** : pipeline EAS par commune (lot 18), mises à jour OTA communes ; thème appliqué
  à l'exécution (pas de NativeWind).

## ADR-004 — Structure d'abord : couche d'accès mock, puis Supabase

- **Contexte** : on veut montrer et tester le produit (mairie pilote) avant de construire le
  back-end, sans réécrire les écrans ensuite.
- **Décision** : tous les écrans passent par `@app/data`, qui expose des ports (interfaces de
  dépôts). Un adaptateur `mock` en mémoire applique déjà isolation et permissions ; l'adaptateur
  `supabase` implémente les mêmes ports au lot 14. Choix par `DATA_SOURCE=mock|supabase`.
- **Conséquences** : ~5 jours de plus, mais types figés avant la base et suite de contrats rejouée
  sur les deux adaptateurs.

## ADR-005 — Cartes MapLibre avec tuiles MapTiler

- **Contexte** : les cartes (lieux, signalements, quartiers) sont centrales ; les tuiles
  `tile.openstreetmap.org` ne sont pas destinées à un usage en production.
- **Décision** : MapLibre GL (web et mobile) avec un style MapTiler (`*_MAP_STYLE_URL`). En
  développement, repli sur `https://demotiles.maplibre.org/style.json`. Attribution OpenStreetMap
  toujours visible ; chaque carte a une alternative en liste.
- **Conséquences** : clé MapTiler par environnement ; aucune dépendance à Google Maps.

## ADR-006 — IA via Mistral (UE), prévue en V2

- **Contexte** : aide à la rédaction et catégorisation des signalements envisagées.
- **Décision** : pas d'IA en V1. En V2, fournisseur hébergé dans l'UE (Mistral), appelé côté
  serveur uniquement, sans données personnelles dans les prompts.
- **Conséquences** : les champs `aiSuggestion` existent dans les contrats mais restent vides en V1.

## ADR-007 — Versions de l'outillage (lot 01)

- **Contexte** : le lot 01 demande les dernières versions stables, vérifiées avec `npm view`.
- **Décision** :
  - **TypeScript 5.9.3** : le tag `latest` pointe vers la 7.x (compilateur natif) et Expo propose
    la 6.0 ; la spec demande la 5.x et `typescript-eslint` ne supporte pas la 7.
  - **ESLint 9.39** et non 10 : `eslint-plugin-react` et `eslint-plugin-jsx-a11y` ne supportent
    pas encore ESLint 10.
  - **React 19.2.3** partout : version imposée par Expo SDK 57 / React Native 0.86 (le rendu
    natif exige la version exacte) ; une seule version évite les doublons avec `hoisted`.
  - shadcn `field` à la place de `form` (retiré du registre du style `radix-nova`).
- **Conséquences** : à réévaluer quand l'écosystème supportera ESLint 10 et TypeScript 7.

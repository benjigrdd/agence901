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

## ADR-008 — Tests E2E sur build de production (lot 04)

Playwright démarre `next build && next start` sur le port 3100 au lieu de `next dev` : la compilation
à la volée rendait les parcours longs instables (délais de 30 s). Le serveur existant est réutilisé
hors CI.

## ADR-009 — Taille des cibles sur les cartes (lot 05)

Les marqueurs de carte font 24 px minimum, mais des marqueurs proches se chevauchent. Nous appliquons
l'exception « essentielle » de WCAG 2.5.8 (la position est l'information) : les tests axe ignorent la
règle `target-size` pour les seuls marqueurs (`data-map-marker`). Chaque carte garde une vue Liste
équivalente, utilisable au clavier.

## ADR-010 — Règle anti-lassitude des notifications (lot 06)

Au-delà de 3 notifications non urgentes le même jour (Europe/Paris, date d'envoi ou de programmation),
une justification est obligatoire. La règle vit dans `@app/shared/notification-rules.ts`, est appliquée
par le dépôt (mock, puis Supabase au lot 14) et affichée par le composeur. Les notifications urgentes y échappent.

## ADR-011 — Création de commune et données par défaut (lot 07)

La création passe par un seul appel `tenants.create(TenantCreationInput)` qui initialise la commune, ses
données par défaut (`seedTenantDefaults`, reprise en SQL au lot 11), sa marque et l'invitation du premier
administrateur. Offres ramenées à `pilot` et `standard`. `/admin` répond 404 à tout autre compte que
l'éditeur, pour ne pas révéler l'espace.

## ADR-012 — Schéma Supabase dérivé des types partagés (lot 11)

Les enums Postgres et les données par défaut d'une commune sont générés depuis `@app/shared` et
`@app/data` (`pnpm db:generate`), et un test de parité compare les types générés aux schémas zod.
Toute référence interne à une commune passe par une clé étrangère composite `(tenant_id, id)`.
Le seed local réutilise les fixtures du mock : mêmes données sur les deux adaptateurs.

## ADR-013 — Règles métier dupliquées en base (lot 12)

Les droits (`can()`) et les circuits de validation sont réimplémentés en SQL (policies + triggers) : la base
reste sûre même si un client contourne le dashboard. Erreurs : message `APP_…` stable et détail en
français. Les tâches serveur (sans `auth.uid()`) ne passent pas par le workflow. Les notes internes de
l'éditeur sont isolées dans une table dédiée plutôt que protégées par des droits de colonne.

## ADR-014 — Authentification du personnel (lot 13)

Supabase Auth avec 2FA TOTP obligatoire, appliquée à trois niveaux : proxy Next (redirections), gardes
serveur (`aal2` dans la `Session`) et base (`private.is_aal2()` dans toutes les policies). Les liens d'email
utilisent `token_hash` vérifié côté serveur (`/auth/confirm`). Les opérations d'administration Auth
(invitations) passent par une Edge Function : le dashboard n'a jamais la clé `service_role`.


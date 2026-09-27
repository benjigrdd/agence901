# Avancement des lots

| # | Lot | État |
|---|---|---|
| 01 | Monorepo et conventions | Terminé (app mobile : 2 fichiers en attente, voir ci-dessous) |
| 02 | Contrats de données et couche mock | Terminé |
| 03 | Coque du dashboard | Terminé |
| 04 | Actualités, Agenda, Médiathèque | Terminé |
| 05 | Signalements, Carte, Quartiers | Terminé |
| 06 | Accueil, Notifications, Environnement, Démarches, Paramètres, Audit | Terminé |
| 07 | Super-admin | Terminé |
| 08–10 | App mobile | Reporté (l'app sera branchée après les lots 11–14) |
| 11 | Supabase : schéma | Terminé |
| 12 | RLS, stockage, tests d'isolation | Terminé |
| 13 | Auth du personnel, 2FA, invitations | Terminé |
| 14 | Branchement du dashboard sur Supabase | Terminé |
| 15 | Branchement de l'app mobile (côté plateforme) | Terminé (app à brancher : `docs/integration-app-mobile.md`) |
| 16 | Tâches serveur (push, programmation, RGPD) | Terminé |
| 17–19 | Voir `00-plan-et-mode-emploi.md` | À faire |

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

## Lot 04 — Actualités, Agenda, Médiathèque

- Éditeur Tiptap restreint au `RichTextDoc`, circuit de validation (soumettre, refuser avec motif,
  publier, programmer), aperçu mobile aux couleurs de la commune, calendrier mensuel accessible,
  récurrences (hebdomadaire, toutes les 2 semaines, mensuelle), médiathèque avec texte alternatif obligatoire.
- Les tests E2E tournent sur un build de production (`next build && next start`, port 3100) :
  plus d'instabilité liée à la compilation à la volée.

## Lot 05 — Signalements, Carte, Quartiers

- `/signalements` : indicateurs (nouveaux, en cours, en retard selon le `slaDays` de la catégorie,
  délai moyen 30 j), filtres (statut, catégorie, service, priorité, période, quartier, en retard),
  vues Liste et Carte, export CSV `/signalements/export` (colonnes fixées par `buildReportsCsv`,
  aucune donnée personnelle, formules neutralisées).
- `/signalements/{id}` : galerie avec visionneuse clavier, mini-carte et itinéraire, habitant
  pseudonymisé, chronologie « Visible par l'habitant » / « Note interne », changement de statut
  (motif obligatoire et public pour un rejet), assignation, priorité, note interne, doublon
  (signalements à moins de 100 m via `reports.nearby`, puis lecture seule).
- `/carte` : lieux en liste ou carte, formulaire avec autocomplétion d'adresse (API Adresse de la
  Géoplateforme, restreinte au code INSEE), épingle déplaçable avec géocodage inverse, horaires
  `opening_hours` (`@app/shared/opening-hours.ts`), accessibilité, photo, source et « détacher de l'import ».
  `/carte/categories` : masquer les catégories par défaut, ajouter des catégories (contraste vérifié).
- `/quartiers` : dessin terra-draw (créer, déplacer les sommets, supprimer), import GeoJSON validé
  par zod, avertissement de chevauchement (`@turf/intersect`), statistiques par quartier.
- Carte commune : clustering au-delà de 50 marqueurs, marqueurs 24 px avec icône et texte.
- Fixtures : un signalement « nouveau » proche d'un autre de même catégorie, pour le parcours doublon.
- Tests : Vitest (`opening-hours`, `report-export`), Playwright (traitement complet, rejet, note
  interne, doublon, export CSV, création d'un lieu par adresse, import d'un quartier visible dans les
  actualités, agent sans accès à Carte et Quartiers, axe sur liste, carte et détail).

## Lot 06 — Accueil, Notifications, Environnement, Démarches, Paramètres, Audit

Écrans (tous les écrans commune du V1 sont navigables sur le mock) :

| Route | Contenu |
|---|---|
| `/{commune}` | indicateurs (signalements ouverts, en retard, délai moyen, contenus à valider, programmés à 7 j, installations, actifs), histogramme 12 semaines + résumé + tableau « Voir les données », « À faire », « Dernières actions » (admin) ; chaque bloc selon les droits |
| `/{commune}/notifications` | historique ; composeur (compteurs 50/150, cible commune / quartiers / thèmes, contenu lié, immédiat ou programmé, urgente), estimation d'audience en direct, aperçus iOS et Android, confirmation « Vous allez notifier environ N habitants », justification au-delà de 3 non urgentes par jour |
| `/{commune}/environnement` | onglets Zones (dessin terra-draw, import GeoJSON), Calendrier (récurrence hebdomadaire ou toutes les 2 semaines, exceptions annulées ou reportées, note, 8 prochaines collectes par zone), Consignes de tri (recherche, ajout, import CSV « Bientôt »), Déchèteries (lieux de la catégorie, horaires lisibles) |
| `/{commune}/demarches` | démarches groupées par catégorie, ordre par glisser-déposer au clavier (dnd-kit, annonces en français) et boutons Monter / Descendre, catalogue service-public.gouv.fr en un clic (URLs vérifiées), bloc « Mairie : horaires et contact » |
| `/{commune}/parametres/membres` | liste, invitation avec matrice de droits (radios par module), modification, désactivation / réactivation, garde du dernier admin |
| `/{commune}/parametres/services` | services et catégories de signalement (icône, service par défaut, délai cible) |
| `/{commune}/parametres/thematiques` | thèmes d'intérêt, réordonnables |
| `/{commune}/parametres/commune` | informations et marque en lecture seule, liens légaux, tuiles de l'accueil de l'app (activables, ordonnables) avec aperçu |
| `/{commune}/audit` | filtres (acteur, élément, action, période), détail avant / après, export CSV (noms des champs seulement), « Conservation : 12 mois » |

- `@app/shared` : `notification-rules.ts` (quota quotidien Europe/Paris, testé), `procedures-catalog.ts`,
  `describeOpeningHoursFr`. Le dépôt `notifications` applique la règle (justification exigée).
- Composants : `SortableList` (glisser-déposer accessible + Monter / Descendre), `OpeningHoursEditor` partagé,
  `lib/geojson.ts` (import Polygon / MultiPolygon).
- Mock : connexion « en tant que » un membre invité pendant la démo (cookie `membre:<id>`), pour vérifier ses droits.
- Accessibilité : toasts assombris (contraste AA), histogramme avec motif hachuré et tableau équivalent.
- Tests : Vitest (règle anti-lassitude, justification côté dépôt, dernier admin), Playwright 9 parcours
  (accueil selon les droits, notification ciblée, justification, démarche du catalogue et réordonnancement
  au clavier, collectes, invitation puis connexion, dernier admin, 403 agent, diff d'audit) + axe sur toutes les pages.

## Lot 07 — Super-admin

| Route | Contenu |
|---|---|
| `/admin/communes` | tableau (nom, type, population, statut, offre, modules actifs, publication iOS / Android, dernière activité), filtres statut et offre |
| `/admin/communes/nouvelle` | assistant 5 étapes (« Étape n sur 5 » annoncé et focalisé, retour possible, brouillon en mémoire) : identité (recherche geo.api.gouv.fr via `/api/admin/communes`, cache 24 h, saisie manuelle en repli, slug unique), marque (contrastes en direct, étape bloquée sous 4,5:1 avec ratio obtenu et attendu, logo SVG/PNG carré ≥ 1 024 px, aperçus article et icône), modules (V2 désactivés), premier admin (invité), récapitulatif |
| `/admin/communes/{id}` | onglets Général (statut, offre, renouvellement, notes internes), Marque (avertissement nouvelle version), Modules (effet immédiat), Membres (écran du lot 06), Stores (identifiants, statuts par plateforme avec motif de rejet, checklist d'onboarding horodatée), Usage (4 graphiques 90 j + tableau), Zone sensible (suspendre / réactiver en ressaisissant le slug) ; bouton « Ouvrir l'espace de la commune » |
| `/admin/usage` | tableau multi-communes sur 30 / 90 / 365 jours, tri, export CSV, signal « Commune peu active » (aucune publication depuis 14 jours) |
| `/espace-suspendu` | page neutre pour les membres d'une commune suspendue |

- `@app/shared` : offres `pilot` / `standard`, statuts de publication store, `ONBOARDING_STEP_DEFS`,
  `Tenant.renewalDate` / `internalNotes`, `TenantCreationInput`, `slugify` / `uniqueSlug`,
  `checkBrandingPalette`, `normalizeHexColor` (couleurs stockées en minuscules), action d'audit `platform_access`.
- `@app/data` : `seedTenantDefaults` (12 catégories de lieux, 5 catégories de signalement, 1 service
  « Services techniques », 6 thèmes, modules, `homeLayout`, fiche store), `tenants.create` (commune +
  défauts + marque + invitation du 1er admin), `audit.recordPlatformAccess` (une entrée par 30 min).
- Gardes : `/admin` renvoie une 404 hors super-admin ; commune suspendue → `/espace-suspendu` ; chaque
  accès de l'éditeur à une commune est tracé dans son audit.
- Tests : Vitest (défauts, création, slug, palette, accès tracé), Playwright 6 parcours (404 admin
  commune, assistant complet, module Agenda, suspension / réactivation, audit des accès, axe sur /admin).
  Les tests axe attendent la fin des animations et ignorent les toasts éphémères.

## Lot 11 — Supabase : schéma

- Supabase CLI 2.118 (dépendance du dépôt), Docker Desktop requis en local. `supabase/config.toml` :
  connexions anonymes et MFA TOTP activées.
- 12 migrations (extensions, enums générés, plateforme, territoire, personnes, contenus, signalements,
  notifications, audit/usage, fonctions et triggers, données par défaut générées, RLS). Détail : `docs/database.md`.
- `scripts/seed-local.ts` (`pnpm db:seed`) : charge les fixtures du mock (2 communes, 526 comptes dont
  les personas avec le mot de passe local `Demo-Local-2026!`, 50 signalements…), refuse toute base non locale.
- Types générés `packages/data/src/supabase/database.types.ts` ; test de parité zod ↔ base (29 tests).
- pgTAP `supabase/tests/database/01_schema.test.sql` (21 tests) : tables, RLS partout, clé composite,
  références `2026-00001` / `2026-00002` et redémarrage par commune, défauts à la création, diff d'audit.
- Projet Supabase en ligne fourni : `ricbljsdibhbysntzuuf` (utilisé comme **staging**, non encore relié).

## Lot 12 — RLS, stockage et tests d'isolation

- Fonctions d'aide `private.*` (2FA, rôle, droit par module, commune active, module actif, commune de l'habitant).
- Policies sur toutes les tables (matrice : `docs/rls.md`) ; 3 tables serveur sans policy (compteurs, livraisons, file push).
- Triggers de règles métier avec codes `APP_…` : circuit de validation des contenus, transitions et doublons
  des signalements, rejet motivé et public, garde du dernier administrateur.
- Notes internes de l'éditeur déplacées dans `tenant_internal_notes` (jamais lisibles par la commune ni l'app).
- Buckets `public-media`, `report-photos` (privé), `branding`, `exports` (privé) et leurs policies par chemin.
- pgTAP : 63 tests (schéma 21, isolation 34 par rôle : anonyme, habitant, agent, admin, admin sans 2FA,
  éditeur ; stockage 8). Job CI `database` : génération à jour, lint, tests, seed.
- Spec du lot relue partiellement (fichier iCloud indisponible pendant la session) : périmètre reconstitué
  depuis le début de la spec et les exigences des lots 13 et 14.

## Lot 13 — Authentification du personnel, 2FA, invitations

- `@supabase/ssr` : client serveur (cookies), client navigateur, `src/proxy.ts` (Next 16) qui rafraîchit la
  session et impose la 2FA (`/connexion/2fa` ou `/connexion/2fa/configurer`). Mode mock inchangé.
- Pages : connexion (message générique), code TOTP, configuration (QR code + clé en texte, conseil d'un second
  appareil), mot de passe oublié → `/auth/confirm` → `/reinitialiser`, invitation (12 caractères, jauge de
  robustesse), `/compte/securite` (appareils, changement de mot de passe) ; menu : déconnexion locale ou globale.
- `getSession()` réel (même `Session` que le mock, sous RLS) ; `describeUser` lit le profil.
- Invitations : Edge Function `invite-member` (vérifie l'appelant avec son jeton, puis `record_invitation`
  avec la clé service côté Supabase) ; `accept_invitations()`, `can_manage_members()`, `staff_last_sign_in()`.
- Seed : facteurs TOTP vérifiés pour les personas (secret local documenté), sauf « Admin Alpha sans 2FA ».
- `scripts/set-platform-admin.ts` (rôle éditeur, clé service lue dans l'environnement de l'exploitant).
- Tests : `@app/shared/password` (3), Playwright sur Supabase local `pnpm --filter dashboard test:e2e:supabase`
  (5 : message générique, redirection sans session, mot de passe + TOTP → aal2, code faux, configuration obligatoire).
- Détail : `docs/auth.md`.

## Lot 14 — Branchement du dashboard sur Supabase

- `packages/data/src/supabase/` : adaptateur complet des 22 dépôts (un fichier par domaine), `mappers.ts`
  (chaque ligne validée par zod), `core.ts` (gardes identiques au mock, erreurs PostgREST / `APP_…` →
  erreurs du domaine en français, conversions GeoJSON / EWKT), `createSupabaseRepositories(resolve)`.
- Le résolveur de client fournit le client de l'appelant : côté dashboard, le client de la requête
  (cookies, RLS appliquée) ; dans les tests, un jeton local par persona.
- Migration `api_views_rpc` : vues `v_*` (géographie en GeoJSON, `security_invoker`), RPC
  `transition_content`, `update_report_status` (+ file `push_outbox` si public), `assign_report`,
  `add_report_note`, `reports_nearby`, `report_ids_in_district`, `report_stats`, `district_stats`,
  `estimate_audience`, `reorder_procedures`, `set_member_permissions`, `create_tenant`,
  `record_platform_access` ; action d'audit explicite (`transition`, `reorder`, `permissions`).
- Médiathèque sur Storage (`public-media`), photos de signalement en URLs signées (`report-photos`).
  Invitations et premier admin d'une commune via l'Edge Function `invite-member`.
- Seed : dépose aussi les fichiers de démonstration dans Storage (clé locale lue via `supabase status`).
- Tests : **la même suite de contrat passe sur le mock et sur Supabase (40/40)**
  (`SUPABASE_CONTRACT=1`, en CI) ; Playwright Supabase 10 parcours (auth + accueil, traitement d'un
  signalement, validation agent → admin, téléversement Storage, droits 403/404, audit des accès éditeur).
- Bascule : `DATA_SOURCE=supabase` + `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Lot 15 — Branchement de l'app mobile, côté plateforme

L'app n'existe pas encore : tout ce dont elle aura besoin est prêt et testé côté plateforme.
- Session anonyme Supabase, profil habitant, fil public, préférences (dépôt `citizen` de `@app/data`).
- Signalement **idempotent** (`clientRequestId`, contrainte unique) pour la file hors ligne ; photos dans
  le bucket privé `report-photos` (dossier de l'habitant) ; premier événement public « Signalement reçu. ».
- Jetons push : `register_push_token` (rattache l'appareil à l'habitant courant), `unregisterPushToken`.
- Mesure d'usage sans traceur : `touch_citizen()` (date du jour) et agrégation `private.compute_usage_daily`.
- RGPD : Edge Function `delete-account` (vérifie le jeton, détache et anonymise les signalements, supprime
  profil, jetons et compte Auth ; refusée pour le personnel).
- Tests : contrat commun (+2 : idempotence, jetons/activité) sur mock et Supabase, et parcours réel
  (`citizen-flow.test.ts` : session anonyme → photo → signalement vu par le personnel en URL signée →
  suppression ; invitation d'un agent via l'Edge Function `invite-member`).
- Guide pour la future app : `docs/integration-app-mobile.md`.

## Lot 16 — Tâches serveur

- Migration `server_jobs` : publication/dépublication programmées, alerte → notification unique, résolution
  des destinataires (cible + préférences), lots verrouillés (`skip locked`), résultats et accusés de
  réception, file de suivi des signalements, destinataires des rappels de collecte, purge RGPD, agrégats
  d'usage, `job_runs` ; planification `pg_cron` (appels HTTP via `pg_net` avec secrets Vault).
- Edge Functions `dispatch-notifications` (Expo Push, lots de 100, accusés de réception) et
  `send-waste-reminders` (récurrences et exceptions, erreurs journalisées), réservées à la clé service.
- Tests : pgTAP 15 (temps simulé), envoi réel de l'Edge Function vers un faux service Expo.
- Détail : `docs/taches-serveur.md`, `docs/rgpd/durees-de-conservation.md`.


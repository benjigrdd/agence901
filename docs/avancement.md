# Avancement des lots

| # | Lot | État |
|---|---|---|
| 01 | Monorepo et conventions | Terminé (app mobile : 2 fichiers en attente, voir ci-dessous) |
| 02 | Contrats de données et couche mock | Terminé |
| 03 | Coque du dashboard | Terminé |
| 04 | Actualités, Agenda, Médiathèque | Terminé |
| 05 | Signalements, Carte, Quartiers | Terminé |
| 06 | Accueil, Notifications, Environnement, Démarches, Paramètres, Audit | Terminé |
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


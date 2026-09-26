# Contrats de données

Source de vérité des types : schémas zod de `@app/shared` (`packages/shared/src/schemas/`).
Accès aux données : ports de `@app/data` (`packages/data/src/ports.ts`), implémentés par l'adaptateur
`mock` (lots 02 à 13) puis `supabase` (lot 14). L'interface n'appelle que `getRepos()`.

## Principes

- Chaque méthode reçoit `ctx: DataContext = { session, tenantId }` et renvoie une `Promise`.
- Ordre des contrôles : commune → accès → droits (`can` / `canTransition`) → validation zod.
- Commune inexistante ou non autorisée : `NotFoundError` (on ne révèle pas son existence).
- Membre sans 2FA validée : `ForbiddenError` avec le code `aal2_required`.
- Droit insuffisant : `ForbiddenError`. Données invalides : `ValidationError` (détail par champ).
  Règle métier bloquante (dernier admin, image utilisée, doublon en lecture seule) : `ConflictError`.
- Les listes renvoient `{ items, total }` et acceptent `{ filters, search, sort, page, pageSize }`.
- Toute écriture du personnel crée une `AuditEntry` (diff avant/après des champs modifiés).
- Lecture publique (sans session) : marque, modules, configuration de l'app, quartiers, thèmes,
  catégories, démarches, collecte et tri, flux publié (`citizen.publicFeed`).

## Droits requis

| Niveau | Signification |
|---|---|
| `read` | consulter le module |
| `edit` | créer et modifier des brouillons, traiter des signalements |
| `publish` | publier, programmer, refuser, archiver ; envoyer une notification |

Super-admin : tout. Admin de commune : tout sur sa commune. Agent : niveau configuré par module ;
le journal d'audit et la gestion des membres sont réservés aux admins. Sans `aal2`, aucun droit.

## Dépôts et méthodes

| Dépôt | Méthodes | Lecture | Écriture |
|---|---|---|---|
| `tenants` | `list`, `get`, `getBySlug`, `getPublicBySlug`, `create`, `update` | personnel (liste : communes accessibles) ; `getPublicBySlug` public | super-admin |
| `branding` | `get`, `update` | public | super-admin |
| `modules` | `list`, `setEnabled` | public | super-admin |
| `appConfig` | `get`, `update` | public | `settings:edit` |
| `storeInfo` | `get`, `update` | super-admin | super-admin |
| `members` | `list`, `invite`, `updatePermissions`, `disable`, `enable` | admin | admin (garde du dernier admin) |
| `posts` | `list`, `get`, `create`, `update`, `transition`, `reviews`, `counts` | `news:read` | `news:edit` ; transitions selon le workflow |
| `events` | idem `posts` | `events:read` | `events:edit` ; transitions selon le workflow |
| `media` | `list`, `get`, `upload`, `update`, `remove` | `media:read` | `media:edit` (texte alternatif obligatoire, suppression interdite si utilisée) |
| `places` | `list`, `get`, `create`, `update`, `remove` | `map:read` | `map:edit` |
| `placeCategories` | `list`, `get`, `create`, `update`, `remove` | public | `map:edit` (catégories par défaut non supprimables) |
| `reports` | `list`, `get`, `updateStatus`, `assign`, `setPriority`, `markDuplicate`, `addNote`, `nearby`, `stats` | `reports:read` | `reports:edit` (doublon en lecture seule, note toujours interne) |
| `reportCategories` | `list`, `get`, `create`, `update`, `remove` | public | `settings:edit` |
| `services` | `list`, `get`, `create`, `update`, `remove` | personnel | `settings:edit` |
| `districts` | `list`, `get`, `create`, `update`, `remove`, `stats` | public (`stats` : personnel) | `districts:edit` |
| `topics` | `list`, `get`, `create`, `update`, `remove` | public | `settings:edit` |
| `environment.zones` / `.schedules` / `.sortingGuide` | `list`, `get`, `create`, `update`, `remove` | public | `environment:edit` |
| `environment` | `nextCollections(zoneId, from, count)` | public | — |
| `procedures` | `list`, `get`, `create`, `update`, `remove`, `reorder` | public | `procedures:edit` |
| `notifications` | `list`, `create`, `estimateAudience` | `notifications:read` | `notifications:publish` |
| `audit` | `list` | admin | — |
| `usage` | `daily({ from, to })` | personnel | — |
| `citizen` | `getOrCreateProfile`, `updatePreferences`, `listMyReports`, `createReport`, `publicFeed` | session citoyenne (`publicFeed` : public) | session citoyenne |

## Workflows

**Contenus** (`posts` sur le module `news`, `events` sur `events`) :

| Transition | Niveau | Condition |
|---|---|---|
| `draft → pending_review` | edit | — |
| `pending_review → draft` (refus) | publish | motif obligatoire |
| `draft \| pending_review → scheduled` | publish | `publishAt` dans le futur |
| `draft \| pending_review → published` | publish | — |
| `scheduled → draft` | publish | — |
| `published → archived` | publish | — |

Modifier un contenu : `edit` en brouillon ou en validation, `publish` sinon ; un contenu archivé n'est plus modifiable.

**Signalements** (`reports:edit`) : `new → acknowledged → in_progress → resolved`, `resolved → in_progress`
(réouverture) ; `rejected` depuis tout statut ouvert (motif obligatoire, toujours visible par l'habitant) ;
`duplicate` depuis tout statut ouvert (`duplicateOfId` obligatoire, puis lecture seule).

## Données de démonstration

Deux communes fictives, générées de façon déterministe (`@faker-js/faker`, locale `fr`, graine fixe) et
validées par zod au démarrage du mock :

- **Commune Démo Alpha** (`demo-alpha`, INSEE `99001`, 12 000 habitants) ;
- **Commune Démo Bêta** (`demo-beta`, INSEE `99002`, 4 500 habitants).

Par commune : 3 quartiers, 2 zones de collecte et leurs calendriers (jours fériés reportés), 15 actualités
(tous statuts et types, dont 1 alerte active), 12 événements (dont 2 récurrents), 30 lieux sur 12 catégories,
5 catégories de signalement et 3 services, 25 signalements avec historique et photos de remplacement,
8 démarches, 6 thèmes, 20 consignes de tri, 10 médias, 6 notifications envoyées, 90 jours d'usage.

| Persona | Rôle |
|---|---|
| `platform-admin` | super-admin, `aal2` |
| `admin-alpha` | admin d'Alpha |
| `agent-alpha` | agent d'Alpha : actualités `edit`, agenda `publish`, signalements `edit`, médiathèque `edit` |
| `admin-beta` | admin de Bêta |
| `citizen-alpha` | habitant d'Alpha (session anonyme `aal1`) |
| `staff-aal1` | admin d'Alpha sans 2FA validée |

## Tests de contrat

`describeRepositoryContract(name, createRepos)` (`@app/data/contract`) vérifie l'isolation (lectures et
écritures croisées, identifiants d'une autre commune) et les critères d'acceptation du lot 02. Elle est
exécutée sur le mock (`packages/data/src/mock/mock.test.ts`) et sera rejouée sur Supabase au lot 14.

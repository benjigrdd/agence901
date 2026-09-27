# Sécurité de la base : RLS et stockage

**Exigence n° 1 : isolation stricte entre communes.** Toutes les tables de `public` ont la RLS activée ;
ce qui n'est pas autorisé par une policy est refusé. Les règles reprennent `@app/shared/permissions.ts`
et `workflow.ts`. Tests : `supabase/tests/database/02_rls_isolation.test.sql` et `03_storage.test.sql`
(exécutés en CI, job `database`).

## Fonctions d'aide (`private`, `security definer`, appelées en `(select private.fn(...))`)

| Fonction | Vrai si |
|---|---|
| `is_aal2()` | la session a validé sa double authentification (`aal2`) |
| `is_platform_admin()` | `app_metadata.platform_admin` **et** `aal2` |
| `tenant_open(t)` / `tenant_active(t)` | commune non suspendue / active |
| `has_role(t, roles)` | membre actif (non désactivé) de la commune avec l'un des rôles, en `aal2`, commune non suspendue |
| `is_staff(t)` | éditeur, ou membre actif de la commune |
| `has_permission(t, module, niveau)` | éditeur ou admin actif ; agent actif avec un niveau ≥ demandé (`read < edit < publish`), jamais `audit` |
| `citizen_tenant()` | commune du profil citoyen de l'utilisateur |
| `module_enabled(t, m)` / `public_module(t, m)` | module actif / commune active et module actif |

## Matrice (L = lecture, C = création, M = modification, S = suppression)

| Table | Anonyme | Habitant | Agent | Admin commune | Éditeur |
|---|---|---|---|---|---|
| `tenants` | L (actives) | L (actives) | L (la sienne) | L | LCM |
| `tenant_internal_notes` | — | — | — | — | LCMS |
| `tenant_branding`, `tenant_modules` | L (active) | L (active) | L | L | LCMS |
| `tenant_app_config` | L (active) | L (active) | L ; M si `settings` edit | LM | LCM |
| `tenant_store_info` | — | — | — | — | LCMS |
| `profiles` | — | L/C/M le sien | L (membres de ses communes), M le sien | idem | LCM |
| `memberships`, `membership_permissions` | — | — | L (sa commune) | LCMS (+ garde dernier admin) | LCMS |
| `citizen_profiles`, `push_tokens` | — | LCMS les siens | — | — | — |
| `topics` | L (active) | L | L ; CMS si `settings` edit | LCMS | LCMS |
| `posts` / `events` | L publiés en ligne, module actif | idem | L si `news`/`events` read ; CM si edit (+ workflow) ; S si publish | tout | tout |
| `content_reviews` | — | — | L si read ; C si edit (auteur = soi) | LC | LC |
| `media` | L (active) | L | L ; CMS si `media` edit | LCMS | LCMS |
| `place_categories`, `places` | L (module Carte actif) | L | L ; CMS si `map` edit (catégories par défaut non supprimables) | LCMS | LCMS |
| `procedures` | L (module actif) | L | L ; CMS si `procedures` edit | LCMS | LCMS |
| `sorting_guide_items`, `waste_zones`, `waste_schedules` | L (module Environnement actif) | L | L ; CMS si `environment` edit | LCMS | LCMS |
| `districts` | L (active) | L | L ; CMS si `districts` edit | LCMS | LCMS |
| `services` | — | — | L ; CMS si `settings` edit | LCMS | LCMS |
| `report_categories` | L (module Signalements actif) | L | L ; CMS si `settings` edit | LCMS | LCMS |
| `reports` | — | L ses signalements ; C dans sa commune (statut `new`, sans service ni priorité) | L si `reports` read ; M si edit (+ workflow) | LM | LM |
| `report_media` | — | L/C pour ses signalements (statut `new`) | L si `reports` read | L | L |
| `report_events` | — | L événements **publics** de ses signalements | L si read ; C si edit (auteur = soi) | LC | LC |
| `notifications` | — | — | L si read ; C/M (non envoyées) si publish | LCM | LCM |
| `audit_log` | — | — | — | L (sa commune) | L (tout) |
| `usage_daily` | — | — | L | L | L |
| `job_runs` | — | — | — | — | L |
| `tenant_counters`, `notification_deliveries`, `push_outbox` | — | — | — | — | serveur uniquement |

Sans `aal2`, un membre du personnel (y compris l'éditeur) n'a **aucun** accès aux données de gestion.
Une commune suspendue n'est plus accessible à ses membres.

## Règles appliquées par triggers (codes d'erreur `APP_…`, détail en français)

| Code | Règle |
|---|---|
| `APP_INVALID_STATUS` | un contenu est créé en brouillon |
| `APP_TRANSITION_NOT_ALLOWED` | transition hors du circuit (contenus : `CONTENT_TRANSITIONS` ; signalements : `REPORT_FLOW`) |
| `APP_PUBLISH_FORBIDDEN` | niveau insuffisant pour la transition (publication, refus, archivage) |
| `APP_PUBLISH_AT_REQUIRED` | programmation dans le passé |
| `APP_EDIT_FORBIDDEN` | modifier un contenu publié ou programmé sans le droit de publication ; une archive |
| `APP_DUPLICATE_REQUIRED` / `APP_DUPLICATE_READ_ONLY` | doublon sans original valide / doublon en lecture seule |
| `APP_MESSAGE_REQUIRED` | rejet d'un signalement sans motif (le motif devient public) |
| `APP_LAST_ADMIN` | retirer ou désactiver le dernier administrateur actif |

Les tâches serveur (clé service, `auth.uid()` nul) contournent le workflow : publication programmée, imports.

## Stockage

| Bucket | Accès | Chemin |
|---|---|---|
| `public-media` | public en lecture ; écriture si `media` edit | `<tenant_id>/…` |
| `report-photos` | privé ; dépôt par l'habitant dans son dossier, lecture par lui et par le personnel (`reports` read) | `<tenant_id>/<user_id>/…` |
| `branding` | public en lecture ; écriture par l'éditeur | `<tenant_id>/…` |
| `exports` | lecture par les admins de la commune et l'éditeur ; écriture serveur | `<tenant_id>/…` |

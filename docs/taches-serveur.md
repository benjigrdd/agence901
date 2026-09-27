# Tâches serveur (pg_cron, Edge Functions)

Principes : chaque traitement SQL accepte `p_now` (tests « dans le temps »), écrit son exécution dans
`job_runs` (début, fin, statut, compteurs) et verrouille ses lignes en `for update skip locked` : deux
exécutions simultanées ne traitent jamais la même ligne. Tout est idempotent.

## Planification

| Tâche | Fréquence | Exécution |
|---|---|---|
| Publication et dépublication programmées | chaque minute | `private.publish_due_content(p_now)` (SQL) |
| Envoi des notifications, suivi des signalements, accusés de réception | chaque minute | Edge Function `dispatch-notifications` |
| Rappels de collecte (la veille) | 16 h UTC (18 h Paris l'été) | Edge Function `send-waste-reminders` |
| Indicateurs d'usage de la veille | 1 h 15 UTC | `private.compute_usage_yesterday()` |
| Purge RGPD | 2 h 30 UTC | `private.purge_retention(p_now)` |

## Notifications

- **Alertes** : à la publication d'une actualité `alert` avec `send_push`, un trigger crée **une seule**
  notification (canal `alertes`, clé `alert:<id>`), ciblée sur ses quartiers ou toute la commune.
- **Destinataires** : `private.resolve_recipients` — jetons valides des habitants ciblés (commune,
  quartiers ou thèmes) qui ont accepté ce type (`alerts`, `news`, `events`, `wasteReminder`, `reportUpdates`).
- **Envoi** : `claim_due_notifications` (20 au plus, verrouillées, statut `sending`) → API Expo Push par
  lots de 100 → `record_push_results` (livraisons, statistiques, statut `sent` ; en erreur : nouvel essai,
  `failed` après 3 tentatives).
- **Suivi des signalements** : messages publics du personnel déposés dans `push_outbox` par
  `update_report_status`, envoyés au seul habitant concerné (canal `signalements`).
- **Accusés de réception** : 15 minutes après l'envoi, `getReceipts` ; `DeviceNotRegistered` invalide le jeton.
- Liens profonds : `data.url` (`/actualites/<id>`, `/agenda/<id>`, `/signalements/<id>`, `/environnement`).

## Secrets (jamais dans les migrations)

À créer une fois par projet (SQL editor Supabase) :

```sql
select vault.create_secret('https://<projet>.supabase.co/functions/v1', 'functions_url');
select vault.create_secret('<clé service_role>', 'service_role_key');
```

Variables des Edge Functions (`supabase secrets set`) : `EXPO_ACCESS_TOKEN` (jeton d'accès Expo, lot 16),
`SITE_URL` (adresse du dashboard, liens d'invitation). Sans secrets Vault, les appels planifiés sont ignorés
(message dans les journaux) : c'est le cas en local.

## Tests

- pgTAP `supabase/tests/database/04_jobs.test.sql` : publication à l'heure (temps simulé), dépublication,
  journal, alerte unique, ciblage et préférences, verrouillage, jeton invalidé, purge.
- `packages/data/src/supabase/push-dispatch.test.ts` : l'Edge Function envoie vers un **faux service Expo**
  local (aucun envoi réel) ; livraisons et statut vérifiés ; refus sans clé service.

# Durées de conservation (appliquées automatiquement)

Purge quotidienne `private.purge_retention()` (voir `docs/taches-serveur.md`). Durées proposées par
défaut : chaque commune les valide avec son DPO (registre des traitements).

| Donnée | Durée | Traitement |
|---|---|---|
| Journal d'audit | 12 mois | suppression |
| Archives d'export de réversibilité (bucket `exports`) | 7 jours | suppression (Edge Function `purge-exports`) |
| Livraisons de notifications | 90 jours | suppression |
| File de suivi des signalements (envoyée) | 30 jours | suppression |
| Jetons push invalides | 30 jours après invalidation | suppression |
| Email de contact d'un signalement clos | 12 mois après clôture | effacement de l'email |
| Lien signalement ↔ habitant | 36 mois après clôture | le signalement est détaché de l'habitant |
| Habitant anonyme inactif | 24 mois sans ouverture de l'app | compte, profil et jetons supprimés |
| Exécutions des tâches (`job_runs`) | 90 jours | suppression |

À la demande de l'habitant (« Supprimer mes données ») : compte, profil et jetons supprimés
immédiatement ; ses signalements restent (utiles à la commune) mais sans lien ni email.

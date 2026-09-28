# Souveraineté et réversibilité de l'hébergement

## Aujourd'hui

| Composant | Hébergeur | Localisation |
|---|---|---|
| Base, Auth, Storage, Edge Functions | Supabase (AWS) | Paris (eu-west-3) |
| Dashboard | Vercel | région de calcul `cdg1` (Paris) ; réseau de diffusion mondial |
| Sauvegardes chiffrées | Scaleway Object Storage | Paris (fr-par) |
| Erreurs applicatives | Sentry | UE (Francfort) |
| Emails | Brevo | UE |

Supabase, Vercel et Sentry sont des sociétés américaines (exposition possible au droit américain,
encadrée par les clauses contractuelles types et le Data Privacy Framework — à réévaluer par le DPO).

## Plan de migration vers un hébergeur européen

Le code ne dépend d'aucune API propriétaire de Vercel :

1. **Dashboard** : `output: 'standalone'` et `apps/dashboard/Dockerfile` (construit en CI). Déploiement
   sur Scaleway Serverless Containers ou OVHcloud (Managed Kubernetes / Web PaaS) : mêmes variables
   d'environnement, `/api/health` pour la surveillance.
2. **Supabase** : Supabase est open source ; auto-hébergement possible (Docker) chez Scaleway ou OVHcloud,
   ou migration du Postgres vers une offre managée (PostGIS, pg_cron requis) avec Auth et Storage
   auto-hébergés. Procédure : restauration complète (`docs/runbooks/restauration.md`) vers la nouvelle
   instance, bascule DNS, rotation des clés.
3. **Sentry** : remplaçable par GlitchTip (compatible avec le SDK Sentry) auto-hébergé.
4. **Données des communes** : export de réversibilité (lot 17) pour chaque commune.

Durée estimée d'une migration complète : à évaluer lors d'un exercice sur l'environnement de staging.

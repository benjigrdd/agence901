# Runbook — restauration

Objectifs : **RPO 24 h** (sauvegarde quotidienne de la base, hebdomadaire des fichiers) ; **RTO 4 h**.
En complément des sauvegardes internes de Supabase (point-in-time selon l'offre).

## Pré-requis

- Clé privée age (hors ligne chez l'éditeur, copie dans le secret `AGE_IDENTITY` de l'environnement
  GitHub `restore`). Clés publiques : `ops/backup/age-recipients.txt`.
- Accès en lecture au bucket Scaleway (`SCW_BUCKET`, préfixes `db/` et `storage/`).
- Client PostgreSQL 17, Node 24 et pnpm, CLI Supabase.
- Utilisateur de sauvegarde en production (lecture seule, à créer une fois) :
  ```sql
  create role backup_reader login password '<secret>' bypassrls;
  grant usage on schema public, private, auth, storage to backup_reader;
  grant select on all tables in schema public, private, auth, storage to backup_reader;
  alter default privileges in schema public, private grant select on tables to backup_reader;
  ```
  (Si `bypassrls` n'est pas autorisé sur l'offre, utiliser l'utilisateur `postgres` via le pooler en
  mode session et le documenter dans la liste des secrets.)

## Restauration complète

1. Créer (ou réinitialiser) le projet Supabase cible en région Paris ; `supabase link --project-ref <ref>`.
2. Appliquer le schéma du dépôt **au commit correspondant à la sauvegarde** : `supabase db push`.
3. Télécharger et déchiffrer :
   ```bash
   aws s3 cp s3://$SCW_BUCKET/db/<fichier>.dump.age db.dump.age --endpoint-url https://s3.fr-par.scw.cloud
   AGE_IDENTITY='AGE-SECRET-KEY-…' pnpm exec tsx scripts/backup/age.ts decrypt db.dump.age db.dump
   ```
4. Restaurer les données puis contrôler :
   `scripts/backup/restore-data.sh db.dump "postgresql://postgres:<mdp>@db.<ref>.supabase.co:5432/postgres"`
   (vide les tables, restaure `public`, `private`, `auth`, `storage` sans les tables de suivi des migrations,
   puis exécute `scripts/backup/restore-check.sql`).
5. Fichiers : télécharger `storage/<date>.tar.gz.age`, déchiffrer, puis
   `aws s3 sync <dossier>/<bucket> s3://<bucket> --endpoint-url <endpoint S3 Supabase>` pour chaque bucket.
6. Redéployer les Edge Functions et leurs secrets, vérifier `/api/health`, une connexion avec 2FA,
   l'envoi d'une notification de test.
7. Supprimer les fichiers déchiffrés (`shred -u`). Consigner l'incident.

## Restauration d'une seule commune

Cas : suppression accidentelle de contenus d'une commune, les autres communes ne devant pas revenir en arrière.

1. Restaurer le dump dans une base **temporaire** (Supabase local : `pnpm db:start`, puis étape 4 ci-dessus
   vers `postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres`).
2. Extraire les lignes de la commune (`tenant_id = '<uuid>'`) des tables concernées, par exemple :
   ```sql
   \copy (select * from public.posts where tenant_id = '<uuid>') to 'posts.csv' csv header
   ```
3. En production, dans une transaction, supprimer puis réinsérer ces lignes (ou seulement les lignes
   manquantes), en respectant l'ordre des clés étrangères (catégories et services avant contenus,
   signalements avant événements de signalement). Désactiver l'audit pour l'opération
   (`set local app.skip_audit = 'on'`) et consigner la restauration dans le journal d'incident.
4. Vérifier dans le dashboard de la commune, prévenir son administrateur.

## Test mensuel

`restore-test.yml` (1er de chaque mois, ou « Run workflow ») : dernière sauvegarde → Supabase éphémère →
contrôles ; rapport dans le résumé de l'exécution. Un échec est traité comme un incident.

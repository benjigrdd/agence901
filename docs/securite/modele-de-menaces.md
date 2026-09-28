# Modèle de menaces (résumé STRIDE)

Périmètre : dashboard Next.js (personnel des communes, éditeur), apps mobiles (habitants), Supabase
(Postgres/PostGIS, Auth, Storage, Edge Functions, pg_cron) en région Paris, services tiers listés dans
`docs/rgpd/contrat-sous-traitance-annexe.md`.

## Actifs

| Actif | Sensibilité |
|---|---|
| Signalements (photos, position, email de contact facultatif) | données personnelles des habitants |
| Comptes du personnel (email, rôle, facteur TOTP) | accès aux données de la commune |
| Contenus publiés (actualités, alertes, notifications push) | intégrité, image de la commune (fausse alerte) |
| Clés : `service_role`, JWT, clés App Store / Play, clé privée age des sauvegardes | compromission totale |
| Sauvegardes et exports de réversibilité | copie complète des données |
| Journal d'audit | preuve et traçabilité |

## Acteurs

- **Habitant malveillant** : spam de signalements, contenu injurieux, tentative de lire les signalements d'autrui.
- **Agent d'une autre commune** : accès aux données d'une commune dont il n'est pas membre.
- **Compte du personnel volé** (hameçonnage, mot de passe réutilisé).
- **Fournisseur compromis** (dépendance npm, service tiers), **attaquant externe** (XSS, CSRF, injection).
- **Membre de l'éditeur** : accès large, à tracer.

## Menaces et mesures en place

| STRIDE | Menace | Mesures |
|---|---|---|
| Usurpation | vol de mot de passe du personnel | 2FA TOTP obligatoire (`aal2` vérifié dans le proxy, les gardes serveur **et** toutes les policies RLS) ; politique de mots de passe ; rotation de session |
| Usurpation | liens magiques / redirection ouverte | `token_hash` vérifié côté serveur ; paramètre `next` restreint aux chemins internes (`safeNextPath`, refuse `//` et `/\`) |
| Altération | écriture dans une autre commune | `tenant_id` sur chaque table, RLS partout (test pgTAP : aucune table de `public` sans RLS), gardes des dépôts `@app/data`, tests de contrat d'isolation |
| Altération | XSS dans les contenus | texte riche en structure JSON validée par zod (pas de HTML libre) ; CSP stricte à nonce (`script-src 'nonce-…' 'strict-dynamic'`), `frame-ancestors 'none'` |
| Altération | CSV malveillant (injection de formules) | cellules `= + - @` neutralisées à l'export ; import CSV revalidé côté serveur (zod) |
| Répudiation | action contestée | journal d'audit (déclencheurs en base, acteur, avant/après), imports et exports inscrits (`import_*`, `tenant_exported`) |
| Divulgation | lecture de signalements d'un autre habitant | RLS par `reporter_id`, photos dans un bucket privé (URL signées), habitant pseudonymisé dans le dashboard |
| Divulgation | données personnelles dans les journaux ou Sentry | `sendDefaultPii: false`, `beforeSend` qui efface emails, coordonnées, jetons et paramètres d'URL (testé) ; export de réversibilité sans données personnelles par défaut |
| Divulgation | fuite de secrets | aucun secret dans le dépôt (gitleaks en CI) ; `service_role` uniquement dans les Edge Functions et scripts d'exploitation |
| Déni de service | abus des fonctions coûteuses | limitation du débit par utilisateur et par minute (`rate_limits`) sur `invite-member`, `export-tenant`, `import-osm`, `import-irve`, `sync-tenant-geometry` ; une requête Overpass par commune toutes les 30 s ; limites d'Auth Supabase |
| Élévation de privilèges | agent qui s'accorde des droits | droits vérifiés en base (`private.has_permission`), dernier administrateur protégé, fonctions `security definer` à `search_path` fixé (test pgTAP) |
| Chaîne d'approvisionnement | dépendance vulnérable | `pnpm audit --prod` (échec sur « high »/« critical »), Dependabot, lockfile figé |

## Revue des server actions et route handlers (lot 19)

- Entrées : validées par zod dans l'action ou, à défaut, par le dépôt (`parseInput`) avant toute
  écriture ; identifiants invalides → « Valeur non autorisée » sans détail.
- Accès : toujours via `getRepos()` avec le contexte de session ; les route handlers d'export
  (`signalements/export`, `audit/export`, `admin/usage/export`, `api/admin/communes`) vérifient session,
  `aal2` et rôle ; `/api/health` ne lit aucune donnée.
- Erreurs : messages génériques traduits (`toActionError`), jamais de donnée d'une autre commune
  (une commune non autorisée répond 404).
- Correctif appliqué : redirection ouverte via `/\hôte` dans `next` (connexion, confirmation d'email).

## Risques résiduels et recommandations

- Poste d'un agent compromis (session active) : durée maximale de session à régler en production
  (`docs/auth.md`), formation du personnel.
- Signalements abusifs : modération manuelle ; limitation du débit côté app à ajouter avec les écrans mobiles.
- **Test d'intrusion externe recommandé avant la dixième commune** (prestataire qualifié, périmètre :
  dashboard, API Supabase, Edge Functions, app mobile).

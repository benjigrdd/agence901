# Mise en production — checklist

À dérouler avec la commune pilote. Chaque ligne cochée porte une date et une preuve (lien d'exécution,
capture). État au 28/09/2026 : les éléments réalisables dans le dépôt sont faits ; ceux qui demandent les
comptes de production (Supabase, Vercel, Sentry, Scaleway, Brevo, domaine) restent **à faire**.

## 1. Qualité

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` au vert ; pgTAP ; contrat Supabase ; Playwright (mock et Supabase local).
- [x] axe : zéro violation « serious » ou « critical » sur toutes les routes, 3 profils (bloquant en CI).
- [x] CSP sans violation dans la console sur les parcours principaux (test automatisé).
- [x] Image Docker du dashboard construite (CI, job `docker`).
- [x] `pnpm audit --prod` sans vulnérabilité haute ou critique ; gitleaks : aucun secret dans l'historique.
- [ ] Vérifications NVDA et VoiceOver des parcours principaux (`docs/accessibilite/grille-dashboard.md`).
- [ ] Grille mobile remplie sur le build de preview (`docs/accessibilite/grille-mobile.md`) — app mobile à développer (lots 08–10).

## 2. Infrastructure

- [ ] Projets Supabase `staging` et `production` en région Paris ; secrets des Edge Functions posés (§5).
- [ ] Conseillers Supabase (Security et Performance Advisors) au vert sur staging et production.
- [ ] Environnements GitHub `staging`, `production` (relecteurs obligatoires), `backup`, `restore` créés ; premier déploiement de production approuvé.
- [ ] Vercel : projet `apps/dashboard` (`vercel.json`, région `cdg1`), Preview protégé et branché sur staging, Production branchée sur production.
- [ ] Domaine `app.<domaine>` en HTTPS ; HSTS vérifié ; URLs de redirection Auth mises à jour.
- [ ] Réglages Auth de production appliqués et cochés (`docs/auth.md`) ; emails reçus (invitation, réinitialisation) depuis Brevo.
- [ ] Vault de production : secrets `functions_url` et `service_role_key` (tâches pg_cron, `docs/taches-serveur.md`).

## 3. Supervision et sauvegardes

- [ ] Sentry (UE) : une erreur provoquée apparaît **sans** email ni coordonnées ; source maps reçues.
- [ ] Surveillance externe de `/api/health` (service hébergé en UE, par exemple : à choisir) avec alerte.
- [ ] Alerte des tâches : `job-alerts` reçu par l'éditeur (secrets SMTP et `ALERT_EMAIL_TO`).
- [ ] Paire de clés age générée (`tsx scripts/backup/age.ts keygen`) : clé publique dans `ops/backup/age-recipients.txt`, clé privée hors ligne et dans l'environnement `restore`.
- [ ] Bucket Scaleway `fr-par` avec la règle `ops/backup/lifecycle.json` ; `backup.yml` exécuté ; sauvegarde chiffrée présente.
- [ ] `restore-test.yml` exécuté manuellement et au vert.

## 4. Conformité et commune pilote

- [ ] Dossier RGPD remis à la commune (`docs/rgpd/`) et annexe article 28 signée.
- [ ] Modèle de déclaration d'accessibilité fourni (`docs/accessibilite/declaration-modele.md`) et engagements (`schema-pluriannuel-extrait.md`).
- [ ] Politique de confidentialité de l'app publiée à une URL stable.
- [ ] Commune pilote configurée (marque, modules, contour officiel, contenus réels) ; comptes du personnel créés avec 2FA.
- [ ] App de la commune en revue sur les stores (lot 18, reporté).

## 5. Inventaire des secrets

Jamais dans le dépôt. Rotation : annuelle, et immédiatement en cas de départ d'une personne habilitée ou d'incident.

| Secret | Où | Qui y a accès | Rotation |
|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | GitHub Environments `staging`, `production` | mainteneurs de l'éditeur | annuelle |
| `service_role` Supabase | Edge Functions (automatique), Vault (`service_role_key`) | Supabase, éditeur (lecture tableau de bord) | à la demande (régénération des clés du projet) |
| Clé anonyme / publishable | Vercel (`NEXT_PUBLIC_SUPABASE_*`), app mobile | publique par nature | avec la rotation JWT |
| `SUPABASE_DB_URL` (utilisateur `backup_reader`), clés S3 Supabase et Scaleway | GitHub Environment `backup` | mainteneurs | annuelle |
| `AGE_IDENTITY` (clé privée des sauvegardes) | hors ligne chez l'éditeur + GitHub Environment `restore` | 2 personnes nommées | à chaque départ ; ré-chiffrement non nécessaire (nouvelles sauvegardes) |
| `SENTRY_AUTH_TOKEN`, DSN | Vercel / GitHub | mainteneurs | annuelle |
| SMTP Brevo (`SMTP_*`), `ALERT_EMAIL_TO` | Supabase (Auth et secrets des Edge Functions) | mainteneurs | annuelle |
| `OPEN_DATA_CONTACT` | secrets des Edge Functions | mainteneurs | — |
| `EXPO_TOKEN`, clés App Store Connect et comptes de service Google Play | EAS / GitHub (lot 18) | mainteneurs | annuelle |

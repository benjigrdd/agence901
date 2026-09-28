# Authentification du personnel

Mode choisi par `DATA_SOURCE` : `mock` (personas de développement, cookie) ou `supabase` (Supabase Auth).

## Parcours

| Étape | Page | Détail |
|---|---|---|
| Connexion | `/connexion` | email + mot de passe ; message générique « Identifiants incorrects » ; lien « Mot de passe oublié » |
| 2FA | `/connexion/2fa` | code à 6 chiffres (`inputmode="numeric"`, `autocomplete="one-time-code"`), `mfa.challengeAndVerify` sur chaque appareil vérifié |
| Configuration 2FA | `/connexion/2fa/configurer` | `mfa.enroll` TOTP : QR code **et** clé en texte ; recommandation d'un second appareil |
| Mot de passe oublié | `/mot-de-passe-oublie` → email → `/auth/confirm` → `/reinitialiser` | message identique que le compte existe ou non |
| Invitation | email → `/auth/confirm` → `/invitation` → `/connexion/2fa/configurer` | 12 caractères minimum, jauge de robustesse (`@app/shared/password.ts`), `accept_invitations()` |
| Sécurité du compte | `/compte/securite` | appareils 2FA (ajout, suppression s'il en reste un), changement de mot de passe |
| Déconnexion | menu utilisateur | « Se déconnecter » et « Se déconnecter de tous les appareils » (`signOut({ scope: 'global' })`) |

## Protection

- `src/proxy.ts` (Next 16 : ex-middleware) rafraîchit la session (`auth.getUser()`) et redirige :
  non connecté → `/connexion?next=…` ; connecté en `aal1` avec un appareil → `/connexion/2fa` ; sans appareil →
  `/connexion/2fa/configurer`.
- `getSession()` (`src/server/session.ts`) construit la même `Session` que le mock : `aal` depuis
  `mfa.getAuthenticatorAssuranceLevel()`, drapeau éditeur depuis `app_metadata.platform_admin`, appartenances
  actives et droits lus sous RLS. Les gardes (`requireSession`, `requirePermission`, `requirePlatformAdmin`) restent inchangées.
- La base refuse toute donnée de gestion sans `aal2` (voir `docs/rls.md`).
- **La clé `service_role` n'est jamais utilisée par le dashboard.** Les invitations passent par l'Edge Function
  `invite-member` (vérifie l'appelant avec son jeton, puis `record_invitation` avec la clé service côté Supabase).
- Rôle éditeur : `scripts/set-platform-admin.ts` (clé service lue dans l'environnement de l'exploitant).

## Emails

Modèles `supabase/templates/invite.html` et `recovery.html` : liens `…/auth/confirm?token_hash=…&type=…&next=…`
vérifiés côté serveur (`verifyOtp`). En local, les emails arrivent dans Mailpit (`http://127.0.0.1:54324`).

## Comptes locaux (seed)

| Compte | Email | 2FA |
|---|---|---|
| Éditeur | `editeur@plateforme-demo.test` | configurée |
| Admin Alpha | `admin@demo-alpha.test` | configurée |
| Agent Alpha | `agent@demo-alpha.test` | configurée |
| Admin Bêta | `admin@demo-beta.test` | configurée |
| Admin Alpha sans 2FA | `admin2@demo-alpha.test` | à configurer |

Mot de passe `Demo-Local-2026!` et secret TOTP `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP` (à ajouter dans une
application d'authentification pour se connecter à la main). **Uniquement en local** : le seed refuse toute autre base.

## Réglages de production (tableau de bord Supabase › Authentication)

À appliquer sur **staging et production**, puis cocher (date et initiales). Non applicables en local.

| Réglage | Valeur | Fait |
|---|---|---|
| Site URL et URL de redirection | `https://app.<domaine>`, `https://app.<domaine>/auth/confirm` (et l'URL de preview protégée pour staging) | [ ] |
| MFA TOTP | activé (obligatoire côté application) | [ ] |
| Durée maximale de session (« time-box ») | 12 h ; déconnexion après inactivité : 2 h | [ ] |
| Rotation des jetons de rafraîchissement | activée, détection de réutilisation | [ ] |
| Protection des mots de passe | longueur ≥ 12 (règle de l'app), **vérification des mots de passe compromis** (HaveIBeenPwned) | [ ] |
| Inscriptions publiques par email | désactivées (comptes créés par invitation uniquement) ; connexions anonymes activées (app habitants) | [ ] |
| SMTP | Brevo (UE), expéditeur `no-reply@<domaine>` avec SPF, DKIM et DMARC | [ ] |
| Limitation du débit (Auth › Rate limits) | emails : 30/h ; vérifications OTP et connexions : valeurs par défaut ou plus strictes | [ ] |
| Modèles d'email | ceux du dépôt (`supabase/templates/`) | [ ] |

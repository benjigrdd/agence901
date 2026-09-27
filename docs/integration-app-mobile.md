# Brancher l'app mobile sur la plateforme

L'app citoyenne n'est pas encore développée. La plateforme expose déjà tout ce dont elle a besoin ;
ce guide décrit comment la brancher (Expo / React Native, ou toute autre technologie).

## 1. Configuration

| Variable | Valeur |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase (staging : `https://ricbljsdibhbysntzuuf.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | clé anonyme (ou « publishable ») du projet — **jamais la clé service** |
| `EXPO_PUBLIC_TENANT_SLUG` | commune de l'app (ex. `demo-alpha`), fixée au build (une app par commune) |

Client recommandé : `@supabase/supabase-js` avec un stockage de session persistant (AsyncStorage /
SecureStore), `autoRefreshToken: true`, `detectSessionInUrl: false`.

## 2. Session de l'habitant (sans compte obligatoire)

1. Au premier lancement : `supabase.auth.signInAnonymously()` (activé dans `supabase/config.toml`).
2. Puis `citizen.getOrCreateProfile({ session, tenantId })` crée le profil rattaché à la commune.
3. L'habitant peut plus tard lier un email (`supabase.auth.updateUser({ email })`) sans perdre ses données.

La base n'expose à l'habitant que **ses propres** données (RLS, voir `docs/rls.md`).

## 3. Accès aux données : réutiliser `@app/data`

L'app peut importer le même adaptateur que le dashboard (TypeScript, pas de dépendance Node) :

```ts
import { createRepositories } from '@app/data';

const repos = createRepositories({ source: 'supabase', resolve: () => supabase });
const ctx = { session: { userId, isPlatformAdmin: false, aal: 'aal1', memberships: [] }, tenantId };
```

| Besoin | Appel |
|---|---|
| Commune, marque, modules, configuration de l'accueil | `repos.tenants.getPublicBySlug(slug)`, `branding.get`, `modules.list`, `appConfig.get` |
| Fil public (actualités, agenda, lieux) | `repos.citizen.publicFeed(ctx)` |
| Carte, catégories, démarches, tri, collectes | `places.list`, `placeCategories.list`, `procedures.list`, `environment.sortingGuide.list`, `environment.nextCollections(ctx, zoneId, new Date(), 8)` |
| Quartiers et thèmes (préférences) | `districts.list`, `topics.list`, puis `citizen.updatePreferences` |
| Signaler | photo : `storage.from('report-photos').upload('<tenantId>/<userId>/<uuid>.jpg')`, puis `citizen.createReport(ctx, { …, photos: [chemin], clientRequestId })` |
| Mes signalements | `citizen.listMyReports(ctx)` (événements **publics** uniquement) |
| Notifications push | `citizen.registerPushToken(ctx, { token, platform, locale })` au démarrage, `unregisterPushToken` à la déconnexion |
| Mesure d'usage | `citizen.touch(ctx)` à l'ouverture (date du jour uniquement, aucun traceur) |
| Supprimer mes données | `citizen.deleteMyData(ctx)` (Edge Function `delete-account`), puis `supabase.auth.signOut()` |

Chaque réponse est validée par les schémas zod de `@app/shared` (mêmes types que le dashboard).

## 4. Hors ligne

- Générer un `clientRequestId` (uuid) **à la création** du signalement dans l'app et le conserver dans
  la file locale : un renvoi avec le même identifiant renvoie le signalement déjà créé (aucun doublon).
- Lire depuis le cache local (TanStack Query persisté) quand le réseau est absent.

## 5. Notifications push

- Canaux Android à créer dans l'app : `alertes`, `informations`, `collecte`, `signalements`.
- Chaque notification porte `data.url` (lien profond vers l'actualité, l'événement ou le signalement).
- L'envoi est fait par la plateforme (Edge Function `dispatch-notifications`, lot 16) : l'app ne fait
  qu'enregistrer son jeton Expo.

## 6. Données publiques de la commune

Lisibles sans session si la commune est **active** et le module **activé** : actualités et événements
publiés et en ligne, lieux, catégories, démarches, consignes de tri, zones et calendriers de collecte,
quartiers, thèmes, catégories de signalement, marque, modules, configuration de l'accueil.
Une commune suspendue ne renvoie plus rien : afficher un message neutre.

## 7. Vérification

`SUPABASE_CONTRACT=1 pnpm --filter @app/data exec vitest run src/supabase` rejoue le parcours complet
d'un habitant avec une vraie session anonyme (`citizen-flow.test.ts`).

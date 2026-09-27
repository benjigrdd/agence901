# Imports open data, CSV et export de réversibilité (lot 17)

Tous les imports vérifient les droits **avec le jeton de l'appelant** (RLS, 2FA). Seule l'écriture finale
des imports open data utilise la clé service, dans une Edge Function, avec la commune vérifiée. Chaque
import est inscrit dans l'audit avec ses compteurs (`import_osm`, `import_irve`, `import_csv`) ; l'export,
avec `tenant_exported`. Les imports sont **manuels** (bouton) au V1.

## Sources et licences

| Source                                                                                               | Utilisation                 | Licence / mention                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| geo.api.gouv.fr `communes/{insee}?fields=contour,centre,population&geometry=contour`                 | contour, centre, population | Licence Ouverte (Etalab)                                                                                                                |
| Overpass API `https://overpass-api.de/api/interpreter`                                               | équipements OSM             | **ODbL : « © contributeurs OpenStreetMap »** sur la fiche de chaque lieu importé (dashboard ; app mobile : `PLACE_SOURCE_ATTRIBUTIONS`) |
| data.gouv.fr, jeu « Base nationale des IRVE » (id `5448d3e0c751df01f85d0572`, vérifié le 27/09/2026) | bornes de recharge          | Licence Ouverte : « Source : Base nationale des IRVE, data.gouv.fr »                                                                    |
| API Adresse de la Géoplateforme `https://data.geopf.fr/geocodage/search/csv`                         | géocodage des imports CSV   | Licence Ouverte                                                                                                                         |

Les tuiles OpenStreetMap ne sont jamais utilisées (cartes : MapLibre + MapTiler).

## Contour de la commune — `sync-tenant-geometry`

- Éditeur uniquement ; appelée à la création d'une commune (échec sans blocage) et depuis la fiche
  super-admin (« Récupérer le contour officiel »).
- Met à jour `tenants.contour` (MultiPolygon), `center` et `population` via `set_tenant_geometry` (clé service).
- `tenant_contains(tenant, lng, lat)` : contour s'il existe, **sinon disque de 5 km autour du centre**
  (communes créées avant la synchronisation, API indisponible).
- En local, les tests utilisent un contour fictif servi par un faux geo.api.gouv.fr ; un code INSEE réel
  n'est utilisé qu'en staging.

## OpenStreetMap — `import-osm`

- Entrée `{ tenantId, categories, dryRun?, previewId? }`, droit `map` en `edit`.
- Correspondance des étiquettes : `@app/shared/osm-mapping.ts` (testée). Copie Deno générée par
  `pnpm db:generate` dans `supabase/functions/_shared/osm-mapping.ts` (test de parité).
- Requête limitée à la limite administrative (`area["ref:INSEE"=…]["admin_level"="8"]`), `out center`,
  60 s. User-Agent `plateforme-mairies/1.0 (+contact)` (secret `OPEN_DATA_CONTACT`).
- **Politique d'usage** : une requête à la fois par commune et 30 s au moins entre deux (journal
  `job_runs`) ; sinon réponse 429 « réessayez dans une minute » (`ConflictError` côté `@app/data`). L'aperçu (`dryRun`) conserve son résultat
  15 min : l'import confirmé (`previewId`) le réutilise sans nouvelle requête Overpass.
- Nom : `name`, sinon libellé générique ; horaires `opening_hours` ; `wheelchair` ; `external_id`
  `node/123` ou `way/456` ; aire de jeux = parc de sous-type `aire-de-jeux` (`attributes.subtype`).
- Upsert sur (`tenant_id`, `source`, `external_id`) ; un lieu **détaché** (`places.detached`, bouton
  « Détacher de l'import » de la fiche) n'est jamais écrasé. Retour : créés, mis à jour, ignorés, par catégorie.

## Bornes de recharge — `import-irve`

1. `GET https://www.data.gouv.fr/api/1/datasets/5448d3e0c751df01f85d0572/` : ressource CSV `main` de
   consolidation la plus récente (« dernière version à date du schéma » de préférence). Aucune URL de
   ressource datée n'est codée en dur.
2. API tabulaire de data.gouv.fr (`tabular-api.data.gouv.fr/api/resources/{id}/data/`) filtrée sur
   `code_insee_commune__exact`, 50 points de charge par page, 40 pages au plus.
3. Regroupement par `id_station_itinerance` : un lieu « borne de recharge » par station, avec
   `attributes.chargePoints` (`nbre_pdc`, sinon nombre de lignes), `powersKw` (`puissance_nominale`),
   `operator` ; position `consolidated_latitude/longitude`, sinon `coordonneesXY`.

**Limite de temps** : le fichier national fait ~150 Mo ; le lire en flux dépasserait le budget CPU d'une
Edge Function. Le filtrage côté data.gouv.fr (API tabulaire) évite le problème. Si l'API tabulaire
devenait indisponible pour cette ressource, la bascule prévue est une GitHub Action hebdomadaire qui
télécharge le CSV, prépare un extrait par code INSEE dans Storage et que `import-irve` lirait à la place.

## Import CSV générique (dashboard)

`components/csv-import/` ; définitions et validation dans `@app/shared/csv-import.ts`.

| Entité           | Page          | Colonnes obligatoires                                                      |
| ---------------- | ------------- | -------------------------------------------------------------------------- |
| Lieux            | Carte         | nom, categorie (clé ou libellé), adresse ; latitude/longitude ou géocodage |
| Événements       | Agenda        | titre, debut (`JJ/MM/AAAA [HH:MM]` ou ISO, heure de Paris)                 |
| Démarches        | Démarches     | titre, description, valeur (lien https, téléphone ou email)                |
| Consignes de tri | Environnement | dechet, bac, conseil                                                       |

1. Fichier : papaparse, séparateur `;`, `,` ou tabulation ; UTF-8, sinon Windows-1252 avec avertissement.
2. Correspondance des colonnes : suggestions par nom (sans accents ni casse), sélecteurs accessibles.
3. Aperçu des 20 premières lignes ; **toutes** les lignes sont validées (zod) avec erreurs par ligne et
   colonne (« Ligne 14 : date de début invalide »).
4. Import des lignes valides (2 000 au plus) par une server action, en lots de 200, **revalidées côté
   serveur** ; rapport final téléchargeable (CSV des erreurs).

- Géocodage des lieux (et lieux d'événements) sans coordonnées : API Adresse en mode CSV, un appel par
  lot, restreint à la commune (`citycode`), score minimal 0,6 (sinon « Adresse non trouvée »).
- Modèles CSV téléchargeables (en-têtes FR, une ligne d'exemple) pour chaque entité.
- Idempotence des lieux : colonne `identifiant_externe` → mise à jour du lieu `source = 'csv'` existant.
- Aucune donnée personnelle n'est importable par CSV.

## Export de réversibilité — `export-tenant`

- Administrateur de la commune ou éditeur, en `aal2`. Boutons : Paramètres › Commune (« Exporter toutes
  les données ») et fiche super-admin.
- ZIP : `README.txt` (fichiers et format), `donnees/<table>.json` et `.csv` pour chaque table de la
  commune, `geo/quartiers.geojson`, `geo/zones-de-collecte.geojson`, `geo/lieux.geojson`, `medias/`
  (bucket `public-media`).
- **Données personnelles** (email de contact, identifiant pseudonyme, `photos-signalements/`) seulement
  si « Inclure les données personnelles » est coché, par un administrateur de la commune (jamais par
  l'éditeur), avec avertissement RGPD.
- Écrit dans `exports/{tenant_id}/{date}-{uuid}.zip` ; lien signé valable **24 h** ; archive supprimée
  après **7 jours** par l'Edge Function `purge-exports`, appelée par `private.purge_retention`
  (API Storage : une suppression SQL laisserait les fichiers orphelins).

## Tests

- Vitest `@app/shared` : correspondance OSM, séparateur et encodage, validation ligne par ligne, modèles.
- Vitest dashboard : requête et réponse du géocodage CSV.
- Supabase local (`SUPABASE_CONTRACT=1`, `open-data-flow.test.ts`) : les Edge Functions réelles contre de
  faux Overpass, data.gouv.fr et geo.api.gouv.fr (contour, aperçu et import OSM, réimport sans doublon,
  lieu détaché, 403 sans droit, IRVE paginé, contenu du ZIP avec et sans données personnelles).
- pgTAP `05_open_data` : `tenant_contains`, upsert idempotent, audit, droits du bilan CSV.
- Playwright : import CSV d'événements Windows-1252 avec correspondance manuelle et 3 erreurs.

## Pistes V2

Synchronisation planifiée des imports (OSM mensuel, IRVE hebdomadaire) avec rapport des différences ;
connecteurs OpenAgenda, GTFS, Atmo.

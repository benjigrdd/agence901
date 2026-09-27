import { createServer } from 'node:http';

import { strFromU8, unzipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ctxOf } from '../contract';
import { ConflictError, ForbiddenError } from '../errors';
import type { PersonaKey } from '../personas';
import { createSupabaseRepositories } from './index';
import { localPersonaResolver } from './local-personas';

/**
 * Contour, imports open data et export ZIP par les Edge Functions, avec de FAUX services
 * Overpass, data.gouv.fr et geo.api.gouv.fr. Supabase local : SUPABASE_CONTRACT=1.
 */
const run = process.env.SUPABASE_CONTRACT === '1' ? describe : describe.skip;
const PORT = 54997;
const FAKE = `http://host.docker.internal:${PORT}`;
// Identifiants propres a chaque execution (la base locale n'est pas reinitialisee entre deux lancements).
const BASE = 100_000 + Math.floor(Math.random() * 800_000);
const STATION = `FRTEST${BASE}`;

const tags = (i: number) =>
  i % 3 === 0
    ? { amenity: 'toilets' }
    : i % 3 === 1
      ? { amenity: 'drinking_water', name: `Fontaine ${i}` }
      : { leisure: i % 2 ? 'park' : 'playground' };
const osmElements = [
  ...Array.from({ length: 30 }, (_, i) => ({
    type: 'node',
    id: BASE + i,
    lat: 47.39 + i / 1000,
    lon: 0.69,
    tags: tags(i),
  })),
  // Non retenus : hors correspondance, sans position.
  { type: 'node', id: BASE + 900, lat: 47.4, lon: 0.7, tags: { amenity: 'bench' } },
  { type: 'way', id: BASE + 901, tags: { amenity: 'toilets' } },
];
const irvePages = [
  [
    {
      id_station_itinerance: STATION,
      nom_station: 'Parking de la mairie',
      adresse_station: '1 place de la Mairie',
      coordonneesXY: [0.69, 47.39],
      nbre_pdc: 2,
      puissance_nominale: 22,
      nom_operateur: 'Opérateur test',
      horaires: '24/7',
    },
    { id_station_itinerance: STATION, puissance_nominale: 50, coordonneesXY: [0.69, 47.39] },
  ],
  [
    {
      id_station_itinerance: `${STATION}B`,
      nom_station: 'Gare',
      coordonneesXY: [0.7, 47.4],
      puissance_nominale: 7.4,
    },
  ],
];
// Contour fictif : carre de ±0,05° autour du centre de demo-alpha (47,39 ; 0,69).
const contour = {
  type: 'Polygon',
  coordinates: [
    [
      [0.64, 47.34],
      [0.74, 47.34],
      [0.74, 47.44],
      [0.64, 47.44],
      [0.64, 47.34],
    ],
  ],
};

run('open data et réversibilité (Edge Functions)', () => {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/overpass') res.end(JSON.stringify({ elements: osmElements }));
    else if (url.pathname === '/datagouv')
      res.end(
        JSON.stringify({
          resources: [
            {
              id: 'res-test',
              format: 'csv',
              type: 'main',
              title: 'Consolidation de la dernière version à date du schéma',
              last_modified: '2026-09-27',
            },
          ],
        }),
      );
    else if (url.pathname === '/tabular/res-test/data/') {
      const page = Number(url.searchParams.get('page') ?? '1');
      expect(url.searchParams.get('code_insee_commune__exact')).toBe('99001');
      res.end(
        JSON.stringify({
          data: irvePages[page - 1] ?? [],
          links: {
            next:
              page < irvePages.length
                ? `${FAKE}/tabular/res-test/data/?code_insee_commune__exact=99001&page=${page + 1}`
                : null,
          },
        }),
      );
    } else if (url.pathname.startsWith('/geo/'))
      res.end(
        JSON.stringify({
          contour,
          centre: { type: 'Point', coordinates: [0.69, 47.39] },
          population: 12345,
        }),
      );
    else res.writeHead(404).end('{}');
  });
  beforeAll(() => new Promise<void>((resolve) => server.listen(PORT, '0.0.0.0', resolve)));
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const repos = createSupabaseRepositories(localPersonaResolver());
  const admin = ctxOf('admin-alpha', 'alpha');

  /** Appel direct (sources externes remplacees par le faux service, accepte uniquement en local). */
  const invoke = async <T>(name: string, body: object, persona: PersonaKey = 'admin-alpha') => {
    const ctx = ctxOf(persona, 'alpha');
    const client = await localPersonaResolver()(ctx);
    const { data, error } = await client.functions.invoke<T>(name, {
      body: { tenantId: ctx.tenantId, ...body },
    });
    const status =
      error && 'context' in error && error.context instanceof Response ? error.context.status : 200;
    return { data, status };
  };
  const osmPlaces = async () =>
    (await repos.places.list(admin, { pageSize: 1000 })).items.filter(
      (p) =>
        p.source === 'osm' &&
        p.externalId !== null &&
        Math.abs(Number(p.externalId.split('/')[1]) - BASE) < 100,
    );

  it('contour officiel : tenant_contains utilise le contour synchronisé (sinon 5 km autour du centre)', async () => {
    const db = await localPersonaResolver()(admin);
    const contains = async (lng: number, lat: number) =>
      (await db.rpc('tenant_contains', { p_tenant_id: admin.tenantId, p_lng: lng, p_lat: lat }))
        .data;
    expect((await invoke('sync-tenant-geometry', { geoUrl: `${FAKE}/geo` })).status).toBe(403);
    const { data, status } = await invoke<{ contour: boolean; population: number }>(
      'sync-tenant-geometry',
      { geoUrl: `${FAKE}/geo` },
      'platform-admin',
    );
    expect(status).toBe(200);
    expect(data).toMatchObject({ contour: true, population: 12345 });
    // (0,735 ; 47,435) : dans le carre, a plus de 5 km du centre.
    expect(await contains(0.735, 47.435)).toBe(true);
    expect(await contains(0.76, 47.39)).toBe(false);
    expect((await repos.tenants.get(admin)).population).toBe(12345);
  });

  it('import OSM « toilettes, fontaines, parcs » : aperçu, import, réimport sans doublon, lieu détaché préservé', async () => {
    const categories = ['toilettes', 'fontaine', 'parc'];
    const preview = await invoke<{
      found: number;
      byCategory: Record<string, { found: number }>;
      previewId: string;
    }>('import-osm', { categories, dryRun: true, overpassUrl: `${FAKE}/overpass`, cooldownMs: 0 });
    expect(preview.data).toMatchObject({
      found: 30,
      byCategory: { toilettes: { found: 10 }, fontaine: { found: 10 }, parc: { found: 10 } },
    });
    expect(await osmPlaces()).toHaveLength(0);

    // L'import confirme reutilise l'apercu (aucune nouvelle requete Overpass, donc pas de delai).
    const first = await repos.openData.importOsm(admin, {
      categories,
      previewId: preview.data?.previewId ?? null,
    });
    expect(first).toMatchObject({ found: 30, created: 30, updated: 0, skipped: 0 });
    expect(first.byCategory.parc).toEqual({ created: 10, updated: 0, skipped: 0 });
    const places = await osmPlaces();
    expect(places).toHaveLength(30);
    expect(places.find((p) => p.externalId === `node/${BASE}`)).toMatchObject({
      name: 'Toilettes publiques',
    });
    expect(places.find((p) => p.externalId === `node/${BASE + 2}`)).toMatchObject({
      attributes: { subtype: 'aire-de-jeux' },
    });

    // Detache un lieu : il n'est plus ecrase.
    const detached = places.find((p) => p.externalId === `node/${BASE + 1}`);
    if (!detached) throw new Error('lieu attendu');
    await repos.places.update(admin, detached.id, {
      ...detached,
      name: 'Fontaine rénovée',
      detached: true,
    });
    const second = await invoke<{ created: number; updated: number; skipped: number }>(
      'import-osm',
      { categories, overpassUrl: `${FAKE}/overpass`, cooldownMs: 0 },
    );
    expect(second.data).toMatchObject({ found: 30, created: 0, updated: 29, skipped: 1 });
    expect(await osmPlaces()).toHaveLength(30);
    expect((await repos.places.get(admin, detached.id)).name).toBe('Fontaine rénovée');

    // Politique Overpass : pas de nouvelle requete pour la commune dans les 30 s.
    await expect(repos.openData.previewOsm(admin, categories)).rejects.toBeInstanceOf(
      ConflictError,
    );

    const audit = await repos.audit.list(admin, { pageSize: 50 });
    expect(audit.items.filter((e) => e.action === 'import_osm').length).toBeGreaterThanOrEqual(2);
  });

  it('un agent sans droit « Carte » en édition ne peut pas lancer l’import OSM (403)', async () => {
    expect(
      (
        await invoke(
          'import-osm',
          { overpassUrl: `${FAKE}/overpass`, cooldownMs: 0 },
          'agent-alpha',
        )
      ).status,
    ).toBe(403);
    await expect(
      repos.openData.importOsm(ctxOf('agent-alpha', 'alpha'), { categories: ['toilettes'] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('import IRVE : ressource la plus récente, une fiche par station avec le nombre de points de charge', async () => {
    const { data, status } = await invoke<{ found: number; created: number }>('import-irve', {
      datasetUrl: `${FAKE}/datagouv`,
      tabularUrl: `${FAKE}/tabular`,
    });
    expect(status).toBe(200);
    expect(data).toMatchObject({ found: 2, resourceId: 'res-test' });
    const items = (await repos.places.list(admin, { pageSize: 1000 })).items;
    expect(items.find((p) => p.externalId === STATION)).toMatchObject({
      source: 'irve',
      openingHours: '24/7',
      description: '2 points de charge · jusqu’à 50 kW · Opérateur test',
      attributes: { chargePoints: 2, powersKw: [22, 50], operator: 'Opérateur test' },
    });
    expect(items.find((p) => p.externalId === `${STATION}B`)).toMatchObject({
      attributes: { chargePoints: 1 },
    });
  });

  it('export : ZIP complet, sans email ni photo de signalement sauf option « données personnelles »', async () => {
    const download = async (includePersonalData: boolean) => {
      const result = await repos.openData.exportTenant(admin, { includePersonalData });
      expect(result.expiresInSeconds).toBe(86_400);
      return {
        result,
        files: unzipSync(new Uint8Array(await (await fetch(result.url)).arrayBuffer())),
      };
    };
    const { result, files } = await download(false);
    expect(result.counts.reports).toBeGreaterThan(0);
    const names = Object.keys(files);
    for (const name of [
      'README.txt',
      'donnees/posts.json',
      'donnees/posts.csv',
      'donnees/places.json',
      'geo/lieux.geojson',
      'geo/quartiers.geojson',
      'geo/zones-de-collecte.geojson',
    ])
      expect(names).toContain(name);
    expect(names.some((n) => n.startsWith('medias/'))).toBe(true);
    expect(names.some((n) => n.startsWith('photos-signalements/'))).toBe(false);
    const text = names
      .map((n) =>
        n.endsWith('.png') || n.endsWith('.jpg') ? '' : strFromU8(files[n] ?? new Uint8Array()),
      )
      .join('\n');
    expect(text).not.toContain('@exemple.test');
    expect(text).not.toContain('contact_email');
    expect(JSON.parse(strFromU8(files['geo/lieux.geojson'] ?? new Uint8Array())).type).toBe(
      'FeatureCollection',
    );

    const personal = await download(true);
    expect(Object.keys(personal.files).some((n) => n.startsWith('photos-signalements/'))).toBe(
      true,
    );
    expect(strFromU8(personal.files['donnees/reports.json'] ?? new Uint8Array())).toContain(
      '@exemple.test',
    );

    // Editeur : export possible, mais jamais des donnees personnelles ; agent : refuse.
    expect(
      (await invoke('export-tenant', { includePersonalData: true }, 'platform-admin')).status,
    ).toBe(403);
    await expect(
      repos.openData.exportTenant(ctxOf('agent-alpha', 'alpha'), { includePersonalData: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    const audit = await repos.audit.list(admin, { pageSize: 50 });
    expect(audit.items.some((e) => e.action === 'tenant_exported')).toBe(true);
  });
});

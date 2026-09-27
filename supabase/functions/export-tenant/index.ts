// Export de reversibilite : toutes les donnees de la commune dans un ZIP (JSON et CSV par table,
// GeoJSON, medias), depose dans le bucket prive `exports` puis supprime apres 7 jours
// (`purge-exports`). Admin de la commune ou editeur, en 2FA. Les donnees personnelles des habitants
// (email de contact, identifiant, photos de signalement) ne sont incluses que sur demande expresse
// d'un administrateur de la commune.
import { strToU8, zipSync } from 'npm:fflate@0.8';

import { corsHeaders, json } from '../_shared/cors.ts';
import { callerAal, callerClient, serviceClient, UUID } from '../_shared/caller.ts';

type Table = { name: string; description: string; personal?: string[] };

const TABLES: Table[] = [
  { name: 'tenants', description: 'fiche de la commune' },
  { name: 'tenant_branding', description: 'identite visuelle' },
  { name: 'tenant_modules', description: 'modules actives' },
  { name: 'tenant_app_config', description: "configuration de l'application" },
  { name: 'tenant_store_info', description: 'fiches des stores' },
  { name: 'topics', description: "centres d'interet" },
  { name: 'districts', description: 'quartiers' },
  { name: 'services', description: 'services municipaux' },
  { name: 'report_categories', description: 'categories de signalement' },
  { name: 'place_categories', description: 'categories de lieux' },
  { name: 'places', description: 'lieux de la carte' },
  { name: 'media', description: 'mediatheque (fichiers dans medias/)' },
  { name: 'posts', description: 'actualites et alertes' },
  { name: 'events', description: 'agenda' },
  { name: 'content_reviews', description: 'historique de relecture' },
  { name: 'procedures', description: 'demarches' },
  { name: 'sorting_guide_items', description: 'consignes de tri' },
  { name: 'waste_zones', description: 'zones de collecte' },
  { name: 'waste_schedules', description: 'calendriers de collecte' },
  {
    name: 'reports',
    description: 'signalements',
    personal: ['reporter_id', 'contact_email', 'client_request_id'],
  },
  {
    name: 'report_media',
    description: 'photos de signalement (fichiers dans photos-signalements/ si incluses)',
  },
  { name: 'report_events', description: 'historique des signalements' },
  { name: 'notifications', description: 'notifications envoyees' },
  { name: 'usage_daily', description: "statistiques d'usage quotidiennes" },
];

const csvCell = (v: unknown) => {
  const s =
    v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

function toCsv(rows: Record<string, unknown>[]): string {
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return `\uFEFF${[headers.join(';'), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(';'))].join('\r\n')}\r\n`;
}

function readme(generatedAt: string, personal: boolean, counts: Record<string, number>): string {
  const lines = [
    'EXPORT DE REVERSIBILITE',
    '=======================',
    '',
    `Genere le ${generatedAt} (UTC). Archive supprimee du serveur 7 jours apres sa creation.`,
    '',
    "donnees/<table>.json  une table par fichier, tableau JSON d'objets (UTF-8).",
    'donnees/<table>.csv   meme contenu en CSV : UTF-8 avec BOM, separateur point-virgule, fins de ligne CRLF ;',
    '                      les valeurs structurees (JSON) sont serialisees dans la cellule.',
    'geo/quartiers.geojson, geo/zones-de-collecte.geojson, geo/lieux.geojson : GeoJSON (WGS84, EPSG:4326).',
    'medias/               fichiers de la mediatheque (chemin = colonne `path` de media, sans le dossier de la commune).',
    '',
    'Dates : ISO 8601 en UTC. Identifiants : UUID. Positions dans les tables : format PostGIS (voir aussi geo/).',
    '',
    'Tables :',
    ...TABLES.map(
      (t) =>
        `  ${t.name.padEnd(22)} ${String(counts[t.name] ?? 0).padStart(6)} ligne(s)  ${t.description}`,
    ),
    '',
    personal
      ? 'DONNEES PERSONNELLES INCLUSES : email de contact et identifiant pseudonyme des habitants, photos de\nsignalement (photos-signalements/). A conserver de maniere securisee et a supprimer apres usage (RGPD).'
      : 'Donnees personnelles exclues : signalements sans identifiant ni email des habitants, sans photos.',
    '',
  ];
  return lines.join('\r\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = (await req.json().catch(() => ({}))) as {
    tenantId?: unknown;
    includePersonalData?: unknown;
  };
  const tenantId =
    typeof body.tenantId === 'string' && UUID.test(body.tenantId) ? body.tenantId : null;
  if (!tenantId) return json({ code: 'APP_INVALID_INPUT', error: 'Commune invalide' }, 400);
  const personal = body.includePersonalData === true;

  const caller = callerClient(req);
  const { data: user } = await caller.auth.getUser();
  if (!user.user || callerAal(req) !== 'aal2')
    return json({ code: 'APP_FORBIDDEN', error: 'Double authentification requise' }, 403);
  const { data: allowed } = await caller.rpc('can_manage_members', { p_tenant_id: tenantId });
  if (allowed !== true)
    return json(
      { code: 'APP_FORBIDDEN', error: 'Export réservé aux administrateurs de la commune' },
      403,
    );
  if (personal) {
    const { data: tenantAdmin } = await caller.rpc('is_tenant_admin', { p_tenant_id: tenantId });
    if (tenantAdmin !== true)
      return json(
        {
          code: 'APP_FORBIDDEN',
          error: 'Seul un administrateur de la commune peut exporter les données personnelles',
        },
        403,
      );
  }

  const admin = serviceClient();
  const files: Record<string, Uint8Array> = {};
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const query = admin.from(table.name).select('*');
    const { data, error } = await (table.name === 'tenants'
      ? query.eq('id', tenantId)
      : query.eq('tenant_id', tenantId));
    if (error) return json({ code: 'APP_EXPORT_FAILED', error: 'Export impossible' }, 500);
    const rows = (data ?? []).map((row: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(row).filter(([k]) => personal || !table.personal?.includes(k)),
      ),
    );
    counts[table.name] = rows.length;
    files[`donnees/${table.name}.json`] = strToU8(JSON.stringify(rows, null, 2));
    files[`donnees/${table.name}.csv`] = strToU8(toCsv(rows));
  }

  const { data: geo, error: geoError } = await admin.rpc('tenant_geojson', {
    p_tenant_id: tenantId,
  });
  if (geoError || !geo) return json({ code: 'APP_EXPORT_FAILED', error: 'Export impossible' }, 500);
  files['geo/quartiers.geojson'] = strToU8(JSON.stringify(geo.districts));
  files['geo/zones-de-collecte.geojson'] = strToU8(JSON.stringify(geo.wasteZones));
  files['geo/lieux.geojson'] = strToU8(JSON.stringify(geo.places));

  const copy = async (bucket: string, paths: string[], folder: string) => {
    for (const path of paths) {
      const { data: blob } = await admin.storage.from(bucket).download(path);
      if (blob)
        files[`${folder}/${path.split('/').slice(1).join('/')}`] = new Uint8Array(
          await blob.arrayBuffer(),
        );
    }
  };
  const { data: media } = await admin.from('media').select('path').eq('tenant_id', tenantId);
  await copy(
    'public-media',
    (media ?? []).map((m) => m.path),
    'medias',
  );
  if (personal) {
    const { data: photos } = await admin
      .from('report_media')
      .select('path')
      .eq('tenant_id', tenantId);
    await copy(
      'report-photos',
      (photos ?? []).map((p) => p.path),
      'photos-signalements',
    );
  }

  const generatedAt = new Date().toISOString();
  files['README.txt'] = strToU8(readme(generatedAt, personal, counts));
  const zip = zipSync(files, { level: 6 });
  const path = `${tenantId}/${generatedAt.slice(0, 10)}-${crypto.randomUUID()}.zip`;
  const upload = await admin.storage
    .from('exports')
    .upload(path, zip, { contentType: 'application/zip' });
  if (upload.error) return json({ code: 'APP_EXPORT_FAILED', error: 'Export impossible' }, 500);
  await admin.from('audit_log').insert({
    tenant_id: tenantId,
    actor_id: user.user.id,
    action: 'tenant_exported',
    entity: 'export',
    entity_id: tenantId,
    diff: {
      counts: { before: null, after: counts },
      includePersonalData: { before: null, after: personal },
    },
  });
  // Le lien signe (24 h) est cree par l'appelant (policy `exports_read`), avec l'adresse publique du projet.
  return json({ path, counts, includePersonalData: personal });
});

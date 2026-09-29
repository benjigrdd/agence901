// Import des equipements OpenStreetMap de la commune (Overpass). Droit `map` en edition, verifie avec
// le jeton de l'appelant ; seule l'ecriture finale utilise la cle service, avec la commune verifiee.
// `dryRun` : apercu du nombre de lieux par categorie, sans ecriture ; l'import confirme ensuite avec
// `previewId` reutilise ce resultat (pas de seconde requete Overpass).
import { corsHeaders, json } from '../_shared/cors.ts';
import {
  callerClient,
  OVERPASS_COOLDOWN_MS,
  serviceClient,
  sourceUrl,
  rateLimited,
  UUID,
} from '../_shared/caller.ts';
import {
  OSM_CATEGORY_KEYS,
  type OsmPlace,
  osmElementToPlace,
  overpassQuery,
} from '../_shared/osm-mapping.ts';
import { isRecord, OsmElementSchema, OsmPlaceSchema, readJsonObject, validItems } from '../_shared/validate.ts';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Politique d'usage Overpass : identifier le produit et un contact.
const USER_AGENT = `plateforme-mairies/1.0 (+${Deno.env.get('OPEN_DATA_CONTACT') ?? 'contact@plateforme-mairies.fr'})`;

const isLocal = () => /kong|127\.0\.0\.1/.test(Deno.env.get('SUPABASE_URL') ?? '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await readJsonObject(req);
  const tenantId =
    typeof body.tenantId === 'string' && UUID.test(body.tenantId) ? body.tenantId : null;
  if (!tenantId) return json({ code: 'APP_INVALID_INPUT', error: 'Commune invalide' }, 400);
  const requested = Array.isArray(body.categories)
    ? body.categories.filter(
        (c): c is string => typeof c === 'string' && OSM_CATEGORY_KEYS.includes(c),
      )
    : [...OSM_CATEGORY_KEYS];
  if (requested.length === 0)
    return json({ code: 'APP_INVALID_INPUT', error: 'Choisissez au moins une catégorie' }, 400);
  const dryRun = body.dryRun === true;

  const caller = callerClient(req);
  const { data: user } = await caller.auth.getUser();
  const { data: allowed } = await caller.rpc('has_module_permission', {
    p_tenant_id: tenantId,
    p_module: 'map',
    p_level: 'edit',
  });
  if (!user.user || allowed !== true)
    return json({ code: 'APP_FORBIDDEN', error: 'Droit « Carte » en édition requis' }, 403);
  const limited = await rateLimited(caller, 'import-osm', 6);
  if (limited) return limited;

  const admin = serviceClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('insee_code, name')
    .eq('id', tenantId)
    .single();
  if (!tenant) return json({ code: 'APP_NOT_FOUND', error: 'Commune introuvable' }, 404);

  // Apercu recent (15 min) de la meme commune : ses lieux sont importes tels quels.
  let rows: OsmPlace[] | null = null;
  if (!dryRun && typeof body.previewId === 'string' && UUID.test(body.previewId)) {
    const { data: preview } = await admin
      .from('job_runs')
      .select('id, details')
      .eq('id', body.previewId)
      .eq('job', 'import-osm')
      .eq('details->>tenantId', tenantId)
      .gte('started_at', new Date(Date.now() - 15 * 60_000).toISOString())
      .maybeSingle();
    const stored = preview?.details?.rows;
    if (Array.isArray(stored)) {
      rows = validItems(OsmPlaceSchema, stored).filter((r) => requested.includes(r.categoryKey));
      await admin
        .from('job_runs')
        .update({ details: { ...preview.details, rows: null } })
        .eq('id', preview.id);
    }
  }

  // Une requete Overpass a la fois par commune, et un delai entre deux requetes.
  if (rows === null) {
    const cooldown =
      isLocal() && typeof body.cooldownMs === 'number' ? body.cooldownMs : OVERPASS_COOLDOWN_MS;
    const { data: recent } = await admin
      .from('job_runs')
      .select('id, started_at, finished_at')
      .eq('job', 'import-osm')
      .eq('details->>tenantId', tenantId)
      .gte('started_at', new Date(Date.now() - Math.max(cooldown, 120_000)).toISOString());
    const busy = (recent ?? []).some(
      (r) => r.finished_at === null || Date.parse(r.finished_at) > Date.now() - cooldown,
    );
    if (busy)
      return json(
        {
          code: 'APP_BUSY',
          error:
            'Une requête OpenStreetMap vient d’être faite pour cette commune : réessayez dans une minute.',
        },
        429,
      );
  }
  const run = await admin
    .from('job_runs')
    .insert({ job: 'import-osm', details: { tenantId, dryRun, categories: requested } })
    .select('id')
    .single();
  const finish = (status: string, details: object) =>
    run.data
      ? admin
          .from('job_runs')
          .update({
            finished_at: new Date().toISOString(),
            status,
            details: { tenantId, dryRun, categories: requested, ...details },
          })
          .eq('id', run.data.id)
      : Promise.resolve();

  if (rows === null) {
    try {
      const response = await fetch(sourceUrl(body.overpassUrl, OVERPASS_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: `data=${encodeURIComponent(overpassQuery(tenant.insee_code, requested))}`,
        signal: AbortSignal.timeout(70_000),
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const payload: unknown = await response.json();
      const elements = validItems(OsmElementSchema, isRecord(payload) ? payload.elements : undefined);
      rows = elements.flatMap((e) => osmElementToPlace(e, tenant.name, requested) ?? []);
    } catch (error) {
      await finish('failed', { error: error instanceof Error ? error.message : 'Overpass' });
      return json(
        {
          code: 'APP_SOURCE_UNAVAILABLE',
          error: 'OpenStreetMap ne répond pas, réessayez plus tard',
        },
        502,
      );
    }
  }

  if (dryRun) {
    const byCategory: Record<string, { found: number }> = {};
    for (const row of rows)
      byCategory[row.categoryKey] = { found: (byCategory[row.categoryKey]?.found ?? 0) + 1 };
    await finish('success', { found: rows.length, rows });
    return json({ found: rows.length, byCategory, previewId: run.data?.id ?? null });
  }

  const { data: result, error } = await admin.rpc('upsert_imported_places', {
    p_tenant_id: tenantId,
    p_source: 'osm',
    p_rows: rows,
    p_actor_id: user.user.id,
  });
  await finish(error ? 'failed' : 'success', { found: rows.length, ...(result ?? {}) });
  if (error) return json({ code: 'APP_IMPORT_FAILED', error: 'Import impossible' }, 500);
  return json({ found: rows.length, ...result });
});

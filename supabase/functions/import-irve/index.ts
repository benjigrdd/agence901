// Import des bornes de recharge (Base nationale des IRVE, data.gouv.fr). Droit `map` en edition.
// 1. l'API data.gouv.fr donne la ressource CSV consolidee la plus recente (pas d'URL datee en dur) ;
// 2. l'API tabulaire de data.gouv.fr filtre cette ressource sur le code INSEE de la commune, page par
//    page : le fichier national (~150 Mo) n'est jamais telecharge par la fonction (voir docs/imports.md).
import { corsHeaders, json } from '../_shared/cors.ts';
import { callerClient, rateLimited, serviceClient, sourceUrl, UUID } from '../_shared/caller.ts';
import {
  type DatagouvResource,
  IRVE_DATASET_ID,
  type IrveRow,
  irveToPlaces,
  latestIrveResource,
} from '../_shared/open-data.ts';

const DATASET_URL = `https://www.data.gouv.fr/api/1/datasets/${IRVE_DATASET_ID}/`;
const TABULAR_URL = 'https://tabular-api.data.gouv.fr/api/resources';
const MAX_PAGES = 40; // 50 points de charge par page : 2 000 points au plus par commune.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = (await req.json().catch(() => ({}))) as {
    tenantId?: unknown;
    datasetUrl?: unknown;
    tabularUrl?: unknown;
  };
  const tenantId =
    typeof body.tenantId === 'string' && UUID.test(body.tenantId) ? body.tenantId : null;
  if (!tenantId) return json({ code: 'APP_INVALID_INPUT', error: 'Commune invalide' }, 400);

  const caller = callerClient(req);
  const { data: user } = await caller.auth.getUser();
  const { data: allowed } = await caller.rpc('has_module_permission', {
    p_tenant_id: tenantId,
    p_module: 'map',
    p_level: 'edit',
  });
  if (!user.user || allowed !== true)
    return json({ code: 'APP_FORBIDDEN', error: 'Droit « Carte » en édition requis' }, 403);
  const limited = await rateLimited(caller, 'import-irve', 3);
  if (limited) return limited;

  const admin = serviceClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('insee_code')
    .eq('id', tenantId)
    .single();
  if (!tenant) return json({ code: 'APP_NOT_FOUND', error: 'Commune introuvable' }, 404);

  const unavailable = () =>
    json(
      {
        code: 'APP_SOURCE_UNAVAILABLE',
        error: 'Le jeu de données IRVE ne répond pas, réessayez plus tard',
      },
      502,
    );
  const rows: IrveRow[] = [];
  let resourceId: string;
  try {
    const dataset = await fetch(sourceUrl(body.datasetUrl, DATASET_URL), {
      signal: AbortSignal.timeout(20_000),
    });
    if (!dataset.ok) return unavailable();
    const resource = latestIrveResource(
      ((await dataset.json()) as { resources?: DatagouvResource[] }).resources ?? [],
    );
    if (!resource) return unavailable();
    resourceId = resource.id;
    const base = sourceUrl(body.tabularUrl, TABULAR_URL);
    let next: string | null =
      `${base}/${encodeURIComponent(resourceId)}/data/?code_insee_commune__exact=${encodeURIComponent(tenant.insee_code)}&page_size=50`;
    for (let page = 0; next && page < MAX_PAGES; page++) {
      const response = await fetch(next, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) return unavailable();
      const payload = (await response.json()) as {
        data?: IrveRow[];
        links?: { next?: string | null };
      };
      rows.push(...(payload.data ?? []));
      next = payload.links?.next ?? null;
    }
  } catch {
    return unavailable();
  }

  const places = irveToPlaces(rows);
  const { data: result, error } = await admin.rpc('upsert_imported_places', {
    p_tenant_id: tenantId,
    p_source: 'irve',
    p_rows: places,
    p_actor_id: user.user.id,
  });
  if (error) return json({ code: 'APP_IMPORT_FAILED', error: 'Import impossible' }, 500);
  return json({ found: places.length, chargePoints: rows.length, resourceId, ...result });
});

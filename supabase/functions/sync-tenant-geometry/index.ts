// Contour officiel, centre et population de la commune (geo.api.gouv.fr, code INSEE). Reserve a
// l'editeur : appele a la creation d'une commune et depuis sa fiche super-admin.
import { corsHeaders, json } from '../_shared/cors.ts';
import { callerClient, rateLimited, serviceClient, sourceUrl, UUID } from '../_shared/caller.ts';

const GEO_API_URL = 'https://geo.api.gouv.fr/communes';

type Geometry = { type?: unknown; coordinates?: unknown };
const polygonal = (g: Geometry | undefined) =>
  g && (g.type === 'Polygon' || g.type === 'MultiPolygon') && Array.isArray(g.coordinates)
    ? g
    : null;
const point = (g: Geometry | undefined) =>
  g && g.type === 'Point' && Array.isArray(g.coordinates) ? g : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = (await req.json().catch(() => ({}))) as { tenantId?: unknown; geoUrl?: unknown };
  const tenantId =
    typeof body.tenantId === 'string' && UUID.test(body.tenantId) ? body.tenantId : null;
  if (!tenantId) return json({ code: 'APP_INVALID_INPUT', error: 'Commune invalide' }, 400);

  const caller = callerClient(req);
  const { data: user } = await caller.auth.getUser();
  const { data: allowed } = await caller.rpc('is_platform_admin');
  if (!user.user || allowed !== true)
    return json({ code: 'APP_FORBIDDEN', error: "Action réservée à l'éditeur" }, 403);
  const limited = await rateLimited(caller, 'sync-tenant-geometry', 5);
  if (limited) return limited;

  const admin = serviceClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('insee_code')
    .eq('id', tenantId)
    .single();
  if (!tenant) return json({ code: 'APP_NOT_FOUND', error: 'Commune introuvable' }, 404);

  const url = `${sourceUrl(body.geoUrl, GEO_API_URL)}/${encodeURIComponent(tenant.insee_code)}?fields=contour,centre,population&format=json&geometry=contour`;
  let commune: { contour?: Geometry; centre?: Geometry; population?: unknown };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (response.status === 404)
      return json(
        {
          code: 'APP_NOT_FOUND',
          error: `Code INSEE ${tenant.insee_code} inconnu de geo.api.gouv.fr`,
        },
        404,
      );
    if (!response.ok) throw new Error(`geo.api.gouv.fr ${response.status}`);
    commune = await response.json();
  } catch {
    return json(
      {
        code: 'APP_SOURCE_UNAVAILABLE',
        error: 'geo.api.gouv.fr ne répond pas, réessayez plus tard',
      },
      502,
    );
  }
  const contour = polygonal(commune.contour);
  if (!contour)
    return json(
      { code: 'APP_SOURCE_UNAVAILABLE', error: 'Contour absent de la réponse de geo.api.gouv.fr' },
      502,
    );
  const population =
    typeof commune.population === 'number' && Number.isInteger(commune.population)
      ? commune.population
      : null;

  const { error } = await admin.rpc('set_tenant_geometry', {
    p_tenant_id: tenantId,
    p_contour: contour,
    p_center: point(commune.centre),
    p_population: population,
    p_actor_id: user.user.id,
  });
  if (error)
    return json({ code: 'APP_IMPORT_FAILED', error: 'Mise à jour du contour impossible' }, 500);
  return json({ contour: true, center: point(commune.centre) !== null, population });
});

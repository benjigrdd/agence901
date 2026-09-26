import { isPlatformAdmin } from '@app/shared';
import { z } from 'zod';

import type { CommuneSuggestion } from '@/lib/commune-suggestion';
import { getSession } from '@/server/session';

const GeoCommunesSchema = z.array(
  z.object({
    code: z.string(),
    nom: z.string(),
    population: z.number().optional(),
    centre: z.object({ coordinates: z.tuple([z.number(), z.number()]) }).optional(),
    codesPostaux: z.array(z.string()).optional(),
  }),
);


/** Recherche de communes (geo.api.gouv.fr), cote serveur, cache 24 h. Reponse vide si l'API ne repond pas. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.aal !== 'aal2' || !isPlatformAdmin(session)) return new Response('Introuvable', { status: 404 });
  const q = (new URL(request.url).searchParams.get('nom') ?? '').trim().slice(0, 80);
  if (q.length < 2) return Response.json([]);
  const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=code,nom,population,centre,codesPostaux&boost=population&limit=10`;
  try {
    const response = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return Response.json([], { status: 200, headers: { 'X-Geo-Error': '1' } });
    const parsed = GeoCommunesSchema.safeParse(await response.json());
    if (!parsed.success) return Response.json([], { headers: { 'X-Geo-Error': '1' } });
    const items: CommuneSuggestion[] = parsed.data.map((c) => ({
      inseeCode: c.code,
      name: c.nom,
      population: c.population ?? 0,
      center: c.centre ? { lng: c.centre.coordinates[0], lat: c.centre.coordinates[1] } : null,
      postalCodes: c.codesPostaux ?? [],
    }));
    return Response.json(items);
  } catch {
    return Response.json([], { headers: { 'X-Geo-Error': '1' } });
  }
}

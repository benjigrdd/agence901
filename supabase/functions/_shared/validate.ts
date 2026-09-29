// Validation des donnees non typees : corps de requete, lignes lues sans types generes, API externes.
// Aucune donnee n'est « castee » : elle est verifiee (zod) ou reduite a `unknown`.
import { z } from 'npm:zod@4.6.5';

import type { OsmElement, OsmPlace } from './osm-mapping.ts';

export { z };

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Corps JSON de la requete : un objet (champs `unknown` a verifier), `{}` sinon. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const value: unknown = await req.json().catch(() => ({}));
  return isRecord(value) ? value : {};
}

/** Elements valides d'un tableau ; les autres sont ignores (donnees externes partiellement conformes). */
export function validItems<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Lignes de nos propres RPC et vues : une ligne non conforme est une erreur, pas une donnee a ignorer. */
export function parseRows<T>(schema: z.ZodType<T>, value: unknown): T[] {
  return z.array(schema).parse(value ?? []);
}

export const RecipientSchema = z.object({ pushTokenId: z.string(), token: z.string() });

export const TicketSchema = z.object({
  status: z.enum(['ok', 'error']),
  id: z.string().optional(),
  message: z.string().optional(),
  details: z.object({ error: z.string().optional() }).optional(),
});
export type Ticket = z.infer<typeof TicketSchema>;

const OsmTagsSchema = z.record(z.string(), z.string());

export const OsmElementSchema: z.ZodType<OsmElement> = z.object({
  type: z.enum(['node', 'way', 'relation']),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: OsmTagsSchema.optional(),
});

export const OsmPlaceSchema: z.ZodType<OsmPlace> = z.object({
  externalId: z.string(),
  categoryKey: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  openingHours: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  wheelchair: z.enum(['yes', 'limited', 'no', 'unknown']),
  attributes: z.object({ subtype: z.string().optional() }),
});

export const DatagouvResourceSchema = z.object({
  id: z.string(),
  format: z.string().optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  last_modified: z.string().optional(),
});

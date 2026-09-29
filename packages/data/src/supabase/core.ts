import type { GeoMultiPolygon, GeoPoint, Module, PermissionLevel, Session } from '@app/shared';
import { can, GeoMultiPolygonSchema, GeoPointSchema, isPlatformAdmin, isTenantAdmin } from '@app/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';

import type { DataContext, SessionContext } from '../context';
import { ConflictError, DataError, ForbiddenError, NotFoundError, ValidationError } from '../errors';
import type { Database } from './database.types';

export type Db = SupabaseClient<Database>;

/**
 * Fournit le client Supabase a utiliser pour un appel. Dans le dashboard : le client de la requete
 * (session de l'utilisateur, RLS appliquee). Dans les tests de contrat : un client par persona.
 */
export type ClientResolver = (ctx: SessionContext) => Db | Promise<Db>;

// ---------------------------------------------------------------------------
// Gardes : meme ordre que l'adaptateur mock (commune → acces → 2FA → droit → zod).
// La RLS reste le filet de securite cote base.
// ---------------------------------------------------------------------------

export function requireStaff(ctx: DataContext): Session {
  const session = ctx.session;
  const member = session !== null && (session.isPlatformAdmin || session.memberships.some((m) => m.tenantId === ctx.tenantId));
  if (!session || !member) throw new NotFoundError('Commune introuvable');
  if (session.aal !== 'aal2') throw new ForbiddenError('Double authentification requise', 'aal2_required');
  return session;
}

export function requirePermission(ctx: DataContext, module: Module, level: PermissionLevel, message?: string): Session {
  const session = requireStaff(ctx);
  if (!can(session, ctx.tenantId, module, level)) throw new ForbiddenError(message);
  return session;
}

export function requireTenantAdmin(ctx: DataContext): Session {
  const session = requireStaff(ctx);
  if (!isTenantAdmin(session, ctx.tenantId)) throw new ForbiddenError('Action réservée aux administrateurs de la commune');
  return session;
}

export function requirePlatformAdmin(ctx: SessionContext): Session {
  const session = ctx.session;
  if (!session || !isPlatformAdmin(session)) throw new ForbiddenError("Action réservée à l'éditeur");
  return session;
}

// ---------------------------------------------------------------------------
// Erreurs PostgREST / Postgres → erreurs du domaine (messages en francais)
// ---------------------------------------------------------------------------

type PgError = { code?: string; message?: string; details?: string | null; hint?: string | null };

/** Codes `APP_…` leves par les triggers et RPC (voir docs/rls.md). */
const APP_ERRORS: Record<string, (detail: string) => DataError> = {
  APP_PUBLISH_FORBIDDEN: (d) => new ForbiddenError(d),
  APP_EDIT_FORBIDDEN: (d) => new ForbiddenError(d),
  APP_FORBIDDEN: (d) => new ForbiddenError(d),
  APP_NOT_FOUND: (d) => new NotFoundError(d),
  APP_LAST_ADMIN: (d) => new ConflictError(d),
  APP_DUPLICATE_READ_ONLY: (d) => new ConflictError(d),
  APP_ALREADY_MEMBER: (d) => new ConflictError(d),
  APP_SLUG_TAKEN: (d) => new ConflictError(d),
  APP_COMMENT_REQUIRED: (d) => new ValidationError(d, [{ path: 'comment', message: d }]),
  APP_MESSAGE_REQUIRED: (d) => new ValidationError(d, [{ path: 'message', message: d }]),
  APP_PUBLISH_AT_REQUIRED: (d) => new ValidationError(d, [{ path: 'publishAt', message: d }]),
  APP_DUPLICATE_REQUIRED: (d) => new ValidationError(d, [{ path: 'duplicateOfId', message: d }]),
  APP_EMPTY_NOTE: (d) => new ValidationError(d, [{ path: 'message', message: d }]),
  APP_UNKNOWN_SERVICE: (d) => new ValidationError(d, [{ path: 'serviceId', message: d }]),
};

export function toDataError(error: PgError): DataError {
  const message = error.message ?? '';
  const detail = error.details || 'Opération impossible';
  const app = APP_ERRORS[message];
  if (app) return app(detail);
  if (message.startsWith('APP_')) return new ValidationError(detail);
  switch (error.code) {
    case '42501':
      return new ForbiddenError();
    case 'PGRST116':
      return new NotFoundError();
    case '23505':
      return new ConflictError('Cet élément existe déjà');
    case '23503':
      return new ValidationError('Référence invalide (élément inconnu ou d’une autre commune)');
    case '23514':
    case '22P02':
      return new ValidationError('Valeur non autorisée');
    default:
      return new DataError('Erreur de la base de données', 'unknown');
  }
}

/** Resultat PostgREST : donnees ou erreur du domaine. */
export function unwrap<T>(result: { data: T; error: PgError | null }): NonNullable<T> {
  if (result.error) throw toDataError(result.error);
  if (result.data === null || result.data === undefined) throw new NotFoundError();
  return result.data;
}

/** Taille des lots de lecture : ne doit pas depasser `max_rows` de PostgREST (1 000, supabase/config.toml). */
export const FETCH_CHUNK = 1000;

/**
 * Lit toutes les lignes d'une requete par lots successifs. PostgREST tronque sans erreur au-dela de
 * `max_rows` : toute lecture non bornee d'une table qui grandit passe par ici. La requete doit etre
 * triee sur une colonne unique (souvent `id` en dernier critere) pour que les lots ne se chevauchent pas.
 */
export async function selectAll<T>(
  query: () => { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: PgError | null }> },
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += FETCH_CHUNK) {
    const { data, error } = await query().range(from, from + FETCH_CHUNK - 1);
    if (error) throw toDataError(error);
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < FETCH_CHUNK) return rows;
  }
}

export function check(result: { error: PgError | null }): void {
  if (result.error) throw toDataError(result.error);
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

/** Horodatage Postgres (`+00:00`, microsecondes) → ISO UTC en millisecondes, comme le mock. */
export function iso(value: string | null): string {
  const date = new Date(value ?? '');
  if (Number.isNaN(date.getTime())) throw new DataError('Date absente ou invalide', 'unknown');
  return date.toISOString();
}
export const isoOrNull = (value: string | null): string | null => (value === null ? null : iso(value));

export function pointFromGeoJson(value: unknown): GeoPoint {
  const coords = typeof value === 'object' && value !== null && 'coordinates' in value ? value.coordinates : null;
  const [lng, lat] = Array.isArray(coords) ? coords : [];
  return GeoPointSchema.parse({ lat, lng });
}

export function multiPolygonFromGeoJson(value: unknown): GeoMultiPolygon {
  return GeoMultiPolygonSchema.parse(value);
}

export const pointToEwkt = (p: GeoPoint): string => `SRID=4326;POINT(${p.lng} ${p.lat})`;

export const multiPolygonToEwkt = (g: GeoMultiPolygon): string =>
  `SRID=4326;MULTIPOLYGON(${g.coordinates.map((poly) => `(${poly.map((ring) => `(${ring.map(([x, y]) => `${x} ${y}`).join(',')})`).join(',')})`).join(',')})`;

/**
 * Chaque ligne lue est validee par le schema zod de @app/shared : une erreur de conversion echoue
 * bruyamment (en developpement comme en test) plutot que de propager une donnee invalide.
 */
export function validated<S extends z.ZodType>(schema: S, value: unknown, entity: string): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new DataError(`Donnée ${entity} invalide (${fields})`, 'unknown');
  }
  return result.data;
}

/** Nom d'entite de l'audit : table SQL → nom au singulier utilise par le mock et l'interface. */
export const AUDIT_ENTITY_NAMES: Record<string, string> = {
  posts: 'post',
  events: 'event',
  places: 'place',
  place_categories: 'place_category',
  procedures: 'procedure',
  report_events: 'report_event',
  reports: 'report',
  services: 'service',
  report_categories: 'report_category',
  districts: 'district',
  waste_zones: 'waste_zone',
  waste_schedules: 'waste_schedule',
  sorting_guide_items: 'sorting_guide_item',
  notifications: 'notification',
  memberships: 'membership',
  membership_permissions: 'membership_permission',
  media: 'media',
  topics: 'topic',
  tenants: 'tenant',
  tenant_branding: 'branding',
  tenant_modules: 'module',
  tenant_app_config: 'app_config',
  tenant_store_info: 'store_info',
};

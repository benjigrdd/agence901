import type { AuditFilters } from '@app/data';
import { AUDIT_ACTIONS, parisInputToIso } from '@app/shared';

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : '');

/** Parametres d'URL → filtres du journal d'audit (partage entre la page et l'export). */
export function parseAuditFilters(query: Query) {
  const action = AUDIT_ACTIONS.find((a) => a === one(query.action));
  const values = {
    acteur: one(query.acteur),
    entite: one(query.entite),
    action: action ?? '',
    du: /^\d{4}-\d{2}-\d{2}$/.test(one(query.du)) ? one(query.du) : '',
    au: /^\d{4}-\d{2}-\d{2}$/.test(one(query.au)) ? one(query.au) : '',
  };
  const from = values.du ? parisInputToIso(`${values.du}T00:00`) : null;
  const to = values.au ? parisInputToIso(`${values.au}T23:59`) : null;
  const filters: AuditFilters = {
    ...(values.acteur ? { actorId: values.acteur } : {}),
    ...(values.entite ? { entity: values.entite } : {}),
    ...(action ? { action: [action] } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const qs = new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
  return { values, filters, qs: qs ? `?${qs}` : '' };
}

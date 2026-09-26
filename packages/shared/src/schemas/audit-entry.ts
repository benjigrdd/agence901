import { z } from 'zod';

import { AUDIT_ACTIONS } from '../enums';
import { enumSchema, idSchema, isoDateTimeSchema } from './common';

/** Pour chaque champ modifie : valeur avant et apres. */
export const AuditDiffSchema = z.record(z.string(), z.object({ before: z.unknown(), after: z.unknown() }));
export type AuditDiff = z.infer<typeof AuditDiffSchema>;

export const AUDIT_RETENTION_MONTHS = 12;

export const AuditEntrySchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  actorId: idSchema,
  action: enumSchema(AUDIT_ACTIONS),
  /** Type d'entite (`post`, `report`, `membership`...). */
  entity: z.string().min(1),
  entityId: idSchema,
  diff: AuditDiffSchema,
  at: isoDateTimeSchema,
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/** Diff superficiel entre deux etats (champs de premier niveau). */
export function computeAuditDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditDiff {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diff: AuditDiff = {};
  for (const key of keys) {
    if (key === 'updatedAt' || key === 'createdAt') continue;
    const a = before?.[key];
    const b = after?.[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) diff[key] = { before: a ?? null, after: b ?? null };
  }
  return diff;
}

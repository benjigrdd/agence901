import { z } from 'zod';

import { TENANT_PLANS, TENANT_STATUSES, TENANT_TYPES } from '../enums';
import { enumSchema, idSchema, isoDateSchema, isoDateTimeSchema, optionalText, requiredText, slugSchema } from './common';
import { GeoPointSchema } from './geo';

export const TenantSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: requiredText(120),
  type: enumSchema(TENANT_TYPES),
  parentId: idSchema.nullable(),
  inseeCode: z.string().regex(/^(\d{5}|2[AB]\d{3})$/, { error: 'Code INSEE invalide (5 caractères)' }),
  population: z.number().int().min(0, { error: 'Population invalide' }),
  status: enumSchema(TENANT_STATUSES),
  plan: enumSchema(TENANT_PLANS),
  timezone: z.string().min(1),
  center: GeoPointSchema,
  renewalDate: isoDateSchema.nullable(),
  /** Notes de l'editeur, jamais visibles par la commune. */
  internalNotes: optionalText(2000),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Tenant = z.infer<typeof TenantSchema>;

export const TenantInputSchema = TenantSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type TenantInput = z.infer<typeof TenantInputSchema>;

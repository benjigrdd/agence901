import { z } from 'zod';

import { TENANT_MODULES, TENANT_PLANS, TENANT_TYPES } from '../enums';
import { emailSchema, enumSchema, requiredText, slugSchema } from './common';
import { GeoPointSchema } from './geo';
import { BrandingColorsSchema } from './tenant-branding';

/** Saisie de l'assistant de creation de commune (super-admin). */
export const TenantCreationInputSchema = z.object({
  identity: z.object({
    name: requiredText(120),
    type: enumSchema(TENANT_TYPES),
    slug: slugSchema.max(40, { error: '40 caractères maximum' }),
    inseeCode: z.string().regex(/^(\d{5}|2[AB]\d{3})$/, { error: 'Code INSEE invalide (5 caractères)' }),
    population: z.number({ error: 'Population invalide' }).int().min(0, { error: 'Population invalide' }),
    center: GeoPointSchema,
    plan: enumSchema(TENANT_PLANS),
  }),
  branding: z.object({
    appName: requiredText(30),
    shortName: requiredText(12),
    colors: BrandingColorsSchema,
    logoUrl: z.string().min(1).nullable(),
  }),
  modules: z.array(enumSchema(TENANT_MODULES)),
  firstAdmin: z.object({ email: emailSchema, displayName: requiredText(100) }),
});
export type TenantCreationInput = z.infer<typeof TenantCreationInputSchema>;

import { z } from 'zod';

import { TENANT_MODULES } from '../enums';
import { baseEntityShape, enumSchema, INPUT_OMIT } from './common';

export const TenantModuleSchema = z.object({
  ...baseEntityShape,
  module: enumSchema(TENANT_MODULES),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
});
export type TenantModule = z.infer<typeof TenantModuleSchema>;

export const TenantModuleInputSchema = TenantModuleSchema.omit(INPUT_OMIT);
export type TenantModuleInput = z.infer<typeof TenantModuleInputSchema>;

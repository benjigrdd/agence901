import { z } from 'zod';

import { baseEntityShape, emailSchema, INPUT_OMIT, requiredText } from './common';

/** Service municipal auquel on assigne des signalements (voirie, espaces verts...). */
export const ServiceSchema = z.object({
  ...baseEntityShape,
  name: requiredText(80),
  email: emailSchema.nullable(),
});
export type Service = z.infer<typeof ServiceSchema>;

export const ServiceInputSchema = ServiceSchema.omit(INPUT_OMIT);
export type ServiceInput = z.infer<typeof ServiceInputSchema>;

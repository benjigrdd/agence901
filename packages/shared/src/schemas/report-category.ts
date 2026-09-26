import { z } from 'zod';

import { baseEntityShape, idSchema, INPUT_OMIT, requiredText } from './common';

export const DEFAULT_SLA_DAYS = 7;

export const ReportCategorySchema = z.object({
  ...baseEntityShape,
  label: requiredText(60),
  icon: z.string().regex(/^[a-z0-9-]+$/, { error: "Nom d'icône invalide" }),
  defaultServiceId: idSchema.nullable(),
  slaDays: z
    .number({ error: 'Délai invalide' })
    .int()
    .min(1, { error: '1 jour minimum' })
    .max(90, { error: '90 jours maximum' }),
});
export type ReportCategory = z.infer<typeof ReportCategorySchema>;

export const ReportCategoryInputSchema = ReportCategorySchema.omit(INPUT_OMIT);
export type ReportCategoryInput = z.infer<typeof ReportCategoryInputSchema>;

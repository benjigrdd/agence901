import { z } from 'zod';

import { REPORT_EVENT_VISIBILITIES, REPORT_PRIORITIES, REPORT_STATUSES } from '../enums';
import { REPORT_REFERENCE_PATTERN } from '../reference';
import {
  baseEntityShape,
  emailSchema,
  enumSchema,
  idSchema,
  isoDateTimeSchema,
  optionalText,
  requiredText,
} from './common';
import { GeoPointSchema } from './geo';

export const MAX_REPORT_PHOTOS = 3;

export const AiSuggestionSchema = z.object({
  categoryId: idSchema,
  confidence: z.number().min(0).max(1),
});

export const ReportSchema = z
  .object({
    ...baseEntityShape,
    reference: z.string().regex(REPORT_REFERENCE_PATTERN, { error: 'Référence invalide (AAAA-NNNNN)' }),
    categoryId: idSchema,
    description: requiredText(1000),
    point: GeoPointSchema,
    address: requiredText(300),
    status: enumSchema(REPORT_STATUSES),
    priority: enumSchema(REPORT_PRIORITIES),
    serviceId: idSchema.nullable(),
    duplicateOfId: idSchema.nullable(),
    reporterId: idSchema.nullable(),
    /** Present uniquement si l'habitant a demande a etre recontacte. */
    contactEmail: emailSchema.nullable(),
    /** URLs fournies par la couche de donnees (signees plus tard), jamais construites par l'interface. */
    photos: z.array(z.string().min(1)).max(MAX_REPORT_PHOTOS, { error: `${MAX_REPORT_PHOTOS} photos maximum` }),
    aiSuggestion: AiSuggestionSchema.nullable(),
    resolvedAt: isoDateTimeSchema.nullable(),
  })
  .superRefine((r, ctx) => {
    if (r.status === 'duplicate' && !r.duplicateOfId) {
      ctx.addIssue({ code: 'custom', path: ['duplicateOfId'], message: "Le signalement d'origine est obligatoire" });
    }
  });
export type Report = z.infer<typeof ReportSchema>;

/** Creation par un habitant depuis l'app. */
export const ReportInputSchema = z.object({
  categoryId: idSchema,
  description: requiredText(1000),
  point: GeoPointSchema,
  address: requiredText(300),
  contactEmail: emailSchema.nullable(),
  photos: z.array(z.string().min(1)).max(MAX_REPORT_PHOTOS, { error: `${MAX_REPORT_PHOTOS} photos maximum` }),
});
export type ReportInput = z.infer<typeof ReportInputSchema>;

/** Changement de statut par le personnel. */
export const ReportStatusChangeInputSchema = z.object({
  to: enumSchema(REPORT_STATUSES),
  message: optionalText(1000),
  visibility: enumSchema(REPORT_EVENT_VISIBILITIES),
  duplicateOfId: idSchema.nullable(),
});
export type ReportStatusChangeInput = z.infer<typeof ReportStatusChangeInputSchema>;

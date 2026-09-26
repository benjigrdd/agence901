import { z } from 'zod';

import { REPORT_EVENT_KINDS, REPORT_EVENT_VISIBILITIES, REPORT_STATUSES } from '../enums';
import { baseEntityShape, enumSchema, idSchema, optionalText } from './common';

/** Entree de la chronologie d'un signalement. */
export const ReportEventSchema = z.object({
  ...baseEntityShape,
  reportId: idSchema,
  kind: enumSchema(REPORT_EVENT_KINDS),
  fromStatus: enumSchema(REPORT_STATUSES).nullable(),
  toStatus: enumSchema(REPORT_STATUSES).nullable(),
  message: optionalText(1000),
  visibility: enumSchema(REPORT_EVENT_VISIBILITIES),
  authorId: idSchema.nullable(),
});
export type ReportEvent = z.infer<typeof ReportEventSchema>;

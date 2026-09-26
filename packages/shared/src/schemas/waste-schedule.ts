import { z } from 'zod';

import { WASTE_TYPES } from '../enums';
import { baseEntityShape, enumSchema, idSchema, INPUT_OMIT, isoDateSchema, optionalText } from './common';

/** Collecte annulee (`movedTo: null`) ou reportee a une autre date. */
export const WasteExceptionSchema = z.object({
  date: isoDateSchema,
  movedTo: isoDateSchema.nullable(),
});
export type WasteException = z.infer<typeof WasteExceptionSchema>;

export const WasteScheduleSchema = z.object({
  ...baseEntityShape,
  zoneId: idSchema,
  wasteType: enumSchema(WASTE_TYPES),
  /** RRULE avec DTSTART (dates a minuit UTC). */
  rrule: z.string().regex(/RRULE:/, { error: 'Récurrence invalide' }),
  exceptions: z.array(WasteExceptionSchema),
  note: optionalText(200),
});
export type WasteSchedule = z.infer<typeof WasteScheduleSchema>;

export const WasteScheduleInputSchema = WasteScheduleSchema.omit(INPUT_OMIT);
export type WasteScheduleInput = z.infer<typeof WasteScheduleInputSchema>;

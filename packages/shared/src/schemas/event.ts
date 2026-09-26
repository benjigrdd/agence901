import { z } from 'zod';

import { CONTENT_STATUSES, EVENT_CATEGORIES } from '../enums';
import {
  baseEntityShape,
  enumSchema,
  httpsUrlSchema,
  idSchema,
  INPUT_OMIT,
  isoDateTimeSchema,
  optionalText,
  requiredText,
} from './common';
import { GeoPointSchema } from './geo';
import { RichTextDocSchema } from './rich-text';

export const EventLocationSchema = z.object({
  label: requiredText(200),
  point: GeoPointSchema,
});
export type EventLocation = z.infer<typeof EventLocationSchema>;

export const EventPriceSchema = z
  .object({ free: z.boolean(), label: optionalText(100) })
  .superRefine((p, ctx) => {
    if (!p.free && !p.label) {
      ctx.addIssue({ code: 'custom', path: ['label'], message: 'Précisez le tarif' });
    }
  });
export type EventPrice = z.infer<typeof EventPriceSchema>;

const eventShape = {
  ...baseEntityShape,
  title: requiredText(120),
  description: RichTextDocSchema,
  category: enumSchema(EVENT_CATEGORIES),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  allDay: z.boolean(),
  /** RRULE (RFC 5545) avec DTSTART, ou `null` pour un evenement ponctuel. */
  rrule: z.string().min(1).nullable(),
  placeId: idSchema.nullable(),
  location: EventLocationSchema.nullable(),
  organizer: optionalText(120),
  price: EventPriceSchema.nullable(),
  registrationUrl: httpsUrlSchema.nullable(),
  coverMediaId: idSchema.nullable(),
  accessible: z.boolean(),
  status: enumSchema(CONTENT_STATUSES),
  /** Date de publication programmee (statut `scheduled`). */
  publishAt: isoDateTimeSchema.nullable(),
  authorId: idSchema,
  reviewerId: idSchema.nullable(),
};

function checkEvent(e: { startsAt: string; endsAt: string }, ctx: z.RefinementCtx) {
  if (Date.parse(e.endsAt) < Date.parse(e.startsAt)) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'La fin doit suivre le début' });
  }
}

export const EventSchema = z.object(eventShape).superRefine(checkEvent);
export type Event = z.infer<typeof EventSchema>;

export const EventInputSchema = z
  .object(eventShape)
  .omit({ ...INPUT_OMIT, status: true, authorId: true, reviewerId: true })
  .superRefine(checkEvent);
export type EventInput = z.infer<typeof EventInputSchema>;

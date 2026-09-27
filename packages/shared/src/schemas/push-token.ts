import { z } from 'zod';

import { PUSH_PLATFORMS } from '../enums';
import { baseEntityShape, enumSchema, idSchema, isoDateTimeSchema } from './common';

/** Jeton Expo Push d'un appareil (app mobile), rattache a l'habitant et a sa commune. */
export const PushTokenSchema = z.object({
  ...baseEntityShape,
  userId: idSchema,
  token: z.string().min(1).max(500),
  platform: enumSchema(PUSH_PLATFORMS),
  locale: z.enum(['fr', 'en']),
  lastSeenAt: isoDateTimeSchema,
  invalidAt: isoDateTimeSchema.nullable(),
});
export type PushToken = z.infer<typeof PushTokenSchema>;

export const PushTokenInputSchema = PushTokenSchema.pick({ token: true, platform: true, locale: true });
export type PushTokenInput = z.infer<typeof PushTokenInputSchema>;

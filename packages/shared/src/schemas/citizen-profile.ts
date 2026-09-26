import { z } from 'zod';

import { baseEntityShape, emailSchema, idSchema, isoDateTimeSchema } from './common';

export const NotificationPrefsSchema = z.object({
  alerts: z.boolean(),
  news: z.boolean(),
  events: z.boolean(),
  wasteReminder: z.boolean(),
  reportUpdates: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  alerts: true,
  news: true,
  events: false,
  wasteReminder: false,
  reportUpdates: true,
};

export const CitizenProfileSchema = z.object({
  ...baseEntityShape,
  userId: idSchema,
  locale: z.literal('fr'),
  districtIds: z.array(idSchema),
  topicIds: z.array(idSchema),
  notificationPrefs: NotificationPrefsSchema,
  wasteZoneId: idSchema.nullable(),
  contactEmail: emailSchema.nullable(),
  lastSeenAt: isoDateTimeSchema,
});
export type CitizenProfile = z.infer<typeof CitizenProfileSchema>;

export const CitizenPreferencesInputSchema = CitizenProfileSchema.pick({
  districtIds: true,
  topicIds: true,
  notificationPrefs: true,
  wasteZoneId: true,
  contactEmail: true,
});
export type CitizenPreferencesInput = z.infer<typeof CitizenPreferencesInputSchema>;

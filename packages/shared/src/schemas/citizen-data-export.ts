import { z } from 'zod';

import { PUSH_PLATFORMS, REPORT_STATUSES } from '../enums';
import { NotificationPrefsSchema } from './citizen-profile';
import { enumSchema, idSchema } from './common';
import { GeoPointSchema } from './geo';

/** Horodatage tel que Postgres le serialise (ISO 8601 avec fuseau). */
const timestamp = z.string().min(1);

/**
 * Export des donnees d'un habitant (droit d'acces et de portabilite, RGPD art. 15 et 20) :
 * app › Reglages › « Telecharger mes donnees ». Sans notes internes ni identite des agents.
 */
export const CitizenDataExportSchema = z.object({
  exportedAt: timestamp,
  profile: z
    .object({
      commune: z.string(),
      locale: z.string(),
      districtIds: z.array(idSchema),
      topicIds: z.array(idSchema),
      notificationPrefs: NotificationPrefsSchema,
      wasteZoneId: idSchema.nullable(),
      contactEmail: z.string().nullable(),
      consentAt: timestamp.nullable(),
      lastSeenAt: timestamp,
      createdAt: timestamp,
    })
    .nullable(),
  pushTokens: z.array(z.object({ platform: enumSchema(PUSH_PLATFORMS), locale: z.string(), createdAt: timestamp, lastSeenAt: timestamp })),
  reports: z.array(
    z.object({
      reference: z.string(),
      category: z.string(),
      description: z.string(),
      address: z.string(),
      position: GeoPointSchema,
      status: enumSchema(REPORT_STATUSES),
      contactEmail: z.string().nullable(),
      createdAt: timestamp,
      resolvedAt: timestamp.nullable(),
      photos: z.array(z.string()),
      publicHistory: z.array(z.object({ at: timestamp, status: enumSchema(REPORT_STATUSES).nullable(), message: z.string().nullable() })),
    }),
  ),
});
export type CitizenDataExport = z.infer<typeof CitizenDataExportSchema>;

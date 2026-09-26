import { z } from 'zod';

import { emailSchema, idSchema, isoDateTimeSchema, requiredText } from './common';

/** Profil d'un compte du personnel (commun a toutes les communes). */
export const ProfileSchema = z.object({
  id: idSchema,
  displayName: requiredText(100),
  email: emailSchema,
  avatarUrl: z.string().min(1).nullable(),
  lastSignInAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;

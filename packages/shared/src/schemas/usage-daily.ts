import { z } from 'zod';

import { idSchema, isoDateSchema } from './common';

const count = () => z.number().int().min(0);

export const UsageDailySchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  date: isoDateSchema,
  installs: count(),
  activeUsers: count(),
  reportsCreated: count(),
  postsPublished: count(),
});
export type UsageDaily = z.infer<typeof UsageDailySchema>;

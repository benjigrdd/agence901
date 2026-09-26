'use server';

import { ValidationError } from '@app/data';
import type { NotificationInput, NotificationTarget } from '@app/shared';
import { NotificationInputSchema, NotificationTargetSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export async function estimateAudienceAction(slug: string, target: NotificationTarget): Promise<number | null> {
  const parsed = NotificationTargetSchema.safeParse(target);
  if (!parsed.success) return null;
  const result = await runAction(async () => {
    const { ctx } = await requireTenant(slug);
    return getRepos().notifications.estimateAudience(ctx, parsed.data);
  });
  return result.ok ? result.data : null;
}

export async function sendNotificationAction(slug: string, input: NotificationInput): Promise<ActionResult<{ id: string; scheduled: boolean }>> {
  const parsed = NotificationInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const n = await getRepos().notifications.create(ctx, parsed.data);
    revalidatePath(`/${slug}/notifications`);
    return { id: n.id, scheduled: n.sentAt === null };
  });
}

'use server';

import type { ContentTransitionInput } from '@app/data';
import { ValidationError } from '@app/data';
import type { ContentStatus, EventInput } from '@app/shared';
import { EventInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

type SavedEvent = { id: string; status: ContentStatus; updatedAt: string };

export async function saveEventAction(slug: string, id: string | null, input: EventInput): Promise<ActionResult<SavedEvent>> {
  const parsed = EventInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repos = getRepos();
    const event = id ? await repos.events.update(ctx, id, parsed.data) : await repos.events.create(ctx, parsed.data);
    revalidatePath(`/${slug}/agenda`);
    return { id: event.id, status: event.status, updatedAt: event.updatedAt };
  });
}

export async function transitionEventAction(slug: string, id: string, request: ContentTransitionInput): Promise<ActionResult<SavedEvent>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const event = await getRepos().events.transition(ctx, id, request);
    revalidatePath(`/${slug}/agenda`);
    revalidatePath(`/${slug}/agenda/${id}`);
    return { id: event.id, status: event.status, updatedAt: event.updatedAt };
  });
}

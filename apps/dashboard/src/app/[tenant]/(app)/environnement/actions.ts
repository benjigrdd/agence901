'use server';

import { ValidationError } from '@app/data';
import type { SortingGuideItemInput, WasteScheduleInput, WasteZoneInput } from '@app/shared';
import { SortingGuideItemInputSchema, WasteScheduleInputSchema, WasteZoneInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

const refresh = (slug: string) => revalidatePath(`/${slug}/environnement`);

export async function saveZoneAction(slug: string, id: string | null, input: WasteZoneInput): Promise<ActionResult<{ id: string }>> {
  const parsed = WasteZoneInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const zones = getRepos().environment.zones;
    const zone = id ? await zones.update(ctx, id, parsed.data) : await zones.create(ctx, parsed.data);
    refresh(slug);
    return { id: zone.id };
  });
}

export async function removeZoneAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().environment.zones.remove(ctx, id);
    refresh(slug);
    return null;
  });
}

export async function saveScheduleAction(slug: string, id: string | null, input: WasteScheduleInput): Promise<ActionResult<{ id: string }>> {
  const parsed = WasteScheduleInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const schedules = getRepos().environment.schedules;
    const schedule = id ? await schedules.update(ctx, id, parsed.data) : await schedules.create(ctx, parsed.data);
    refresh(slug);
    return { id: schedule.id };
  });
}

export async function removeScheduleAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().environment.schedules.remove(ctx, id);
    refresh(slug);
    return null;
  });
}

export async function saveSortingItemAction(slug: string, id: string | null, input: SortingGuideItemInput): Promise<ActionResult<{ id: string }>> {
  const parsed = SortingGuideItemInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const guide = getRepos().environment.sortingGuide;
    const item = id ? await guide.update(ctx, id, parsed.data) : await guide.create(ctx, parsed.data);
    refresh(slug);
    return { id: item.id };
  });
}

export async function removeSortingItemAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().environment.sortingGuide.remove(ctx, id);
    refresh(slug);
    return null;
  });
}

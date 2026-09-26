'use server';

import { ValidationError } from '@app/data';
import type { PlaceCategoryInput, PlaceInput } from '@app/shared';
import { PlaceCategoryInputSchema, PlaceInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export async function savePlaceAction(slug: string, id: string | null, input: PlaceInput): Promise<ActionResult<{ id: string }>> {
  const parsed = PlaceInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repos = getRepos();
    const place = id ? await repos.places.update(ctx, id, parsed.data) : await repos.places.create(ctx, parsed.data);
    revalidatePath(`/${slug}/carte`);
    return { id: place.id };
  });
}

export async function removePlaceAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().places.remove(ctx, id);
    revalidatePath(`/${slug}/carte`);
    return null;
  });
}

export async function savePlaceCategoryAction(slug: string, id: string | null, input: PlaceCategoryInput): Promise<ActionResult<{ id: string }>> {
  const parsed = PlaceCategoryInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repos = getRepos();
    const category = id ? await repos.placeCategories.update(ctx, id, parsed.data) : await repos.placeCategories.create(ctx, parsed.data);
    revalidatePath(`/${slug}/carte`);
    revalidatePath(`/${slug}/carte/categories`);
    return { id: category.id };
  });
}

export async function removePlaceCategoryAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().placeCategories.remove(ctx, id);
    revalidatePath(`/${slug}/carte/categories`);
    return null;
  });
}

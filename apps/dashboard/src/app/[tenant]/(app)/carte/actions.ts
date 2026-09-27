'use server';

import type { ImportResult, OsmPreview } from '@app/data';
import { ValidationError } from '@app/data';
import type { PlaceCategoryInput, PlaceInput } from '@app/shared';
import { OSM_CATEGORY_KEYS, PlaceCategoryInputSchema, PlaceInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

const OsmCategoriesSchema = z
  .array(z.string().refine((key) => OSM_CATEGORY_KEYS.includes(key), 'Catégorie inconnue'))
  .min(1, 'Choisissez au moins une catégorie');

export type OsmPreviewResult = ActionResult<OsmPreview>;
export type OpenDataActionResult = ActionResult<ImportResult>;

export async function previewOsmAction(
  slug: string,
  categories: string[],
): Promise<OsmPreviewResult> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    return getRepos().openData.previewOsm(ctx, OsmCategoriesSchema.parse(categories));
  });
}

export async function importOsmAction(
  slug: string,
  categories: string[],
  previewId: string | null,
): Promise<OpenDataActionResult> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const result = await getRepos().openData.importOsm(ctx, {
      categories: OsmCategoriesSchema.parse(categories),
      previewId: z.uuid().nullable().parse(previewId),
    });
    revalidatePath(`/${slug}/carte`);
    return result;
  });
}

export async function importIrveAction(slug: string): Promise<OpenDataActionResult> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const result = await getRepos().openData.importIrve(ctx);
    revalidatePath(`/${slug}/carte`);
    return result;
  });
}

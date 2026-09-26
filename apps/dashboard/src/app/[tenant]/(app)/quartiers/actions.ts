'use server';

import { ValidationError } from '@app/data';
import type { DistrictInput } from '@app/shared';
import { DistrictInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import { overlappingDistricts } from '@/server/district-overlap';
import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export async function saveDistrictAction(slug: string, id: string | null, input: DistrictInput): Promise<ActionResult<{ id: string; overlaps: string[] }>> {
  const parsed = DistrictInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repos = getRepos();
    const district = id ? await repos.districts.update(ctx, id, parsed.data) : await repos.districts.create(ctx, parsed.data);
    const others = (await repos.districts.list(ctx)).filter((d) => d.id !== district.id);
    revalidatePath(`/${slug}/quartiers`);
    revalidatePath(`/${slug}/actualites`, 'layout');
    return { id: district.id, overlaps: overlappingDistricts(district.geom, others) };
  });
}

export async function removeDistrictAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().districts.remove(ctx, id);
    revalidatePath(`/${slug}/quartiers`);
    return null;
  });
}

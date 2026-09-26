'use server';

import { ValidationError } from '@app/data';
import type { ReportCategoryInput, ServiceInput, TopicInput } from '@app/shared';
import { ReportCategoryInputSchema, ServiceInputSchema, TopicInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export async function saveServiceAction(slug: string, id: string | null, input: ServiceInput): Promise<ActionResult<null>> {
  const parsed = ServiceInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repo = getRepos().services;
    if (id) await repo.update(ctx, id, parsed.data);
    else await repo.create(ctx, parsed.data);
    revalidatePath(`/${slug}/parametres/services`);
    return null;
  });
}

export async function removeServiceAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().services.remove(ctx, id);
    revalidatePath(`/${slug}/parametres/services`);
    return null;
  });
}

export async function saveReportCategoryAction(slug: string, id: string | null, input: ReportCategoryInput): Promise<ActionResult<null>> {
  const parsed = ReportCategoryInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repo = getRepos().reportCategories;
    if (id) await repo.update(ctx, id, parsed.data);
    else await repo.create(ctx, parsed.data);
    revalidatePath(`/${slug}/parametres/services`);
    return null;
  });
}

export async function saveTopicAction(slug: string, id: string | null, input: TopicInput): Promise<ActionResult<null>> {
  const parsed = TopicInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repo = getRepos().topics;
    if (id) await repo.update(ctx, id, parsed.data);
    else await repo.create(ctx, parsed.data);
    revalidatePath(`/${slug}/parametres/thematiques`);
    return null;
  });
}

export async function removeTopicAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().topics.remove(ctx, id);
    revalidatePath(`/${slug}/parametres/thematiques`);
    return null;
  });
}

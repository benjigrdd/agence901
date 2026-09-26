'use server';

import { ValidationError } from '@app/data';
import type { ContactInfo, ProcedureInput } from '@app/shared';
import { ContactInfoSchema, ProcedureInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export async function saveProcedureAction(slug: string, id: string | null, input: ProcedureInput): Promise<ActionResult<{ id: string }>> {
  const parsed = ProcedureInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repo = getRepos().procedures;
    const p = id ? await repo.update(ctx, id, parsed.data) : await repo.create(ctx, parsed.data);
    revalidatePath(`/${slug}/demarches`);
    return { id: p.id };
  });
}

export async function removeProcedureAction(slug: string, id: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().procedures.remove(ctx, id);
    revalidatePath(`/${slug}/demarches`);
    return null;
  });
}

export async function reorderProceduresAction(slug: string, orderedIds: string[]): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().procedures.reorder(ctx, orderedIds.map(String));
    revalidatePath(`/${slug}/demarches`);
    return null;
  });
}

export async function saveContactAction(slug: string, contact: ContactInfo): Promise<ActionResult<null>> {
  const parsed = ContactInfoSchema.safeParse(contact);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repo = getRepos().appConfig;
    const { homeLayout, links } = await repo.get(ctx);
    await repo.update(ctx, { homeLayout, links, contact: parsed.data });
    revalidatePath(`/${slug}/demarches`);
    return null;
  });
}

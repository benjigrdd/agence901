'use server';

import { ValidationError } from '@app/data';
import type { MemberInviteInput, MemberPermissionsInput } from '@app/shared';
import { MemberInviteInputSchema, MemberPermissionsInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenantAdmin } from '@/server/guards';
import { getRepos } from '@/server/repos';

export async function inviteMemberAction(slug: string, input: MemberInviteInput): Promise<ActionResult<{ id: string }>> {
  const parsed = MemberInviteInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenantAdmin(slug);
    const member = await getRepos().members.invite(ctx, parsed.data);
    revalidatePath(`/${slug}/parametres/membres`);
    return { id: member.membership.id };
  });
}

export async function updateMemberAction(slug: string, membershipId: string, input: MemberPermissionsInput): Promise<ActionResult<null>> {
  const parsed = MemberPermissionsInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenantAdmin(slug);
    await getRepos().members.updatePermissions(ctx, membershipId, parsed.data);
    revalidatePath(`/${slug}/parametres/membres`);
    return null;
  });
}

export async function setMemberEnabledAction(slug: string, membershipId: string, enabled: boolean): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenantAdmin(slug);
    const members = getRepos().members;
    if (enabled) await members.enable(ctx, membershipId);
    else await members.disable(ctx, membershipId);
    revalidatePath(`/${slug}/parametres/membres`);
    return null;
  });
}

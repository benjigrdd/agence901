'use server';

import type { ReportPriority, ReportStatusChangeInput } from '@app/shared';
import { REPORT_PRIORITIES } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

const refresh = (slug: string, id: string) => {
  revalidatePath(`/${slug}/signalements`);
  revalidatePath(`/${slug}/signalements/${id}`);
};

export async function changeReportStatusAction(slug: string, id: string, input: ReportStatusChangeInput): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().reports.updateStatus(ctx, id, input);
    refresh(slug, id);
    return null;
  });
}

export async function assignReportAction(slug: string, id: string, serviceId: string | null): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().reports.assign(ctx, id, serviceId || null);
    refresh(slug, id);
    return null;
  });
}

export async function setReportPriorityAction(slug: string, id: string, priority: ReportPriority): Promise<ActionResult<null>> {
  return runAction(async () => {
    if (!(REPORT_PRIORITIES as readonly string[]).includes(priority)) throw new Error('Priorité invalide');
    const { ctx } = await requireTenant(slug);
    await getRepos().reports.setPriority(ctx, id, priority);
    refresh(slug, id);
    return null;
  });
}

export async function addReportNoteAction(slug: string, id: string, message: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().reports.addNote(ctx, id, String(message));
    refresh(slug, id);
    return null;
  });
}

export async function markDuplicateAction(slug: string, id: string, originalId: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().reports.markDuplicate(ctx, id, originalId);
    refresh(slug, id);
    return null;
  });
}

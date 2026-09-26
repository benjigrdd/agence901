'use server';

import type { ContentTransitionInput } from '@app/data';
import { ValidationError } from '@app/data';
import type { ContentStatus, PostInput } from '@app/shared';
import { PostInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

type SavedPost = { id: string; status: ContentStatus; updatedAt: string; publishAt: string | null };

export async function savePostAction(slug: string, id: string | null, input: PostInput): Promise<ActionResult<SavedPost>> {
  const parsed = PostInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repos = getRepos();
    const post = id ? await repos.posts.update(ctx, id, parsed.data) : await repos.posts.create(ctx, parsed.data);
    revalidatePath(`/${slug}/actualites`);
    return { id: post.id, status: post.status, updatedAt: post.updatedAt, publishAt: post.publishAt };
  });
}

export async function transitionPostAction(slug: string, id: string, request: ContentTransitionInput): Promise<ActionResult<SavedPost>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const post = await getRepos().posts.transition(ctx, id, request);
    revalidatePath(`/${slug}/actualites`);
    revalidatePath(`/${slug}/actualites/${id}`);
    return { id: post.id, status: post.status, updatedAt: post.updatedAt, publishAt: post.publishAt };
  });
}

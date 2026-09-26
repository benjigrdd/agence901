'use server';

import type { MediaFile, MediaListItem } from '@app/data';
import { ValidationError } from '@app/data';
import type { MediaMetaInput } from '@app/shared';
import { MediaMetaInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requireTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

export type MediaView = {
  id: string;
  url: string;
  altText: string;
  decorative: boolean;
  credit: string | null;
  mime: string;
  width: number;
  height: number;
  usageCount: number;
  createdAt: string;
};

const toView = ({ media, usageCount }: MediaListItem): MediaView => ({
  id: media.id,
  url: media.url,
  altText: media.altText,
  decorative: media.decorative,
  credit: media.credit,
  mime: media.mime,
  width: media.width,
  height: media.height,
  usageCount,
  createdAt: media.createdAt,
});

function parseMeta(meta: MediaMetaInput) {
  const parsed = MediaMetaInputSchema.safeParse(meta);
  return parsed.success ? { ok: true as const, data: parsed.data } : { ok: false as const, error: toActionError(ValidationError.fromZod(parsed.error)) };
}

export async function listMediaAction(slug: string): Promise<ActionResult<MediaView[]>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const { items } = await getRepos().media.list(ctx, { pageSize: 500 });
    return items.map(toView);
  });
}

export async function uploadMediaAction(slug: string, file: MediaFile, meta: MediaMetaInput): Promise<ActionResult<MediaView>> {
  const parsed = parseMeta(meta);
  if (!parsed.ok) return parsed.error;
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repos = getRepos();
    const media = await repos.media.upload(ctx, file, parsed.data);
    revalidatePath(`/${slug}/mediatheque`);
    return toView(await repos.media.get(ctx, media.id));
  });
}

export async function updateMediaAction(slug: string, id: string, meta: MediaMetaInput): Promise<ActionResult<MediaView>> {
  const parsed = parseMeta(meta);
  if (!parsed.ok) return parsed.error;
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    const repos = getRepos();
    await repos.media.update(ctx, id, parsed.data);
    revalidatePath(`/${slug}/mediatheque`);
    return toView(await repos.media.get(ctx, id));
  });
}

export async function deleteMediaAction(slug: string, id: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const { ctx } = await requireTenant(slug);
    await getRepos().media.remove(ctx, id);
    revalidatePath(`/${slug}/mediatheque`);
    return undefined;
  });
}

import type { Media } from '@app/shared';
import { MediaMetaInputSchema } from '@app/shared';

import type { DataContext } from '../../context';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import { applyList, byNumber, byString, parseInput } from '../../list';
import type { MediaListItem, MediaRepository } from '../../ports';
import type { ClientResolver, Db } from '../core';
import { check, requirePermission, toDataError, unwrap } from '../core';
import * as m from '../mappers';

export const PUBLIC_MEDIA_BUCKET = 'public-media';

/** Data URL (base64) → octets, pour le televersement vers Storage. */
function decodeDataUrl(dataUrl: string, mime: string): Uint8Array {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match || match[1] !== mime) throw new ValidationError('Fichier image invalide', [{ path: 'file', message: 'Fichier image invalide' }]);
  const payload = match[3] ?? '';
  return match[2] ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(payload));
}

export function createMediaRepository(resolve: ClientResolver): MediaRepository {
  const publicUrl = (db: Db, path: string) => db.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

  const usageCounts = async (db: Db, ctx: DataContext): Promise<Map<string, number>> => {
    const [posts, events, places] = await Promise.all([
      db.from('posts').select('cover_media_id').eq('tenant_id', ctx.tenantId).not('cover_media_id', 'is', null),
      db.from('events').select('cover_media_id').eq('tenant_id', ctx.tenantId).not('cover_media_id', 'is', null),
      db.from('places').select('photo_media_id').eq('tenant_id', ctx.tenantId).not('photo_media_id', 'is', null),
    ]);
    const counts = new Map<string, number>();
    const add = (id: string | null) => {
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    };
    for (const r of unwrap(posts)) add(r.cover_media_id);
    for (const r of unwrap(events)) add(r.cover_media_id);
    for (const r of unwrap(places)) add(r.photo_media_id);
    return counts;
  };

  const fetchMedia = async (ctx: DataContext, id: string): Promise<Media> => {
    const db = (await resolve(ctx));
    const row = (await db.from('media').select('*').eq('tenant_id', ctx.tenantId).eq('id', id).maybeSingle()).data;
    if (!row) throw new NotFoundError('Image introuvable');
    return m.toMedia(row, publicUrl(db, row.path));
  };

  return {
    async list(ctx, params) {
      requirePermission(ctx, 'media', 'read');
      const db = (await resolve(ctx));
      const mimes = params?.filters?.mime;
      const [rows, counts] = await Promise.all([db.from('media').select('*').eq('tenant_id', ctx.tenantId), usageCounts(db, ctx)]);
      const items: MediaListItem[] = unwrap(rows)
        .filter((r) => !mimes?.length || mimes.includes(r.mime))
        .map((r) => ({ media: m.toMedia(r, publicUrl(db, r.path)), usageCount: counts.get(r.id) ?? 0 }));
      return applyList(items, params, {
        searchText: (i) => `${i.media.altText} ${i.media.credit ?? ''} ${i.media.path}`,
        sorters: { createdAt: byString((i: MediaListItem) => i.media.createdAt), usage: byNumber((i: MediaListItem) => i.usageCount) },
        defaultSort: { field: 'createdAt', direction: 'desc' },
      });
    },

    async get(ctx, id) {
      requirePermission(ctx, 'media', 'read');
      const media = await fetchMedia(ctx, id);
      return { media, usageCount: (await usageCounts((await resolve(ctx)), ctx)).get(id) ?? 0 };
    },

    async upload(ctx, file, meta) {
      requirePermission(ctx, 'media', 'edit');
      const data = parseInput(MediaMetaInputSchema, meta);
      const bytes = decodeDataUrl(file.dataUrl, file.mime);
      const db = (await resolve(ctx));
      const extension = file.mime.split('/')[1]?.replace('+xml', '') ?? 'bin';
      const path = `${ctx.tenantId}/${crypto.randomUUID()}.${extension}`;
      const uploaded = await db.storage.from(PUBLIC_MEDIA_BUCKET).upload(path, bytes, { contentType: file.mime, upsert: false });
      if (uploaded.error) throw toDataError({ message: uploaded.error.message, code: '42501' });
      const inserted = await db
        .from('media')
        .insert({ tenant_id: ctx.tenantId, path, mime: file.mime, width: file.width, height: file.height, alt_text: data.altText, decorative: data.decorative, credit: data.credit })
        .select('*')
        .single();
      if (inserted.error) {
        await db.storage.from(PUBLIC_MEDIA_BUCKET).remove([path]);
        throw toDataError(inserted.error);
      }
      return m.toMedia(inserted.data, publicUrl(db, path));
    },

    async update(ctx, id, meta) {
      requirePermission(ctx, 'media', 'edit');
      await fetchMedia(ctx, id);
      const data = parseInput(MediaMetaInputSchema, meta);
      check(await (await resolve(ctx)).from('media').update({ alt_text: data.altText, decorative: data.decorative, credit: data.credit }).eq('tenant_id', ctx.tenantId).eq('id', id));
      return fetchMedia(ctx, id);
    },

    async remove(ctx, id) {
      requirePermission(ctx, 'media', 'edit');
      const media = await fetchMedia(ctx, id);
      const db = (await resolve(ctx));
      const used = (await usageCounts(db, ctx)).get(id) ?? 0;
      if (used > 0) throw new ConflictError(`Image utilisée par ${used} contenu${used > 1 ? 's' : ''} : suppression impossible`);
      check(await db.from('media').delete().eq('tenant_id', ctx.tenantId).eq('id', id));
      await db.storage.from(PUBLIC_MEDIA_BUCKET).remove([media.path]);
    },
  };
}
